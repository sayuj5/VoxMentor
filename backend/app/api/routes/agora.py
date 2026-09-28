import uuid
import random
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DbSession

from app.db.database import get_db
from app.models.models import Session, SessionStatus
from app.schemas.schemas import AgoraTokenResponse
from app.api.deps import get_current_user
from app.models.models import User
from app.services.agora.agora_service import generate_rtc_token, get_system_prompt
from app.core.config import settings
from app.core.logging import logger

router = APIRouter()


@router.post("/token", response_model=AgoraTokenResponse)
def get_agora_token(
    session_id: uuid.UUID,
    db: DbSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    if session.status not in [SessionStatus.CREATED, SessionStatus.ACTIVE]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session is not active")

    channel_name = f"voxmentor_{session_id}"
    uid = random.randint(100000, 999999)

    try:
        token = generate_rtc_token(channel_name=channel_name, uid=uid)
    except Exception as e:
        logger.error(f"Failed to generate Agora token for session {session_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate voice session token")

    return AgoraTokenResponse(
        token=token,
        app_id=settings.AGORA_APP_ID,
        channel_name=channel_name,
        uid=uid,
    )


@router.get("/agent-config/{session_id}")
def get_agent_config(
    session_id: uuid.UUID,
    db: DbSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    prompt = get_system_prompt(
        mode=session.mode.value,
        topic=session.topic,
        difficulty=session.difficulty.value,
    )
    return {"session_id": str(session_id), "agent_config": {"system_prompt": prompt, "voice": "en-US-Neural2-D", "language": "en-US"}}
