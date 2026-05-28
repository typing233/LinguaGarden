import uuid
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel

from app.schemas.vocabulary import VocabularyResponse


class WordListCreate(BaseModel):
    name: str
    description: Optional[str] = None


class WordListUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class WordListResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    is_default: bool
    word_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WordListDetailResponse(WordListResponse):
    words: List[VocabularyResponse] = []


class WordListAddWords(BaseModel):
    vocabulary_ids: List[uuid.UUID]
