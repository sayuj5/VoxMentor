import pytest
import json
from unittest.mock import patch, MagicMock

from openai import AuthenticationError, RateLimitError, APITimeoutError, APIConnectionError
import httpx
from pydantic import ValidationError

from app.services.evaluation.evaluation_service import evaluate_session
from app.models.models import Session, ConversationMessage, SessionMode, SessionDifficulty
from app.core.config import settings
from app.schemas.schemas import EvaluationCreate

@pytest.fixture
def dummy_session():
    return Session(
        id="dummy-session-id",
        mode=SessionMode.TECHNICAL_INTERVIEW,
        difficulty=SessionDifficulty.INTERMEDIATE,
        topic="Python Web Development",
    )

@pytest.fixture
def dummy_messages():
    return [
        ConversationMessage(role="assistant", content="Welcome! Let's start."),
        ConversationMessage(role="user", content="Hello, I'm ready."),
    ]

@pytest.fixture
def valid_eval_json():
    return json.dumps({
        "overall_score": 85,
        "technical_score": 80,
        "communication_score": 90,
        "relevance_score": 85,
        "confidence_score": 85,
        "summary": "Great session.",
        "strengths": ["Good communication"],
        "weaknesses": ["Needs more technical depth"],
        "recommendations": ["Study more system design"]
    })

def test_evaluate_session_success(dummy_session, dummy_messages, valid_eval_json):
    settings.AI_API_KEY = "test-key"
    with patch("app.services.evaluation.evaluation_service.OpenAI") as MockOpenAI:
        mock_client = MagicMock()
        MockOpenAI.return_value = mock_client
        mock_response = MagicMock()
        mock_response.choices[0].message.content = valid_eval_json
        mock_client.chat.completions.create.return_value = mock_response

        evaluation = evaluate_session(dummy_session, dummy_messages)

        assert evaluation is not None
        assert isinstance(evaluation, EvaluationCreate)
        assert evaluation.overall_score == 85
        assert evaluation.summary == "Great session."
        MockOpenAI.assert_called_once()
        mock_client.chat.completions.create.assert_called_once()

def test_evaluate_session_missing_api_key(dummy_session, dummy_messages):
    original_key = settings.AI_API_KEY
    try:
        settings.AI_API_KEY = ""
        evaluation = evaluate_session(dummy_session, dummy_messages)
        assert evaluation is None
    finally:
        settings.AI_API_KEY = original_key

def test_evaluate_session_auth_error(dummy_session, dummy_messages):
    settings.AI_API_KEY = "test-key"
    with patch("app.services.evaluation.evaluation_service.OpenAI") as MockOpenAI:
        mock_client = MagicMock()
        MockOpenAI.return_value = mock_client
        mock_client.chat.completions.create.side_effect = AuthenticationError(
            "Invalid API key",
            response=httpx.Response(status_code=401, request=httpx.Request("GET", "http://test")),
            body=None
        )

        evaluation = evaluate_session(dummy_session, dummy_messages)
        assert evaluation is None
        # Should only try once for auth errors
        assert mock_client.chat.completions.create.call_count == 1

def test_evaluate_session_rate_limit(dummy_session, dummy_messages):
    settings.AI_API_KEY = "test-key"
    with patch("app.services.evaluation.evaluation_service.OpenAI") as MockOpenAI:
        mock_client = MagicMock()
        MockOpenAI.return_value = mock_client
        mock_client.chat.completions.create.side_effect = RateLimitError(
            "Rate limit exceeded",
            response=httpx.Response(status_code=429, request=httpx.Request("GET", "http://test")),
            body=None
        )

        evaluation = evaluate_session(dummy_session, dummy_messages)
        assert evaluation is None
        # Should retry for rate limit errors
        assert mock_client.chat.completions.create.call_count == 3

def test_evaluate_session_malformed_json(dummy_session, dummy_messages):
    settings.AI_API_KEY = "test-key"
    with patch("app.services.evaluation.evaluation_service.OpenAI") as MockOpenAI:
        mock_client = MagicMock()
        MockOpenAI.return_value = mock_client
        mock_response = MagicMock()
        mock_response.choices[0].message.content = "This is not JSON"
        mock_client.chat.completions.create.return_value = mock_response

        evaluation = evaluate_session(dummy_session, dummy_messages)
        assert evaluation is None
        # Should retry JSON parse errors
        assert mock_client.chat.completions.create.call_count == 3

def test_evaluate_session_schema_validation_failure(dummy_session, dummy_messages):
    settings.AI_API_KEY = "test-key"
    with patch("app.services.evaluation.evaluation_service.OpenAI") as MockOpenAI:
        mock_client = MagicMock()
        MockOpenAI.return_value = mock_client
        mock_response = MagicMock()
        # Missing required field `overall_score`
        mock_response.choices[0].message.content = json.dumps({
            "technical_score": 80,
            "summary": "Great session."
        })
        mock_client.chat.completions.create.return_value = mock_response

        evaluation = evaluate_session(dummy_session, dummy_messages)
        assert evaluation is None
        # Should retry Pydantic validation errors
        assert mock_client.chat.completions.create.call_count == 3
