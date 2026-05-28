import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, Text, Boolean, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class WordList(Base):
    __tablename__ = "word_lists"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="word_lists")
    items = relationship("WordListItem", back_populates="word_list", cascade="all, delete-orphan")


class WordListItem(Base):
    __tablename__ = "word_list_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    word_list_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("word_lists.id", ondelete="CASCADE"), nullable=False)
    vocabulary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vocabularies.id", ondelete="CASCADE"), nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0)
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    word_list = relationship("WordList", back_populates="items")
    vocabulary = relationship("Vocabulary")

    __table_args__ = (UniqueConstraint("word_list_id", "vocabulary_id"),)
