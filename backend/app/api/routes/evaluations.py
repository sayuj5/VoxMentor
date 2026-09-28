import uuid
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session as DbSession

from app.db.database import get_db
from app.models.models import Session, SessionStatus, Evaluation
from app.schemas.schemas import EvaluationResponse
from app.api.deps import get_current_user
from app.models.models import User
from app.services.evaluation.evaluation_service import evaluate_session
from app.core.logging import logger

router = APIRouter()


def _run_evaluation(session_id: uuid.UUID, db: DbSession):
    """Background task: evaluate session and store result."""
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        logger.error(f"Evaluation: session {session_id} not found")
        return

    messages = session.messages
    result = evaluate_session(session, messages)
    if not result:
        logger.error(f"Evaluation failed for session {session_id}")
        evaluation = Evaluation(
            session_id=session_id,
            status="failed",
            overall_score=None,
            summary="Something went wrong while generating your assessment.",
        )
        db.add(evaluation)
        db.commit()
        return

    evaluation = Evaluation(
        session_id=session_id,
        status=result.status,
        overall_score=result.overall_score,
        technical_score=result.technical_score,
        communication_score=result.communication_score,
        relevance_score=result.relevance_score,
        confidence_score=result.confidence_score,
        summary=result.summary,
        strengths=result.strengths,
        weaknesses=result.weaknesses,
        recommendations=result.recommendations,
    )
    db.add(evaluation)
    db.commit()
    logger.info(f"Evaluation stored for session {session_id}: score={result.overall_score} status={result.status}")


@router.post("/{session_id}/evaluate", status_code=status.HTTP_202_ACCEPTED)
def trigger_evaluation(
    session_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: DbSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    if session.status != SessionStatus.COMPLETED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session must be completed before evaluation")

    background_tasks.add_task(_run_evaluation, session_id, db)
    return {"message": "Evaluation started", "session_id": str(session_id)}


@router.get("/{session_id}/evaluation", response_model=EvaluationResponse)
def get_evaluation(
    session_id: uuid.UUID,
    db: DbSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    evaluation = db.query(Evaluation).filter(Evaluation.session_id == session_id).first()
    if not evaluation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation not yet available")
    return evaluation
