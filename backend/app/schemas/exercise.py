import uuid
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel


class ExerciseGenerate(BaseModel):
    exercise_type: str  # spelling, multiple_choice, card_matching
    word_list_id: Optional[uuid.UUID] = None
    count: int = 10


class ExerciseQuestionResponse(BaseModel):
    id: uuid.UUID
    vocabulary_id: uuid.UUID
    question_data: dict
    user_answer: Optional[str] = None
    is_correct: Optional[bool] = None

    model_config = {"from_attributes": True}


class ExerciseResponse(BaseModel):
    id: uuid.UUID
    exercise_type: str
    total_questions: int
    correct_answers: int
    score: Optional[float] = None
    duration_seconds: Optional[int] = None
    completed: bool
    started_at: datetime
    completed_at: Optional[datetime] = None
    questions: List[ExerciseQuestionResponse] = []

    model_config = {"from_attributes": True}


class ExerciseAnswer(BaseModel):
    question_id: uuid.UUID
    answer: str


class ExerciseComplete(BaseModel):
    duration_seconds: Optional[int] = None


class ExerciseHistoryResponse(BaseModel):
    items: List[ExerciseResponse]
    total: int
    page: int
    page_size: int
