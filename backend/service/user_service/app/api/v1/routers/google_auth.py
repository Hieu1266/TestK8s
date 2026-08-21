from fastapi import APIRouter, HTTPException, status, Depends
from app.api.v1.deps import SessionDep
from app.crud.user import crud_user
from app.crud.role import crud_role
from app.schemas.user import TokenBody
from app.core.security import create_access_token, verify_google_token, hash_password
from app.models.profile import Profile
from sqlmodel import select
import uuid

router = APIRouter()

# ==========================================
# 1. API: ĐĂNG NHẬP BẰNG GOOGLE
# ==========================================
@router.post("/auth/google/login")
def google_login(session: SessionDep, body: TokenBody):
    payload = verify_google_token(body.token)
    if not payload:
        raise HTTPException(status_code=400, detail="Mã xác thực Google không hợp lệ hoặc hết hạn")
        
    email = payload.get("email")
    
    # KIỂM TRA: Nếu KHÔNG tồn tại email này trong hệ thống -> Báo lỗi ngay không cho đăng nhập
    existing_user = crud_user.get_by_email(session, email=email)
    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tài khoản Google này chưa được đăng ký trên hệ thống. Vui lòng chọn Đăng ký!"
        )
        
    if existing_user.status_id == "BANNED": 
        raise HTTPException(status_code=403, detail="Tài khoản này hiện đang bị khóa")

    # Cấp token hệ thống như bình thường
    role_name = crud_role.get_name_by_id(session, existing_user.role_id) or "User"
    token_data = {"sub": str(existing_user.user_id), "username": existing_user.username, "role_name": role_name}
    access_token = create_access_token(token_data)
    
    return {
        "message": "Đăng nhập bằng Google thành công",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"username": existing_user.username, "email": existing_user.email, "role": role_name}
    }


# ==========================================
# 2. API:ĐĂNG KÝ BẰNG GOOGLE (CHẶN TRÙNG EMAIL)
# ==========================================
@router.post("/auth/google/register")
def google_register(session: SessionDep, body: TokenBody):
    payload = verify_google_token(body.token)
    if not payload:
        raise HTTPException(status_code=400, detail="Mã xác thực Google không hợp lệ hoặc hết hạn")
        
    # CHUẨN HÓA: Ép email về chữ thường và loại bỏ khoảng trắng thừa
    email = payload.get("email").strip().lower()
    print(email)
    
    # KIỂM TRA TRÙNG EMAIL: Nếu email ĐÃ tồn tại -> Chặn lại và báo lỗi 400
    existing_user = crud_user.get_by_email(session, email=email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email này đã được đăng ký trong hệ thống. Vui lòng sử dụng chức năng Đăng nhập!"
        )
        
    # Tiến hành tạo mới tài khoản nếu kiểm tra trùng đạt yêu cầu
    try:
        full_name = payload.get("name") or payload.get("given_name", "")
        picture = payload.get("picture")
        default_username = email.split("@")[0]
        
        # Khởi tạo User mới (Sử dụng pass ngẫu nhiên phòng hờ DB bắt buộc NOT NULL)
        db_user = crud_user.model(
            role_id=2, # Mặc định Student/User thường
            username=default_username[:50],
            email=email,
            password=hash_password(str(uuid.uuid4())),
            birthdate=None
        )
        session.add(db_user)
        session.flush() # Lấy ID tạm thời cho Profile

        # Xử lý tách họ tên cho Profile
        name_parts = full_name.strip().split(" ")
        firstname = name_parts[-1] if len(name_parts) > 1 else (full_name if full_name else default_username)
        lastname = " ".join(name_parts[:-1]) if len(name_parts) > 1 else None

        auto_profile = Profile(
            user_id=db_user.user_id,
            firstname=firstname[:50],
            lastname=lastname[:50] if lastname else None,
            bio="Tài khoản tạo qua Google Auth.",
            avatar_url=picture
        )
        session.add(auto_profile)
        session.commit()
        session.refresh(db_user)

        return {
          "status": "success",
          "message": "Đăng ký tài khoản bằng Google thành công! Vui lòng quay lại trang Đăng nhập.",
          "user": {
              "username": db_user.username, 
              "email": db_user.email
          }
        }
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống khởi tạo tài khoản: {str(e)}")