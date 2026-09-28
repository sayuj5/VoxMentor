"""
VoxMentor Session Routes

Session lifecycle state machine:
  CREATED → STARTING → ACTIVE → ENDING → COMPLETED
                    ↘ RECOVERING → ACTIVE
                                 ↘ FAILED
  CREATED → FAILED
  ACTIVE  → FAILED

Idempotency rules enforced here:
  - Only CREATED status may call /start (unless recovering)
  - STARTING / RECOVERING: the frontend is offered the existing channel data if available
  - ACTIVE + agora_channel_name: treated as recovery (page refresh, second tab differs)
  - 409 from Agora: recovered transparently if same channel
"""

from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session as DbSession
from sqlalchemy import func
import uuid
import random

from app.db.database import get_db
from app.models.models import Session, SessionStatus, SessionMode, SessionDifficulty, ConversationMessage
from app.schemas.schemas import (
    SessionCreateRequest, SessionResponse, SessionListResponse,
    ConversationMessageCreate, ConversationMessageResponse,
    SessionStartResponse, AgoraTokenResponse,
)
from app.api.deps import get_current_user
from app.models.models import User
from app.core.logging import logger
from app.services.agora.agora_service import (
    start_conversation_ai_agent,
    stop_conversation_ai_agent,
    generate_rtc_token,
)
from app.core.config import settings

router = APIRouter()


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_session_or_404(session_id: uuid.UUID, db: DbSession) -> Session:
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session


