import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, Boolean, ForeignKey, DateTime, Text, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.database import Base


class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    exercise_type: Mapped[str] = mapped_column(String(50), nullable=False)
    word_list_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("word_lists.id", ondelete="SET NULL"))
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    correct_answers: Mapped[int] = mapped_column(Integer, default=0)
    score: Mapped[float | None] = mapped_column(Numeric(5, 2))
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user = relationship("User", back_populates="exercises")
    questions = relationship("ExerciseQuestion", back_populates="exercise", cascade="all, delete-orphan")


class ExerciseQuestion(Base):
    __tablename__ = "exercise_questions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exercise_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False)
    vocabulary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vocabularies.id", ondelete="CASCADE"), nullable=False)
    question_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    user_answer: Mapped[str | None] = mapped_column(Text)
    is_correct: Mapped[bool | None] = mapped_column(Boolean)
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    exercise = relationship("Exercise", back_populates="questions")
    vocabulary = relationship("Vocabulary")
