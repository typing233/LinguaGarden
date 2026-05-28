import os
import uuid
from pathlib import Path

from app.config import settings


def get_upload_dir() -> Path:
    path = Path(settings.upload_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


def save_upload_file(file_content: bytes, original_filename: str) -> tuple[str, str]:
    ext = os.path.splitext(original_filename)[1].lower()
    filename = f"{uuid.uuid4().hex}{ext}"
    upload_dir = get_upload_dir()
    file_path = upload_dir / filename
    file_path.write_bytes(file_content)
    return filename, str(file_path)
