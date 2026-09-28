"""
Backend test suite for VoxMentor.
Uses SQLite in-memory database — no PostgreSQL required.
"""
import os

# Must be set BEFORE importing the app so pydantic-settings picks it up
os.environ["DATABASE_URL"] = "sqlite:///./test_voxmentor.db"
os.environ["JWT_SECRET"] = "test-secret-key-for-tests"
os.environ["JWT_ALGORITHM"] = "HS256"
os.environ["AGORA_APP_ID"] = "test-app-id"
os.environ["AGORA_APP_CERTIFICATE"] = "test-certificate"
os.environ["AGORA_CONVERSATION_API_BASE_URL"] = "https://api.agora.io"
os.environ["AGORA_CONVERSATION_API_CREDENTIAL"] = "test-cred"
os.environ["AGORA_PIPELINE_ID"] = "test-pipeline"
os.environ["AI_API_KEY"] = ""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import patch, MagicMock

from app.main import app
from app.db.database import Base, get_db

# ─── SQLite test database ─────────────────────────────────────────────────────
TEST_DB_URL = "sqlite:///./test_voxmentor.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


client = TestClient(app, raise_server_exceptions=True)

# ─── Helpers ──────────────────────────────────────────────────────────────────
REGISTER_PAYLOAD = {
    "email": "test@example.com",
    "password": "securepassword123",
    "name": "Test User",
}


def _register_and_login(email="test@example.com", password="securepassword123", name="Test User") -> str:
    client.post("/api/v1/auth/register", json={"email": email, "password": password, "name": name})
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ─── Health ───────────────────────────────────────────────────────────────────

def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


# ─── Registration ─────────────────────────────────────────────────────────────

def test_register():
    response = client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_register_duplicate_email():
    client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    response = client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    assert response.status_code == 400


def test_register_invalid_email():
    response = client.post("/api/v1/auth/register", json={
        "email": "not-an-email",
        "password": "password123",
        "name": "User",
    })
    assert response.status_code == 422


def test_register_short_password():
    response = client.post("/api/v1/auth/register", json={
        "email": "short@example.com",
        "password": "abc",
        "name": "User",
    })
    assert response.status_code == 422


# ─── Login ────────────────────────────────────────────────────────────────────

def test_login():
    client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    response = client.post("/api/v1/auth/login", json={
        "email": REGISTER_PAYLOAD["email"],
        "password": REGISTER_PAYLOAD["password"],
    })
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_invalid_login_wrong_password():
    client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    response = client.post("/api/v1/auth/login", json={
        "email": REGISTER_PAYLOAD["email"],
        "password": "wrongpassword",
    })
    assert response.status_code == 401


def test_invalid_login_unknown_email():
    response = client.post("/api/v1/auth/login", json={
        "email": "nobody@example.com",
        "password": "somepassword",
    })
    assert response.status_code == 401


# ─── Protected Endpoints ──────────────────────────────────────────────────────

def test_get_me():
    token = _register_and_login()
    response = client.get("/api/v1/auth/me", headers=_auth_headers(token))
    assert response.status_code == 200
    assert response.json()["email"] == REGISTER_PAYLOAD["email"]
    assert response.json()["name"] == REGISTER_PAYLOAD["name"]


def test_protected_endpoint_without_token():
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 403  # HTTPBearer returns 403 when no token


def test_protected_endpoint_with_invalid_token():
    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalidtoken"})
    assert response.status_code == 401


# ─── Session Creation ─────────────────────────────────────────────────────────

SESSION_PAYLOAD = {
    "mode": "technical_interview",
    "topic": "Python",
    "difficulty": "intermediate",
    "duration": 600,
}


def test_create_session():
    token = _register_and_login()
    response = client.post("/api/v1/sessions", json=SESSION_PAYLOAD, headers=_auth_headers(token))
    assert response.status_code == 201
    data = response.json()
    assert data["mode"] == "technical_interview"
    assert data["status"] == "created"
    assert data["topic"] == "Python"


def test_create_session_invalid_mode():
    token = _register_and_login()
    response = client.post("/api/v1/sessions", json={**SESSION_PAYLOAD, "mode": "fake_mode"},
                           headers=_auth_headers(token))
    assert response.status_code == 422


def test_list_sessions():
    token = _register_and_login()
    headers = _auth_headers(token)
    client.post("/api/v1/sessions", json=SESSION_PAYLOAD, headers=headers)
    client.post("/api/v1/sessions", json=SESSION_PAYLOAD, headers=headers)
    response = client.get("/api/v1/sessions", headers=headers)
    assert response.status_code == 200
    assert response.json()["total"] == 2


def test_get_session():
    token = _register_and_login()
    headers = _auth_headers(token)
    session = client.post("/api/v1/sessions", json=SESSION_PAYLOAD, headers=headers).json()
    response = client.get(f"/api/v1/sessions/{session['id']}", headers=headers)
    assert response.status_code == 200
    assert response.json()["id"] == session["id"]


# ─── Session Ownership ────────────────────────────────────────────────────────

def test_session_ownership():
    token1 = _register_and_login("user1@example.com", "password12345", "User One")
    session = client.post("/api/v1/sessions", json=SESSION_PAYLOAD,
                          headers=_auth_headers(token1)).json()
    session_id = session["id"]

    token2 = _register_and_login("user2@example.com", "password12345", "User Two")
    response = client.get(f"/api/v1/sessions/{session_id}", headers=_auth_headers(token2))
    assert response.status_code == 403


# ─── Session Lifecycle ────────────────────────────────────────────────────────

