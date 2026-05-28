import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.tag import Tag
from app.models.vocabulary import Vocabulary
from app.schemas.vocabulary import TagCreate, TagResponse

router = APIRouter(prefix="/api/tags", tags=["tags"])


@router.get("", response_model=list[TagResponse])
def list_tags(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Tag).filter(Tag.user_id == current_user.id).order_by(Tag.name).all()


@router.post("", response_model=TagResponse, status_code=201)
def create_tag(data: TagCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Tag).filter(Tag.user_id == current_user.id, Tag.name == data.name).first()
    if existing:
        raise HTTPException(status_code=409, detail={"code": "error.tag.exists", "message": "Tag already exists"})
    tag = Tag(user_id=current_user.id, name=data.name, color=data.color)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.put("/{tag_id}", response_model=TagResponse)
def update_tag(tag_id: uuid.UUID, data: TagCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tag = db.query(Tag).filter(Tag.id == tag_id, Tag.user_id == current_user.id).first()
    if not tag:
        raise HTTPException(status_code=404, detail={"code": "error.tag.not_found", "message": "Tag not found"})
    tag.name = data.name
    tag.color = data.color
    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/{tag_id}", status_code=204)
def delete_tag(tag_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tag = db.query(Tag).filter(Tag.id == tag_id, Tag.user_id == current_user.id).first()
    if not tag:
        raise HTTPException(status_code=404, detail={"code": "error.tag.not_found", "message": "Tag not found"})
    db.delete(tag)
    db.commit()


@router.post("/vocabularies/{vocab_id}/tags", status_code=201)
def assign_tags(vocab_id: uuid.UUID, tag_ids: list[uuid.UUID], db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vocab = db.query(Vocabulary).filter(Vocabulary.id == vocab_id, Vocabulary.user_id == current_user.id).first()
    if not vocab:
        raise HTTPException(status_code=404, detail={"code": "error.vocab.not_found", "message": "Vocabulary not found"})
    tags = db.query(Tag).filter(Tag.id.in_(tag_ids), Tag.user_id == current_user.id).all()
    vocab.tags = tags
    db.commit()
    return {"message": "Tags assigned"}