def _make_connection(session: Session) -> AgoraTokenResponse:
    """Re-generate an RTC token using stored channel/uid data."""
    token = generate_rtc_token(
        channel_name=session.agora_channel_name,
        uid=session.agora_user_uid,
    )
    return AgoraTokenResponse(
        token=token,
        app_id=settings.AGORA_APP_ID,
        channel_name=session.agora_channel_name,
        uid=session.agora_user_uid,
    )


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: SessionCreateRequest,
    db: DbSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = Session(
        user_id=current_user.id,
        mode=SessionMode(payload.mode),
        topic=payload.topic,
        difficulty=SessionDifficulty(payload.difficulty),
        status=SessionStatus.CREATED,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    logger.info(f"[SESSION_START] created session_id={session.id} user_id={current_user.id}")
    return session


@router.get("", response_model=SessionListResponse)
def list_sessions(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: DbSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total = db.query(func.count(Session.id)).filter(Session.user_id == current_user.id).scalar()
    sessions = (
        db.query(Session)
        .filter(Session.user_id == current_user.id)
        .order_by(Session.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return SessionListResponse(sessions=sessions, total=total, page=page, page_size=page_size)


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(
    session_id: uuid.UUID,
    db: DbSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _get_session_or_404(session_id, db)
    if session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return session


@router.post("/{session_id}/start", response_model=SessionStartResponse)
def start_session(
    session_id: uuid.UUID,
    db: DbSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _get_session_or_404(session_id, db)
    if session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    sid = str(session_id)
    logger.info(f"[SESSION_START] start requested session_id={sid} status={session.status}")

    # ── Already ACTIVE with stored channel data → recovery path ──────────────
    # This happens after a page refresh when the backend is already ACTIVE.
    # Return a freshly signed token using the same channel/uid so the frontend
    # can join the existing Agora channel without creating a new agent.
    if session.status == SessionStatus.ACTIVE and session.agora_channel_name:
        logger.info(f"[SESSION_START] session already ACTIVE — returning recovery connection session_id={sid}")
        connection = _make_connection(session)
        return SessionStartResponse(session=session, connection=connection, recovering=False)

    # ── STARTING or RECOVERING with channel data → partial recovery ───────────
    if session.status in (SessionStatus.STARTING, SessionStatus.RECOVERING) and session.agora_channel_name:
        logger.info(f"[SESSION_START] session is {session.status} — returning recovering state session_id={sid}")
        # We still don't know if the Agora agent is up; return recovering=True
        # so the frontend enters the polling/recovery UI rather than retrying.
        return SessionStartResponse(
            session=session,
            connection=None,
            recovering=True,
            message="Connecting to VoxMentor is taking longer than expected. Waiting for agent...",
        )

    # ── Terminal states: block ────────────────────────────────────────────────
    if session.status in (SessionStatus.COMPLETED, SessionStatus.ENDING):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot start session in status {session.status}",
        )
    if session.status == SessionStatus.FAILED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This session has failed. Please create a new session.",
        )

    # ── ACTIVE without channel data → conflict (another tab/user) ────────────
    if session.status == SessionStatus.ACTIVE and not session.agora_channel_name:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This session is already active in another tab.",
        )

    # ── CREATED → STARTING ────────────────────────────────────────────────────
    # Generate channel, UIDs, and persist them BEFORE calling Agora,
    # so we can recover even if the HTTP call times out.
    channel_name = f"voxmentor_{session.id}"
    user_uid = random.randint(100000, 999999)
    agent_uid = str(random.randint(1, 99999))

    session.status = SessionStatus.STARTING
    session.agora_channel_name = channel_name
    session.agora_user_uid = user_uid
    session.agora_agent_uid = agent_uid
    db.commit()
    db.refresh(session)
    logger.info(f"[SESSION_START] marked STARTING session_id={sid} channel={channel_name}")

    # ── Call Agora /join ──────────────────────────────────────────────────────
    try:
        result = start_conversation_ai_agent(
            channel_name=channel_name,
            mode=session.mode.value,
            topic=session.topic,
            difficulty=session.difficulty.value,
            agent_rtc_uid=agent_uid,
            user_rtc_uid=user_uid,
        )
    except Exception as e:
        logger.error(f"[SESSION_START] Agora /join raised unexpected error session_id={sid}: {e}")
        session.status = SessionStatus.FAILED
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize AI agent session",
        )

    # ── Handle Agora result ───────────────────────────────────────────────────
    agora_status = result.get("status")

    if agora_status == "success":
        session.agora_agent_id = result.get("agent_id", "")
        session.status = SessionStatus.ACTIVE
        session.started_at = datetime.utcnow()
        db.commit()
        db.refresh(session)
        logger.info(
            f"[AGORA_JOIN_SUCCESS] session_id={sid} "
            f"agent_id={session.agora_agent_id} channel={channel_name}"
        )
        token = generate_rtc_token(channel_name=channel_name, uid=user_uid)
        connection = AgoraTokenResponse(
            token=token,
            app_id=settings.AGORA_APP_ID,
            channel_name=channel_name,
            uid=user_uid,
        )
        return SessionStartResponse(session=session, connection=connection)

    if agora_status == "timeout":
        # Agora timed out — we don't know if the agent was created.
        # Mark RECOVERING so the frontend can poll and we can detect recovery.
        session.status = SessionStatus.RECOVERING
        db.commit()
        db.refresh(session)
        logger.warning(
            f"[AGORA_RECOVERY] session_id={sid} channel={channel_name} "
            "action=MARKED_RECOVERING — frontend should poll for status"
        )
        return SessionStartResponse(
            session=session,
            connection=None,
            recovering=True,
            message="Connecting to VoxMentor is taking longer than expected. Please wait...",
        )

    if agora_status == "conflict":
        # Agora returned 409 — an agent with this channel name already exists.
        # This is our agent (same session/channel) → treat as success by recovering.
        conflicting_agent_id = result.get("agent_id", "")
        logger.info(
            f"[AGORA_JOIN_CONFLICT] session_id={sid} channel={channel_name} "
            f"conflicting_agent_id={conflicting_agent_id} — treating as recovery"
        )
        session.agora_agent_id = conflicting_agent_id
        session.status = SessionStatus.ACTIVE
        session.started_at = session.started_at or datetime.utcnow()
        db.commit()
        db.refresh(session)
        token = generate_rtc_token(channel_name=channel_name, uid=user_uid)
        connection = AgoraTokenResponse(
            token=token,
            app_id=settings.AGORA_APP_ID,
            channel_name=channel_name,
            uid=user_uid,
        )
        return SessionStartResponse(session=session, connection=connection)

    if agora_status == "skipped":
        # Dev mode without Agora credentials
        session.status = SessionStatus.ACTIVE
        session.started_at = datetime.utcnow()
        db.commit()
        db.refresh(session)
        token = generate_rtc_token(channel_name=channel_name, uid=user_uid)
        connection = AgoraTokenResponse(
            token=token,
            app_id=settings.AGORA_APP_ID,
            channel_name=channel_name,
            uid=user_uid,
        )
        return SessionStartResponse(session=session, connection=connection)

    # Unknown status — unexpected
    session.status = SessionStatus.FAILED
    db.commit()
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Unexpected Agora agent status",
    )


@router.post("/{session_id}/end", response_model=SessionResponse)
def end_session(
    session_id: uuid.UUID,
    db: DbSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _get_session_or_404(session_id, db)
    if session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    sid = str(session_id)
    endable = {SessionStatus.ACTIVE, SessionStatus.STARTING, SessionStatus.RECOVERING}
    if session.status not in endable:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot end session in status {session.status}",
        )

    logger.info(f"[SESSION_END] ending session_id={sid} status={session.status}")

    # Mark ENDING before Agora call so we don't accept more /start requests
    session.status = SessionStatus.ENDING
    db.commit()

    # Stop Agora agent if we have an agent ID
    if session.agora_agent_id:
        try:
            stop_result = stop_conversation_ai_agent(session.agora_agent_id)
            logger.info(
                f"[AGORA_LEAVE] session_id={sid} "
                f"agent_id={session.agora_agent_id} result={stop_result.get('status')}"
            )
        except Exception as e:
            # Log but do NOT block session completion — the user's session should end
            logger.error(
                f"[AGORA_LEAVE] Failed to stop agent agent_id={session.agora_agent_id}: {e}"
            )
    else:
        logger.info(f"[AGORA_LEAVE] No agent_id stored for session_id={sid} — skipping agent stop")

    now = datetime.utcnow()
    session.status = SessionStatus.COMPLETED
    session.ended_at = now
    if session.started_at:
        session.duration = int((now - session.started_at).total_seconds())
    db.commit()
    db.refresh(session)
    logger.info(f"[SESSION_END] completed session_id={sid} duration={session.duration}s")
    return session


@router.post("/{session_id}/messages", response_model=ConversationMessageResponse, status_code=status.HTTP_201_CREATED)
def add_message(
    session_id: uuid.UUID,
    payload: ConversationMessageCreate,
    db: DbSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _get_session_or_404(session_id, db)
    if session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    msg = ConversationMessage(
        session_id=session_id,
        role=payload.role,
        content=payload.content,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


@router.get("/{session_id}/messages", response_model=List[ConversationMessageResponse])
def get_messages(
    session_id: uuid.UUID,
    db: DbSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _get_session_or_404(session_id, db)
    if session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return session.messages
