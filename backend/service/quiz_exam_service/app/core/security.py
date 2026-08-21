from fastapi.security import OAuth2PasswordBearer
from fastapi import HTTPException, Depends, status
import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
from app.core.config import settings
import httpx
from uuid import UUID

authServer = settings.BACKEND_USER_URL + "/login"
# Khai báo đường dẫn lấy token, FastAPI sẽ tự động hiển thị nút Authorize trên giao diện Swagger UI Docs
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=authServer)

def create_access_token(data: dict) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.ACCESS_TOKEN_EXPIRE_DAYS)
    data.update({"exp": expire})
    encode_data = jwt.encode(data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encode_data

def get_current_user_role(
    token: str = Depends(oauth2_scheme)
) -> dict:
    try:
        # Giải mã token 
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        
        user_id: str = payload.get("sub")
        role_name: str = payload.get("role_name")

        if user_id is None or role_name is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Token không hợp lệ hoặc thiếu thông tin phân quyền"
            )
            
        return {"user_id": user_id, "role_name": role_name}
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Token đã hết hạn, vui lòng đăng nhập lại"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Token không hợp lệ"
        )
    
def call_check_instructor_service(instructor_id: UUID, subject_id: UUID) -> bool:
    # URL của Course Service (Thay đổi host/port cho đúng với môi trường của bạn)
    COURSE_SERVICE_URL = settings.BACKEND_COURSE_URL
    
    # Chuẩn bị Query Parameters đúng định dạng mà Course Service yêu cầu
    params = {
        "instructor_id": str(instructor_id),
        "subject_id": str(subject_id)
    }
    
    try:
        with httpx.Client() as client:
            response = client.get(f"{COURSE_SERVICE_URL}/syllabus/check-instructor", params=params, timeout=5.0)
            
            if response.status_code == 200:
                return response.json()  # Trả về True hoặc False từ Course Service
                
            return False
    except httpx.RequestError as exc:
        print(f"Lỗi kết nối liên dịch vụ (Course Service): {exc}")
        # Nếu service kia sập, an toàn nhất là chặn lại và báo lỗi hệ thống
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Hệ thống xác thực môn học đang bận, vui lòng thử lại sau."
        )
    
class RoleChecker:
    def __init__(self, allowed_roles: list[str]):
        # Khởi tạo danh sách các Role được phép truy cập API này
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: dict = Depends(get_current_user_role)) -> dict:
        # Kiểm tra role có nằm trong danh sách cho phép không
        if current_user["role_name"] not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Quyền truy cập bị từ chối! Bạn cần quyền: {', '.join(self.allowed_roles)}"
            )
        return current_user