import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.word_list import WordList, WordListItem
from app.models.vocabulary import Vocabulary
from app.schemas.word_list import (
    WordListCreate, WordListUpdate, WordListResponse,
    WordListDetailResponse, WordListAddWords,
)
from app.schemas.vocabulary import VocabularyResponse

router = APIRouter(prefix="/api/word-lists", tags=["word-lists"])


@router.get("", response_model=list[WordListResponse])
def list_word_lists(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lists = db.query(WordList).filter(WordList.user_id == current_user.id).order_by(WordList.created_at.desc()).all()
    results = []
    for wl in lists:
        resp = WordListResponse.model_validate(wl)
        resp.word_count = len(wl.items)
        results.append(resp)
    return results


@router.post("", response_model=WordListResponse, status_code=201)
def create_word_list(data: WordListCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    wl = WordList(user_id=current_user.id, name=data.name, description=data.description)
    db.add(wl)
    db.commit()
    db.refresh(wl)
    resp = WordListResponse.model_validate(wl)
    resp.word_count = 0
    return resp


@router.get("/{list_id}", response_model=WordListDetailResponse)
def get_word_list(list_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    wl = db.query(WordList).filter(WordList.id == list_id, WordList.user_id == current_user.id).first()
    if not wl:
        raise HTTPException(status_code=404, detail={"code": "error.word_list.not_found", "message": "Word list not found"})
    words = [VocabularyResponse.model_validate(item.vocabulary) for item in wl.items]
    return WordListDetailResponse(
        id=wl.id, name=wl.name, description=wl.description,
        is_default=wl.is_default, word_count=len(words),
        created_at=wl.created_at, updated_at=wl.updated_at, words=words,
    )


@router.put("/{list_id}", response_model=WordListResponse)
def update_word_list(list_id: uuid.UUID, data: WordListUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    wl = db.query(WordList).filter(WordList.id == list_id, WordList.user_id == current_user.id).first()
    if not wl:
        raise HTTPException(status_code=404, detail={"code": "error.word_list.not_found", "message": "Word list not found"})
    if data.name is not None:
        wl.name = data.name
    if data.description is not None:
        wl.description = data.description
    db.commit()
    db.refresh(wl)
    resp = WordListResponse.model_validate(wl)
    resp.word_count = len(wl.items)
    return resp


@router.delete("/{list_id}", status_code=204)
def delete_word_list(list_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    wl = db.query(WordList).filter(WordList.id == list_id, WordList.user_id == current_user.id).first()
    if not wl:
        raise HTTPException(status_code=404, detail={"code": "error.word_list.not_found", "message": "Word list not found"})
    db.delete(wl)
    db.commit()


@router.post("/{list_id}/words", status_code=201)
def add_words_to_list(list_id: uuid.UUID, data: WordListAddWords, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    wl = db.query(WordList).filter(WordList.id == list_id, WordList.user_id == current_user.id).first()
    if not wl:
        raise HTTPException(status_code=404, detail={"code": "error.word_list.not_found", "message": "Word list not found"})

    existing_vocab_ids = {item.vocabulary_id for item in wl.items}
    position = len(wl.items)
    for vid in data.vocabulary_ids:
        if vid in existing_vocab_ids:
            continue
        vocab = db.query(Vocabulary).filter(Vocabulary.id == vid, Vocabulary.user_id == current_user.id).first()
        if vocab:
            item = WordListItem(word_list_id=wl.id, vocabulary_id=vid, position=position)
            db.add(item)
            position += 1
    db.commit()
    return {"message": "Words added"}


@router.delete("/{list_id}/words/{vocab_id}", status_code=204)
def remove_word_from_list(list_id: uuid.UUID, vocab_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(WordListItem).join(WordList).filter(
        WordListItem.word_list_id == list_id,
        WordListItem.vocabulary_id == vocab_id,
        WordList.user_id == current_user.id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail={"code": "error.word_list.item_not_found", "message": "Word not in list"})
    db.delete(item)
    db.commit()
