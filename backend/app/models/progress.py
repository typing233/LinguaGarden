import uuid
from datetime import datetime, timezone

from sqlalchemy import Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Progress(Base):
    __tablename__ = "progress"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    vocabulary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vocabularies.id", ondelete="CASCADE"), nullable=False)
    review_count: Mapped[int] = mapped_column(Integer, default=0)
    correct_count: Mapped[int] = mapped_column(Integer, default=0)
    last_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    next_review_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    streak: Mapped[int] = mapped_column(Integer, default=0)

    user = relationship("User", back_populates="progress_records")
    vocabulary = relationship("Vocabulary")

    __table_args__ = (UniqueConstraint("user_id", "vocabulary_id"),)