def test_start_and_end_session():
    token = _register_and_login()
    headers = _auth_headers(token)
    session = client.post("/api/v1/sessions", json=SESSION_PAYLOAD, headers=headers).json()
    session_id = session["id"]

    # Start
    with patch("app.services.agora.agora_service.httpx.Client") as mock_client_cls:
        mock_client = mock_client_cls.return_value.__enter__.return_value
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "success"}
        mock_client.post.return_value = mock_response

        start_res = client.post(f"/api/v1/sessions/{session_id}/start", headers=headers)
        assert start_res.status_code == 200
        assert start_res.json()["session"]["status"] == "active"
        assert "connection" in start_res.json()
        assert "token" in start_res.json()["connection"]
        
        # Verify exact Agora /join outbound JSON structure
        mock_client.post.assert_called_once()
        _args, kwargs = mock_client.post.call_args
        payload = kwargs["json"]

        # Top-level keys
        assert "name" in payload, "payload must have 'name'"
        assert "pipeline_id" in payload, "payload must have 'pipeline_id'"
        assert "properties" in payload, "payload must have 'properties'"
        assert payload["pipeline_id"] == "test-pipeline"
        assert payload["name"] == f"voxmentor_{session_id}"

        props = payload["properties"]

        # agent_rtc_uid — inside properties, non-empty string, valid integer range
        assert "agent_rtc_uid" in props, "properties must have 'agent_rtc_uid'"
        agent_uid_str = props["agent_rtc_uid"]
        assert isinstance(agent_uid_str, str) and len(agent_uid_str) > 0
        agent_uid_int = int(agent_uid_str)
        assert 1 <= agent_uid_int <= 99999, "agent_rtc_uid must be in 1..99999"

        # token — inside properties, non-empty string
        assert "token" in props, "properties must have 'token'"
        assert isinstance(props["token"], str) and len(props["token"]) > 0

        # channel — inside properties
        assert "channel" in props, "properties must have 'channel'"
        assert props["channel"] == f"voxmentor_{session_id}"

        # remote_rtc_uids — inside properties, list of strings, must contain the user uid
        assert "remote_rtc_uids" in props, "properties must have 'remote_rtc_uids'"
        remote_uids = props["remote_rtc_uids"]
        assert isinstance(remote_uids, list) and len(remote_uids) > 0, "remote_rtc_uids must be a non-empty list"
        assert all(isinstance(u, str) for u in remote_uids), "remote_rtc_uids entries must be strings"

        # The user uid returned in the connection response must match remote_rtc_uids
        connection_uid = str(start_res.json()["connection"]["uid"])
        assert connection_uid in remote_uids, (
            f"connection uid {connection_uid} must appear in remote_rtc_uids {remote_uids}"
        )

        # Agent UID and user UID must be distinct (no collision)
        assert agent_uid_str not in remote_uids, "agent_rtc_uid must differ from user uid in remote_rtc_uids"

    # End
    end_res = client.post(f"/api/v1/sessions/{session_id}/end", headers=headers)
    assert end_res.status_code == 200
    assert end_res.json()["status"] == "completed"
    assert end_res.json()["ended_at"] is not None


def test_invalid_transition_end_without_start():
    token = _register_and_login()
    headers = _auth_headers(token)
    session = client.post("/api/v1/sessions", json=SESSION_PAYLOAD, headers=headers).json()
    # Try to end without starting first
    response = client.post(f"/api/v1/sessions/{session['id']}/end", headers=headers)
    assert response.status_code == 400


# ─── Evaluation Schema ────────────────────────────────────────────────────────

def test_evaluation_schema_validation():
    from app.schemas.schemas import EvaluationCreate
    data = {
        "overall_score": 82,
        "technical_score": 86,
        "communication_score": 79,
        "relevance_score": 88,
        "confidence_score": 75,
        "summary": "Strong fundamentals with room for improvement.",
        "strengths": ["Good technical fundamentals", "Relevant examples"],
        "weaknesses": ["Answers could be more concise"],
        "recommendations": ["Practice system design", "Focus on brevity"],
    }
    ev = EvaluationCreate(**data)
    assert ev.overall_score == 82
    assert len(ev.strengths) == 2


def test_evaluation_schema_score_bounds():
    from app.schemas.schemas import EvaluationCreate
    import pytest as pt
    with pt.raises(Exception):
        EvaluationCreate(
            overall_score=150,  # out of bounds
            summary="x", strengths=[], weaknesses=[], recommendations=[]
        )


# ─── Dashboard ────────────────────────────────────────────────────────────────

def test_dashboard_summary_empty():
    token = _register_and_login()
    response = client.get("/api/v1/dashboard/summary", headers=_auth_headers(token))
    assert response.status_code == 200
    data = response.json()
    assert data["total_sessions"] == 0
    assert data["completed_sessions"] == 0
    assert data["average_score"] is None
    assert data["recent_sessions"] == []


def test_dashboard_summary_with_sessions():
    token = _register_and_login()
    headers = _auth_headers(token)
    session = client.post("/api/v1/sessions", json=SESSION_PAYLOAD, headers=headers).json()
    
    with patch("app.services.agora.agora_service.httpx.Client") as mock_client_cls:
        mock_client = mock_client_cls.return_value.__enter__.return_value
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "success"}
        mock_client.post.return_value = mock_response
        client.post(f"/api/v1/sessions/{session['id']}/start", headers=headers)
        
    client.post(f"/api/v1/sessions/{session['id']}/end", headers=headers)

    response = client.get("/api/v1/dashboard/summary", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_sessions"] == 1
    assert data["completed_sessions"] == 1
