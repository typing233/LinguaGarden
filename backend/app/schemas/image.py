import uuid
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel


class ImageResponse(BaseModel):
    id: uuid.UUID
    original_filename: str
    mime_type: str
    file_size: Optional[int] = None
    vision_description: Optional[str] = None
    suggested_words: Optional[List[dict]] = None
    processed: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ImageAddWords(BaseModel):
    word_indices: List[int]
