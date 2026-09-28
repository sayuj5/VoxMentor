import os
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from app.main import app
from app.db.database import Base
from app.models.models import User
from app.core.config import settings
from tests.test_api import test_engine, TestingSession, override_get_db

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)

client = TestClient(app, raise_server_exceptions=False)

def test_google_auth_endpoint_returns_redirect():
    response = client.get("/api/v1/auth/google", allow_redirects=False)
    assert response.status_code == 307
    location = response.headers["location"]
    assert "accounts.google.com/o/oauth2/v2/auth" in location
    assert "response_type=code" in location
    assert f"client_id={settings.GOOGLE_CLIENT_ID}" in location
    assert "state=" in location

    # Check that oauth_state cookie is set
    assert "oauth_state" in response.cookies

def test_google_auth_callback_missing_state():
    response = client.get("/api/v1/auth/google/callback?code=abc", allow_redirects=False)
    assert response.status_code == 307
    assert "error=invalid_state" in response.headers["location"]

def test_google_auth_callback_state_mismatch():
    client.cookies.set("oauth_state", "some-state")
    response = client.get("/api/v1/auth/google/callback?code=abc&state=wrong-state", allow_redirects=False)
    assert response.status_code == 307
    assert "error=invalid_state" in response.headers["location"]

def test_google_auth_callback_missing_code():
    client.cookies.set("oauth_state", "correct-state")
    response = client.get("/api/v1/auth/google/callback?state=correct-state", allow_redirects=False)
    assert response.status_code == 307
    assert "error=missing_code" in response.headers["location"]

@patch("app.api.routes.auth.httpx.Client")
def test_google_auth_callback_success(mock_client_cls):
    mock_client = mock_client_cls.return_value.__enter__.return_value
    
    # Mock token response
    mock_token_response = MagicMock()
    mock_token_response.status_code = 200
    mock_token_response.json.return_value = {"access_token": "mock-access-token"}
    mock_client.post.return_value = mock_token_response
    
    # Mock userinfo response
    mock_user_response = MagicMock()
    mock_user_response.status_code = 200
    mock_user_response.json.return_value = {
        "sub": "google-12345",
        "email": "new.user@gmail.com",
        "name": "New Google User"
    }
    mock_client.get.return_value = mock_user_response
    
    client.cookies.set("oauth_state", "valid-state")
    response = client.get("/api/v1/auth/google/callback?state=valid-state&code=auth-code", allow_redirects=False)
    
    # Should redirect to frontend with token
    assert response.status_code == 307
    location = response.headers["location"]
    assert "token=" in location
    
    # Verify user in database
    db = TestingSession()
    user = db.query(User).filter(User.email == "new.user@gmail.com").first()
    assert user is not None
    assert user.google_id == "google-12345"
    assert user.password_hash is None
    db.close()

@patch("app.api.routes.auth.httpx.Client")
def test_google_auth_callback_link_existing_account(mock_client_cls):
    # First create an existing password user
    client.post("/api/v1/auth/register", json={
        "email": "existing@gmail.com",
        "password": "securepassword123",
        "name": "Existing User"
    })
    
    mock_client = mock_client_cls.return_value.__enter__.return_value
    
    mock_token_response = MagicMock()
    mock_token_response.status_code = 200
    mock_token_response.json.return_value = {"access_token": "mock-access-token"}
    mock_client.post.return_value = mock_token_response
    
    mock_user_response = MagicMock()
    mock_user_response.status_code = 200
    mock_user_response.json.return_value = {
        "sub": "google-existing-999",
        "email": "existing@gmail.com",
        "name": "Existing User from Google"
    }
    mock_client.get.return_value = mock_user_response
    
    client.cookies.set("oauth_state", "valid-state-2")
    response = client.get("/api/v1/auth/google/callback?state=valid-state-2&code=auth-code-2", allow_redirects=False)
    
    assert response.status_code == 307
    assert "token=" in response.headers["location"]
    
    # Verify user was linked, not duplicated
    db = TestingSession()
    users = db.query(User).filter(User.email == "existing@gmail.com").all()
    assert len(users) == 1
    assert users[0].google_id == "google-existing-999"
    assert users[0].password_hash is not None # Password still works
    db.close()
