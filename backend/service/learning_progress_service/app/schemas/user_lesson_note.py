from uuid import UUID
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

# 1. Schema dữ liệu Client gửi lên khi tạo Note
class NoteIn(BaseModel):
    course_id: UUID
    lesson_id: UUID
    timestamp_seconds: Optional[int] = Field(
        default=None, 
        ge=0, 
        description="Mốc thời gian video (giây), không được âm"
    )
    content: str = Field(
        ..., 
        min_length=1, 
        description="Nội dung ghi chú, không được để rỗng"
    )

# 2. Schema truyền vào tầng CRUD (Kế thừa NoteIn và bổ sung user_id từ Token)
class NoteCreate(NoteIn):
    user_id: UUID

# 3. Schema dữ liệu Client gửi lên khi Cập nhật Note (Cho phép cập nhật từng phần)
class NoteUpdate(BaseModel):
    content: Optional[str] = Field(default=None, min_length=1)
    timestamp_seconds: Optional[int] = Field(default=None, ge=0)
    # Đã bỏ updated_at vì Backend/DB tự xử lý

# 4. Schema dữ liệu trả về cho Client (Response)
class NoteResponse(BaseModel):
    note_id: UUID
    timestamp_seconds: Optional[int] = None
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True  # Giúp Pydantic ép kiểu trực tiếp từ đối tượng SQLModel/SQLAlchemy