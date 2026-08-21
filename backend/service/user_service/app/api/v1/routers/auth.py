from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from app.api.v1.deps import SessionDep
from app.crud.user import crud_user
from app.schemas.user import UserCreate
from app.core.config import settings
from app.core.security import create_access_token, verify_password, hash_password
from app.crud.role import crud_role

router = APIRouter()

@router.post("/register")
def register(
        session: SessionDep,
        new_user: UserCreate
):
    existing_user = crud_user.get_by_email(session, email=new_user.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email đã tồn tại"
        )
    new_user.password = hash_password(new_user.password)

    db_user = crud_user.create(session, new_user)
    session.commit() 
    session.refresh(db_user)
    return {
        "message": "Tạo tài khoản thành công"
    }

@router.post("/login")
def login(
    session: SessionDep,
    user: OAuth2PasswordRequestForm = Depends()
):
    existing_user = crud_user.get_by_email(session, email=user.username)
    if not existing_user or not verify_password(user.password, existing_user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu sai hoặc người dùng không tồn tại"
        )
        
    role_name = crud_role.get_name_by_id(session, existing_user.role_id) or "User"
    token_data = {
        "sub": str(existing_user.user_id),
        "username": existing_user.username,
        "role_name": role_name
    }
    access_token = create_access_token(token_data)
    return{
        "message": "Đăng nhập thành công",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "username": existing_user.username,
            "email": existing_user.email,
            "role": role_name
        }
    }
