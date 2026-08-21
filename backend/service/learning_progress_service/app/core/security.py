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



# def call_get_usernames_service(tester_ids: list[UUID]) -> dict[str, str]:
#     USER_SERVICE_URL = settings.BACKEND_USER_URL
#     result: dict[str, str] = {}

#     timeout = httpx.Timeout(connect=3.0, read=3.0, write=3.0, pool=3.0)

#     with httpx.Client(timeout=timeout) as client:
#         for tester_id in tester_ids:
#             try:
#                 response = client.get(f"{USER_SERVICE_URL}/get-name/{tester_id}")
#                 if response.status_code == 200:
#                     result[str(tester_id)] = response.json() or "Không rõ"
#                 else:
#                     result[str(tester_id)] = "Không rõ"
#             except httpx.RequestError as exc:
#                 print(f"[CẢNH BÁO] Không gọi được User Service cho tester {tester_id}: {exc}")
#                 result[str(tester_id)] = "Không rõ"

#     return result


def call_get_usernames_service(tester_ids: list[UUID], token: str = None) -> dict[str, str]:
    USER_SERVICE_URL = settings.BACKEND_USER_URL
    result: dict[str, str] = {}

    timeout = httpx.Timeout(connect=3.0, read=3.0, write=3.0, pool=3.0)
    
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    with httpx.Client(timeout=timeout, headers=headers) as client:
        for tester_id in tester_ids:
            try:

                response = client.get(f"{USER_SERVICE_URL}/get-user/{tester_id}")
                
                if response.status_code == 200:
                    data = response.json()
                    # 2. Bóc tách trường chứa tên (ví dụ: full_name hoặc username)
                    user_name = data.get("full_name") or data.get("username") or "Không rõ"
                    result[str(tester_id)] = user_name
                else:
                    print(f"[CẢNH BÁO] API trả về status: {response.status_code} cho tester {tester_id}")
                    result[str(tester_id)] = "Không rõ"
            except httpx.RequestError as exc:
                print(f"[LỖI KẾT NỐI] Không gọi được User Service cho tester {tester_id}: {exc}")
                result[str(tester_id)] = "Không rõ"

    return result



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