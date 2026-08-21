import uuid
from uuid import UUID
from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel
from app.models.enum import LessonStatus
import httpx

class LessonProgress(SQLModel, table=True):
    __tablename__ = "lesson_progress"

    progress_id: UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: UUID = Field(nullable=False, index=True)       # Định danh học viên từ User Service
    course_id: UUID = Field(nullable=False)                 # Định danh khóa học từ Course Service
    lesson_id: UUID = Field(nullable=False, index=True)     # Định danh bài học từ Course Service
    
    status: LessonStatus = Field(default=LessonStatus.LOCKED) # Trạng thái học tập hiện tại của bài học
    
    quiz_passed: bool = Field(default=True)# Trạng thái vượt qua bài kiểm tra của bài học, nếu không có bài kiểm tra mặc định là True
    highest_quiz_score: Optional[float] = Field(default=None) # Điểm số bài kiểm tra cao nhất từng đạt được
    successful_submission_id: Optional[UUID] = Field(default=None) # Lượt nộp bài kiểm tra đạt điều kiện vượt qua bài học
    
    updated_at: datetime = Field(default_factory=datetime.utcnow)   # Ngày cuối cùng cập nhật tiến độ bài học