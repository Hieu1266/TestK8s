from pydantic import BaseModel
from uuid import UUID
from typing import Optional, List
from datetime import date
from app.schemas.lesson_resource import LessonResourceResponse
from app.schemas.enums import SubmissionStatus
from enum import Enum

class LessonCreate(BaseModel):
    module_id: UUID
    title: str
    video_url: str | None = None
    content_body: str | None = None
    duration_seconds: int | None = None
    order_index: int
    is_optional: bool | None = None
    is_slide_presentation: bool = False
    is_quiz: bool | None = None

class LessonUpdate(BaseModel):
    title: str | None = None
    video_url: str | None = None
    duration_seconds: int | None = None
    content_body: str | None = None
    order_index: int | None = None
    is_optional: bool | None = None
    is_slide_presentation: bool = False
    # ⚠️ Cố ý KHÔNG có field is_quiz: theo yêu cầu nghiệp vụ, một khi bài học đã được
    # tạo là bài thi (is_quiz=True) thì không được phép đổi lại qua API cập nhật.

class LessonLearningStructure(BaseModel):
    title: str
    lesson_id: UUID
    video_url: Optional[str] = None
    content_body: Optional[str] = None
    duration_seconds: int = 0 # Nếu thời gian bằng 0 nghĩa là bài giảng ko có video
    is_optional: bool
    is_slide_presentation: bool = False
    had_quiz: bool = False
    is_quiz: bool = False
    is_peer_review: Optional[bool] = False
    submit_status: Optional[SubmissionStatus] = None

# 🆕 Schema trả về cho trang Quản lý bài học (Instructor) - kèm danh sách tài nguyên đính kèm
class LessonManagementOut(BaseModel):
    lesson_id: UUID
    module_id: UUID
    title: str
    video_url: Optional[str] = None
    content_body: Optional[str] = None
    duration_seconds: int = 0
    order_index: int
    is_optional: bool
    is_slide_presentation: bool = False
    is_quiz: bool
    resources: List[LessonResourceResponse] = []

    class Config:
        from_attributes = True

class LessonFilterType(str, Enum):
    IN_VIDEO = "IN_VIDEO"                    # 1. Lesson có chứa Video (video_url)
    STANDALONE_LESSON = "STANDALONE_LESSON"  # 2. Lesson là Bài thi (is_quiz == True)
    INSIDE_LESSON = "INSIDE_LESSON"          # 3. Các bài đọc / văn bản còn lại
    
class LessonShortResponse(BaseModel):
    lesson_id: UUID
    title: str

    class Config:
        from_attributes = True

