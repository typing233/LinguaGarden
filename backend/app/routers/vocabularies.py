from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.vocabulary import Vocabulary
from app.models.tag import Tag
from app.schemas.vocabulary import (
    VocabularyCreate, VocabularyUpdate, VocabularyResponse,
    VocabularyBatchCreate, PaginatedResponse,
)

router = APIRouter(prefix="/api/vocabularies", tags=["vocabularies"])


@router.get("", response_model=PaginatedResponse)
def list_vocabularies(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tag_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    source_language: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Vocabulary).filter(Vocabulary.user_id == current_user.id)

    if tag_id:
        query = query.filter(Vocabulary.tags.any(Tag.id == tag_id))
    if search:
        query = query.filter(
            or_(Vocabulary.word.ilike(f"%{search}%"), Vocabulary.translation.ilike(f"%{search}%"))
        )
    if source_language:
        query = query.filter(Vocabulary.source_language == source_language)

    total = query.count()
    items = query.order_by(Vocabulary.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    pages = (total + page_size - 1) // page_size

    return PaginatedResponse(
        items=[VocabularyResponse.model_validate(v) for v in items],
        total=total, page=page, page_size=page_size, pages=pages,
    )


@router.post("", response_model=VocabularyResponse, status_code=201)
def create_vocabulary(
    data: VocabularyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vocab = Vocabulary(
        user_id=current_user.id,
        word=data.word,
        translation=data.translation,
        source_language=data.source_language,
        target_language=data.target_language,
        definition=data.definition,
        example_sentence=data.example_sentence,
        pronunciation=data.pronunciation,
        difficulty_level=data.difficulty_level,
    )
    if data.tag_ids:
        tags = db.query(Tag).filter(Tag.id.in_(data.tag_ids), Tag.user_id == current_user.id).all()
        vocab.tags = tags
    db.add(vocab)
    db.commit()
    db.refresh(vocab)
    return VocabularyResponse.model_validate(vocab)


@router.post("/batch", response_model=list[VocabularyResponse], status_code=201)
def batch_create(
    data: VocabularyBatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = []
    for word_data in data.words:
        vocab = Vocabulary(
            user_id=current_user.id,
            word=word_data.word,
            translation=word_data.translation,
            source_language=word_data.source_language,
            target_language=word_data.target_language,
            definition=word_data.definition,
            example_sentence=word_data.example_sentence,
            pronunciation=word_data.pronunciation,
            difficulty_level=word_data.difficulty_level,
        )
        if word_data.tag_ids:
            tags = db.query(Tag).filter(Tag.id.in_(word_data.tag_ids), Tag.user_id == current_user.id).all()
            vocab.tags = tags
        db.add(vocab)
        results.append(vocab)
    db.commit()
    for v in results:
        db.refresh(v)
    return [VocabularyResponse.model_validate(v) for v in results]


@router.get("/{vocab_id}", response_model=VocabularyResponse)
def get_vocabulary(vocab_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vocab = db.query(Vocabulary).filter(Vocabulary.id == vocab_id, Vocabulary.user_id == current_user.id).first()
    if not vocab:
        raise HTTPException(status_code=404, detail={"code": "error.vocab.not_found", "message": "Vocabulary not found"})
    return VocabularyResponse.model_validate(vocab)


@router.put("/{vocab_id}", response_model=VocabularyResponse)
def update_vocabulary(
    vocab_id: uuid.UUID,
    data: VocabularyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vocab = db.query(Vocabulary).filter(Vocabulary.id == vocab_id, Vocabulary.user_id == current_user.id).first()
    if not vocab:
        raise HTTPException(status_code=404, detail={"code": "error.vocab.not_found", "message": "Vocabulary not found"})

    update_data = data.model_dump(exclude_unset=True)
    tag_ids = update_data.pop("tag_ids", None)
    for key, value in update_data.items():
        setattr(vocab, key, value)
    if tag_ids is not None:
        tags = db.query(Tag).filter(Tag.id.in_(tag_ids), Tag.user_id == current_user.id).all()
        vocab.tags = tags

    db.commit()
    db.refresh(vocab)
    return VocabularyResponse.model_validate(vocab)


@router.delete("/{vocab_id}", status_code=204)
def delete_vocabulary(vocab_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vocab = db.query(Vocabulary).filter(Vocabulary.id == vocab_id, Vocabulary.user_id == current_user.id).first()
    if not vocab:
        raise HTTPException(status_code=404, detail={"code": "error.vocab.not_found", "message": "Vocabulary not found"})
    db.delete(vocab)
    db.commit()
