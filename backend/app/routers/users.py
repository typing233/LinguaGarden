from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate, PasswordChange
from app.utils.security import verify_password, hash_password

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
def update_me(data: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if data.display_name is not None:
        current_user.display_name = data.display_name
    if data.preferred_language is not None:
        current_user.preferred_language = data.preferred_language
    if data.avatar_url is not None:
        current_user.avatar_url = data.avatar_url
    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/me/password")
def change_password(data: PasswordChange, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail={"code": "error.auth.wrong_password", "message": "Current password is incorrect"})
    current_user.hashed_password = hash_password(data.new_password)
    db.commit()
    return {"message": "Password updated successfully"}
