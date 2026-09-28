from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DbSession
from sqlalchemy import func

from app.db.database import get_db
from app.models.models import Session, SessionStatus, Evaluation
from app.schemas.schemas import DashboardSummary, SessionResponse
from app.api.deps import get_current_user
from app.models.models import User

router = APIRouter()


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    db: DbSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_sessions = db.query(func.count(Session.id)).filter(Session.user_id == current_user.id).scalar()

    completed_sessions = (
        db.query(func.count(Session.id))
        .filter(Session.user_id == current_user.id, Session.status == SessionStatus.COMPLETED)
        .scalar()
    )

    avg_score_row = (
        db.query(func.avg(Evaluation.overall_score))
        .join(Session, Session.id == Evaluation.session_id)
        .filter(Session.user_id == current_user.id)
        .scalar()
    )
    average_score = round(float(avg_score_row), 1) if avg_score_row else None

    recent_sessions = (
        db.query(Session)
        .filter(Session.user_id == current_user.id)
        .order_by(Session.created_at.desc())
        .limit(5)
        .all()
    )

    return DashboardSummary(
        total_sessions=total_sessions,
        completed_sessions=completed_sessions,
        average_score=average_score,
        recent_sessions=recent_sessions,
    )
