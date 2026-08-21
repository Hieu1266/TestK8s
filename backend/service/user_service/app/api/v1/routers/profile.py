from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from uuid import UUID

from app.api.v1.deps import SessionDep
from app.core.security import get_current_user_role
from app.schemas.profile import ProfileUpdate, ProfileInfo
from app.crud.profile import crud_profile
from app.crud.user import crud_user

router = APIRouter()

@router.patch("/update-profile")
def update_profile(
    profile_update: ProfileUpdate,
    session: SessionDep,
    current_user: dict = Depends(get_current_user_role)
):
    user = current_user["user_id"]
    # Lấy profile theo profile_id
    db_profile = crud_profile.get_by_user_id(session, user)
    if db_profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hồ sơ không tồn tại"
        )

    # Kiểm tra quyền: chính chủ hoặc Admin
    is_owner = str(current_user["user_id"]) == str(db_profile.user_id)
    is_admin = str(current_user["role_name"]) == "Admin"
    if not is_owner and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Không có quyền chỉnh sửa hồ sơ"
        )

    # Cập nhật profile
    updated_profile = crud_profile.update(session, db_profile, profile_update)

    return {
        "message": "Cập nhật hồ sơ thành công!",
        "profile": updated_profile
    }

@router.get("/get-profile", response_model=ProfileInfo)
def get_profile(
    session: SessionDep,
    current_user: dict = Depends(get_current_user_role)
):
    user = current_user["user_id"]
    # Lấy profile theo user_id
    db_profile = crud_profile.get_by_user_id(session, user)
    if db_profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hồ sơ không tồn tại"
        )
    db_user = crud_user.get_by_id(session, user)
    # Kiểm tra quyền: chính chủ hoặc Admin mới được phép xem
    is_owner = str(current_user["user_id"]) == str(db_profile.user_id)
    is_admin = str(current_user["role_name"]) == "Admin"
    print(db_user.birthdate)
    result = ProfileInfo(
        birthdate=db_user.birthdate,
        avatar_url=db_profile.avatar_url,
        bio=db_profile.bio,
        firstname=db_profile.firstname,
        lastname=db_profile.lastname
    )
    if not is_owner and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Không có quyền xem hồ sơ"
        )

    return result