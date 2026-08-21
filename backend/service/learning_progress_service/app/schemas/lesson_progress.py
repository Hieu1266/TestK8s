from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional
from app.models.enum import LessonStatus

# Dùng khi khởi tạo tiến độ cho một danh sách bài học (khi học viên ấn Enroll khóa học)
class LessonProgressCreate(BaseModel):
    course_id: UUID
    lesson_id: UUID

# Dùng khi cập nhật trạng thái học tập thủ công hoặc tự động
class LessonProgressUpdate(BaseModel):
    status: Optional[LessonStatus] = None
    quiz_passed: Optional[bool] = None
    highest_quiz_score: Optional[float] = None
    successful_submission_id: Optional[UUID] = None

# Cập nhật kết quả làm bài Quiz độc lập từ Quiz/Submission Service
class LessonQuizSubmitUpdate(BaseModel):
    quiz_score: float
    submission_id: UUID
    passing_score: float # Điểm điều kiện để vượt qua (Ví dụ: 8.0)

# Dữ liệu trả về cho Client
class LessonProgressResponse(BaseModel):
    progress_id: UUID
    user_id: UUID
    course_id: UUID
    lesson_id: UUID
    status: LessonStatus
    quiz_passed: bool
    highest_quiz_score: Optional[float] = None
    successful_submission_id: Optional[UUID] = None
    updated_at: datetime

    class Config:
        from_attributes = True

class LessonStatusResponse(BaseModel):
    lesson_id: str
    status: Optional[LessonStatus] = LessonStatus.LOCKED