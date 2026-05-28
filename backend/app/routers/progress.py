import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.vocabulary import Vocabulary
from app.models.exercise import Exercise
from app.models.progress import Progress
from app.schemas.progress import ProgressResponse, ProgressSummary, DailyProgress

router = APIRouter(prefix="/api/progress", tags=["progress"])


@router.get("/summary", response_model=ProgressSummary)
def get_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total_words = db.query(Vocabulary).filter(Vocabulary.user_id == current_user.id).count()
    words_mastered = db.query(Vocabulary).filter(
        Vocabulary.user_id == current_user.id, Vocabulary.mastery_level >= 80
    ).count()
    total_exercises = db.query(Exercise).filter(
        Exercise.user_id == current_user.id, Exercise.completed == True
    ).count()

    avg_score = db.query(func.avg(Exercise.score)).filter(
        Exercise.user_id == current_user.id, Exercise.completed == True
    ).scalar()

    # Calculate current streak (consecutive days with at least one exercise)
    current_streak = 0
    today = datetime.now(timezone.utc).date()
    for i in range(365):
        day = today - timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time()).replace(tzinfo=timezone.utc)
        day_end = day_start + timedelta(days=1)
        has_exercise = db.query(Exercise).filter(
            Exercise.user_id == current_user.id,
            Exercise.completed == True,
            Exercise.completed_at >= day_start,
            Exercise.completed_at < day_end,
        ).first()
        if has_exercise:
            current_streak += 1
        else:
            if i > 0:
                break

    words_due = db.query(Progress).filter(
        Progress.user_id == current_user.id,
        Progress.next_review_at <= datetime.now(timezone.utc),
    ).count()

    return ProgressSummary(
        total_words=total_words,
        words_mastered=words_mastered,
        total_exercises=total_exercises,
        average_score=round(float(avg_score), 1) if avg_score else None,
        current_streak=current_streak,
        words_due_review=words_due,
    )


@router.get("/history", response_model=list[DailyProgress])
def get_history(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = []
    today = datetime.now(timezone.utc).date()
    for i in range(days):
        day = today - timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time()).replace(tzinfo=timezone.utc)
        day_end = day_start + timedelta(days=1)

        exercises = db.query(Exercise).filter(
            Exercise.user_id == current_user.id,
            Exercise.completed == True,
            Exercise.completed_at >= day_start,
            Exercise.completed_at < day_end,
        ).all()

        words_reviewed = db.query(Progress).filter(
            Progress.user_id == current_user.id,
            Progress.last_reviewed_at >= day_start,
            Progress.last_reviewed_at < day_end,
        ).count()

        avg = None
        if exercises:
            scores = [e.score for e in exercises if e.score is not None]
            if scores:
                avg = round(sum(float(s) for s in scores) / len(scores), 1)

        result.append(DailyProgress(
            date=day.isoformat(),
            words_reviewed=words_reviewed,
            exercises_completed=len(exercises),
            average_score=avg,
        ))

    result.reverse()
    return result


@router.get("/vocabulary/{vocab_id}", response_model=ProgressResponse)
def get_vocab_progress(vocab_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    progress = db.query(Progress).filter(
        Progress.user_id == current_user.id,
        Progress.vocabulary_id == vocab_id,
    ).first()
    if not progress:
        return ProgressResponse(
            id=uuid.uuid4(), vocabulary_id=vocab_id,
            review_count=0, correct_count=0, streak=0,
        )
    return ProgressResponse.model_validate(progress)
