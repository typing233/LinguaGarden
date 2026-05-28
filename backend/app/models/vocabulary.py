import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, Text, ForeignKey, DateTime, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base

vocabulary_tags = Table(
    "vocabulary_tags",
    Base.metadata,
    Column("vocabulary_id", UUID(as_uuid=True), ForeignKey("vocabularies.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", UUID(as_uuid=True), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Vocabulary(Base):
    __tablename__ = "vocabularies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    word: Mapped[str] = mapped_column(String(200), nullable=False)
    translation: Mapped[str] = mapped_column(String(200), nullable=False)
    source_language: Mapped[str] = mapped_column(String(10), nullable=False, default="en")
    target_language: Mapped[str] = mapped_column(String(10), nullable=False, default="zh")
    definition: Mapped[str | None] = mapped_column(Text)
    example_sentence: Mapped[str | None] = mapped_column(Text)
    pronunciation: Mapped[str | None] = mapped_column(String(200))
    difficulty_level: Mapped[int] = mapped_column(Integer, default=1)
    mastery_level: Mapped[int] = mapped_column(Integer, default=0)
    source: Mapped[str] = mapped_column(String(50), default="manual")
    image_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("images.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="vocabularies")
    tags = relationship("Tag", secondary=vocabulary_tags, back_populates="vocabularies")
    image = relationship("Image", back_populates="vocabularies")
