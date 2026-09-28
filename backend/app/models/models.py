import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum, Integer, ForeignKey, Text, JSON, TypeDecorator, CHAR
from sqlalchemy.orm import relationship
from app.db.database import Base


# ─── Cross-DB UUID Type ───────────────────────────────────────────────────────

class GUID(TypeDecorator):
    """
    Platform-independent UUID type.
    Uses PostgreSQL's UUID type, or a CHAR(36) for other databases (e.g. SQLite).
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            from sqlalchemy.dialects.postgresql import UUID as PUUID
            return dialect.type_descriptor(PUUID(as_uuid=True))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if dialect.name == 'postgresql':
            return str(value)
        if isinstance(value, uuid.UUID):
            return str(value)
        return str(uuid.UUID(value))

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(value)


# ─── Enums ────────────────────────────────────────────────────────────────────

class SessionMode(str, enum.Enum):
    TECHNICAL_INTERVIEW = "technical_interview"
    HR_INTERVIEW = "hr_interview"
    LEARNING_MENTOR = "learning_mentor"
    COMMUNICATION_COACH = "communication_coach"


class SessionStatus(str, enum.Enum):
    CREATED = "created"
    STARTING = "starting"
    ACTIVE = "active"
    RECOVERING = "recovering"
    ENDING = "ending"
    COMPLETED = "completed"
    FAILED = "failed"


class SessionDifficulty(str, enum.Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


# ─── Models ───────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    name = Column(String(255), nullable=False)
    google_id = Column(String(255), unique=True, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    mode = Column(Enum(SessionMode), nullable=False)
    topic = Column(String(255), nullable=False, default="General")
    difficulty = Column(Enum(SessionDifficulty), nullable=False, default=SessionDifficulty.INTERMEDIATE)
    status = Column(Enum(SessionStatus), nullable=False, default=SessionStatus.CREATED)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    duration = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Agora session tracking — persisted so we can recover from timeouts/conflicts
    agora_agent_id = Column(String(255), nullable=True)      # Agent instance ID returned by Agora /join
    agora_channel_name = Column(String(255), nullable=True)  # voxmentor_{session_id}
    agora_user_uid = Column(Integer, nullable=True)          # User RTC UID
    agora_agent_uid = Column(String(50), nullable=True)      # Agent RTC UID

    user = relationship("User", back_populates="sessions")
    messages = relationship("ConversationMessage", back_populates="session", cascade="all, delete-orphan")
    evaluation = relationship("Evaluation", back_populates="session", uselist=False, cascade="all, delete-orphan")


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4, index=True)
    session_id = Column(GUID(), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), nullable=False)
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("Session", back_populates="messages")


class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4, index=True)
    session_id = Column(GUID(), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    status = Column(String(50), nullable=False, default="completed")
    overall_score = Column(Integer, nullable=True)
    technical_score = Column(Integer, nullable=True)
    communication_score = Column(Integer, nullable=True)
    relevance_score = Column(Integer, nullable=True)
    confidence_score = Column(Integer, nullable=True)
    summary = Column(Text, nullable=False)
    strengths = Column(JSON, nullable=False, default=list)
    weaknesses = Column(JSON, nullable=False, default=list)
    recommendations = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("Session", back_populates="evaluation")
