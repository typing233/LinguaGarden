import uuid
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel


class ProgressResponse(BaseModel):
    id: uuid.UUID
    vocabulary_id: uuid.UUID
    review_count: int
    correct_count: int
    last_reviewed_at: Optional[datetime] = None
    next_review_at: Optional[datetime] = None
    streak: int

    model_config = {"from_attributes": True}


class ProgressSummary(BaseModel):
    total_words: int
    words_mastered: int
    total_exercises: int
    average_score: Optional[float] = None
    current_streak: int
    words_due_review: int


class DailyProgress(BaseModel):
    date: str
    words_reviewed: int
    exercises_completed: int
    average_score: Optional[float] = None
