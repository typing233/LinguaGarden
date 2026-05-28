import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.image import Image
from app.models.vocabulary import Vocabulary
from app.schemas.image import ImageResponse, ImageAddWords
from app.services.vision_service import vision_service
from app.utils.storage import save_upload_file

router = APIRouter(prefix="/api/vision", tags=["vision"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


@router.post("/upload", response_model=ImageResponse, status_code=201)
def upload_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=422, detail={"code": "error.vision.invalid_type", "message": "Only JPEG, PNG, WebP, and GIF images are allowed"})

    content = file.file.read()
    if len(content) > settings.max_upload_size:
        raise HTTPException(status_code=422, detail={"code": "error.vision.too_large", "message": "File too large (max 10MB)"})

    filename, file_path = save_upload_file(content, file.filename or "upload.jpg")

    image = Image(
        user_id=current_user.id,
        filename=filename,
        original_filename=file.filename or "upload.jpg",
        file_path=file_path,
        mime_type=file.content_type,
        file_size=len(content),
    )
    db.add(image)
    db.flush()

    try:
        result = vision_service.process_image(file_path, current_user.preferred_language)
        image.vision_description = result.get("description", "")
        image.suggested_words = result.get("words", [])
        image.processed = True
    except Exception:
        image.processed = False

    db.commit()
    db.refresh(image)
    return ImageResponse.model_validate(image)


@router.get("/images", response_model=list[ImageResponse])
def list_images(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    images = db.query(Image).filter(Image.user_id == current_user.id).order_by(Image.created_at.desc()).all()
    return [ImageResponse.model_validate(img) for img in images]


@router.get("/images/{image_id}", response_model=ImageResponse)
def get_image(image_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    image = db.query(Image).filter(Image.id == image_id, Image.user_id == current_user.id).first()
    if not image:
        raise HTTPException(status_code=404, detail={"code": "error.vision.not_found", "message": "Image not found"})
    return ImageResponse.model_validate(image)


@router.post("/images/{image_id}/add-words", status_code=201)
def add_words_from_image(
    image_id: uuid.UUID,
    data: ImageAddWords,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    image = db.query(Image).filter(Image.id == image_id, Image.user_id == current_user.id).first()
    if not image:
        raise HTTPException(status_code=404, detail={"code": "error.vision.not_found", "message": "Image not found"})
    if not image.suggested_words:
        raise HTTPException(status_code=400, detail={"code": "error.vision.no_words", "message": "No suggested words available"})

    added = []
    for idx in data.word_indices:
        if idx < 0 or idx >= len(image.suggested_words):
            continue
        word_data = image.suggested_words[idx]
        vocab = Vocabulary(
            user_id=current_user.id,
            word=word_data.get("word", ""),
            translation=word_data.get("translation", ""),
            definition=word_data.get("definition"),
            source_language="en",
            target_language="zh",
            source="vision",
            image_id=image.id,
        )
        db.add(vocab)
        added.append(vocab)

    db.commit()
    return {"message": f"Added {len(added)} words to vocabulary", "count": len(added)}
