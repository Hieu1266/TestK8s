from pydantic import BaseModel, EmailStr, model_validator
from pydantic_core import PydanticCustomError
from typing import Self
from uuid import UUID
from datetime import date, datetime

class TokenBody(BaseModel):
    token: str

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role_id: int | None = None

class UserUpdate(BaseModel):
    role_id: int | None = None
    username: str | None = None
    password: str | None = None
    birthdate: date | None = None
    status_id: str | None = None

class UserInfoUpdate(BaseModel):
    username: str | None = None
    birthdate: date | None = None

class UserRoleUpdate(BaseModel):
    role_id: int

class UserStatusUpdate(BaseModel):
    status_id: str

# Thông tin tổng quan của người dùng, hiển thị trên bảng quản lý của admin
class UserGeneralInfo(BaseModel):
    user_id: UUID
    role_name: str
    username: str
    email: EmailStr
    birthdate: datetime | None = None
    created_at: datetime 
    status_id: str
    display_status: str

class UserDataInfo(BaseModel):
    role_name: str
    username: str
    email: EmailStr
    created_at: datetime 
    display_status: str
    birthdate: date

# Thông tin chi tiết người dùng, hiển thị trong phần hồ sơ chi tiết 
class UserDetailInfo(BaseModel):
    user_id: UUID 
    role_name: str
    username: str 
    email: EmailStr 
    password: str 
    birthdate: date | None = None
    created_at: datetime 
    status_id: str 

class UserListQuery(BaseModel):
    skip: int
    limit: int

    # Bộ lọc lấy theo status hoặc role của người dùng
    status_id: str | None = None
    role_id: int | None = None
    
