import uuid
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel


class TagBase(BaseModel):
    name: str
    color: Optional[str] = "#6366f1"


class TagCreate(TagBase):
    pass


class TagResponse(TagBase):
    id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class VocabularyBase(BaseModel):
    word: str
    translation: str
    source_language: str = "en"
    target_language: str = "zh"
    definition: Optional[str] = None
    example_sentence: Optional[str] = None
    pronunciation: Optional[str] = None
    difficulty_level: int = 1


class VocabularyCreate(VocabularyBase):
    tag_ids: Optional[List[uuid.UUID]] = None


class VocabularyUpdate(BaseModel):
    word: Optional[str] = None
    translation: Optional[str] = None
    source_language: Optional[str] = None
    target_language: Optional[str] = None
    definition: Optional[str] = None
    example_sentence: Optional[str] = None
    pronunciation: Optional[str] = None
    difficulty_level: Optional[int] = None
    tag_ids: Optional[List[uuid.UUID]] = None


class VocabularyResponse(VocabularyBase):
    id: uuid.UUID
    user_id: uuid.UUID
    mastery_level: int
    source: str
    image_id: Optional[uuid.UUID] = None
    tags: List[TagResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VocabularyBatchCreate(BaseModel):
    words: List[VocabularyCreate]


class PaginatedResponse(BaseModel):
    items: List[VocabularyResponse]
    total: int
    page: int
    page_size: int
    pages: int
