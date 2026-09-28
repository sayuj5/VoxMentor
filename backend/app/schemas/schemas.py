from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict
import uuid


# ─── Auth Schemas ────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: str = Field(..., min_length=1, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    name: str
    created_at: datetime


# ─── Session Schemas ──────────────────────────────────────────────────────────

class SessionCreateRequest(BaseModel):
    mode: str
    topic: str = "General"
    difficulty: str = "intermediate"
    duration: Optional[int] = 600  # seconds, default 10 min

    @field_validator("mode")
    @classmethod
    def validate_mode(cls, v: str) -> str:
        valid = {"technical_interview", "hr_interview", "learning_mentor", "communication_coach"}
        if v not in valid:
            raise ValueError(f"mode must be one of {valid}")
        return v

    @field_validator("difficulty")
    @classmethod
    def validate_difficulty(cls, v: str) -> str:
        valid = {"beginner", "intermediate", "advanced"}
        if v not in valid:
            raise ValueError(f"difficulty must be one of {valid}")
        return v


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    mode: str
    topic: str
    difficulty: str
    status: str
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    duration: Optional[int]
    created_at: datetime
    agora_agent_id: Optional[str] = None
    agora_channel_name: Optional[str] = None


class SessionListResponse(BaseModel):
    sessions: List[SessionResponse]
    total: int
    page: int
    page_size: int


class SessionStartResponse(BaseModel):
    session: SessionResponse
    connection: Optional['AgoraTokenResponse'] = None
    recovering: bool = False
    message: Optional[str] = None


# ─── Evaluation Schemas ───────────────────────────────────────────────────────

class EvaluationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    status: str
    overall_score: Optional[int] = Field(None, ge=0, le=100)
    technical_score: Optional[int] = Field(None, ge=0, le=100)
    communication_score: Optional[int] = Field(None, ge=0, le=100)
    relevance_score: Optional[int] = Field(None, ge=0, le=100)
    confidence_score: Optional[int] = Field(None, ge=0, le=100)
    summary: str
    strengths: List[str]
    weaknesses: List[str]
    recommendations: List[str]
    created_at: datetime


class EvaluationCreate(BaseModel):
    status: str = "completed"
    overall_score: Optional[int] = Field(None, ge=0, le=100)
    technical_score: Optional[int] = Field(None, ge=0, le=100)
    communication_score: Optional[int] = Field(None, ge=0, le=100)
    relevance_score: Optional[int] = Field(None, ge=0, le=100)
    confidence_score: Optional[int] = Field(None, ge=0, le=100)
    summary: str
    strengths: List[str]
    weaknesses: List[str]
    recommendations: List[str]


# ─── Dashboard Schemas ────────────────────────────────────────────────────────

class DashboardSummary(BaseModel):
    total_sessions: int
    completed_sessions: int
    average_score: Optional[float]
    recent_sessions: List[SessionResponse]


# ─── Agora Schemas ────────────────────────────────────────────────────────────

class AgoraTokenRequest(BaseModel):
    session_id: uuid.UUID
    channel_name: str


class AgoraTokenResponse(BaseModel):
    token: str
    app_id: str
    channel_name: str
    uid: int


# ─── Error Schemas ────────────────────────────────────────────────────────────

class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail


class ConversationMessageCreate(BaseModel):
    role: str
    content: str


class ConversationMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    role: str
    content: str
    timestamp: datetime
