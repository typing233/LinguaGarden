import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.exercise import Exercise, ExerciseQuestion
from app.schemas.exercise import (
    ExerciseGenerate, ExerciseResponse, ExerciseAnswer,
    ExerciseComplete, ExerciseHistoryResponse,
)
from app.services.exercise_service import generate_exercise, check_answer, complete_exercise

router = APIRouter(prefix="/api/exercises", tags=["exercises"])


@router.post("/generate", response_model=ExerciseResponse, status_code=201)
def generate(data: ExerciseGenerate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if data.exercise_type not in ("spelling", "multiple_choice", "card_matching"):
        raise HTTPException(status_code=400, detail={"code": "error.exercise.invalid_type", "message": "Invalid exercise type"})
    try:
        exercise = generate_exercise(db, current_user.id, data.exercise_type, data.word_list_id, data.count)
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"code": "error.exercise.not_enough_words", "message": str(e)})
    return ExerciseResponse.model_validate(exercise)


@router.get("/{exercise_id}", response_model=ExerciseResponse)
def get_exercise(exercise_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id, Exercise.user_id == current_user.id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail={"code": "error.exercise.not_found", "message": "Exercise not found"})
    return ExerciseResponse.model_validate(exercise)


@router.post("/{exercise_id}/answer")
def answer_question(exercise_id: uuid.UUID, data: ExerciseAnswer, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id, Exercise.user_id == current_user.id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail={"code": "error.exercise.not_found", "message": "Exercise not found"})
    if exercise.completed:
        raise HTTPException(status_code=400, detail={"code": "error.exercise.already_completed", "message": "Exercise already completed"})

    question = db.query(ExerciseQuestion).filter(
        ExerciseQuestion.id == data.question_id,
        ExerciseQuestion.exercise_id == exercise_id,
    ).first()
    if not question:
        raise HTTPException(status_code=404, detail={"code": "error.exercise.question_not_found", "message": "Question not found"})

    is_correct = check_answer(db, question, data.answer)
    return {"is_correct": is_correct, "correct_answer": question.question_data.get("correct_answer") or question.question_data.get("correct_index")}


@router.post("/{exercise_id}/complete", response_model=ExerciseResponse)
def complete(exercise_id: uuid.UUID, data: ExerciseComplete, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id, Exercise.user_id == current_user.id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail={"code": "error.exercise.not_found", "message": "Exercise not found"})
    if exercise.completed:
        raise HTTPException(status_code=400, detail={"code": "error.exercise.already_completed", "message": "Exercise already completed"})

    complete_exercise(db, exercise, data.duration_seconds)
    db.refresh(exercise)
    return ExerciseResponse.model_validate(exercise)


@router.get("", response_model=ExerciseHistoryResponse)
def history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Exercise).filter(Exercise.user_id == current_user.id, Exercise.completed == True)
    total = query.count()
    items = query.order_by(Exercise.completed_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return ExerciseHistoryResponse(
        items=[ExerciseResponse.model_validate(e) for e in items],
        total=total, page=page, page_size=page_size,
    )
