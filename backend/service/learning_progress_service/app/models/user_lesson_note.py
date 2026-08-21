import uuid
from uuid import UUID
from typing import Optional
from datetime import datetime
from sqlmodel import Field, SQLModel

class UserLessonNote(SQLModel, table=True):
    __tablename__ = "user_lesson_note"

    note_id: UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: UUID = Field(nullable=False, index=True)       # Định danh học viên tạo ghi chú từ User Service
    course_id: UUID = Field(nullable=False, index=True)     # Định danh khóa học từ Course Service
    lesson_id: UUID = Field(nullable=False, index=True)     # Định danh bài học từ Course Service
    
    timestamp_seconds: Optional[int] = Field(nullable=True)          # Mốc thời gian của dòng video khi học viên bấm tạo ghi chú
    content: str = Field(nullable=False)                    # Nội dung văn bản ghi chú của học viên
    
    created_at: datetime = Field(default_factory=datetime.utcnow)    # Ngày tạo bản ghi chú
    updated_at: datetime = Field(default_factory=datetime.utcnow)    # Ngày chỉnh sửa ghi chú gần nhất