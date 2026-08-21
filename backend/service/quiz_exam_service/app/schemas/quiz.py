from pydantic import BaseModel
from uuid import UUID
from app.models.enum import QuizPlacementType, QuizType
from datetime import date
from app.schemas.question import QuestionItem, QuestionDisplay
from typing import List

class QuizCreate(BaseModel):
    title: str
    description: str
    subject_id: UUID
    duration_minutes: int
    passing_percentage: float | None = None
    max_attempts: int
    quiz_type: QuizType
    placement_type: QuizPlacementType
    target_lesson_id: UUID | None = None
    is_peer_review: bool

class QuizUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    duration_minutes: int | None = None
    passing_percentage: float | None = None
    max_attempts: int | None = None
    placement_type: QuizPlacementType | None = None
    target_lesson_id: UUID | None = None
    is_active: bool | None = None
    # ⚠️ Trước đây thiếu "| None = None" -> bắt buộc phải gửi field này ở MỌI request PUT dù không đổi
    is_peer_review: bool | None = None

class QuizItem(BaseModel):
    quiz_id: UUID
    subject_id: UUID
    title: str 
    description: str 
    duration_minutes: int 
    passing_percentage: float 
    max_attempts: int
    quiz_type: QuizType
    placement_type: QuizPlacementType
    target_lesson_id: UUID | None = None
    is_active: bool 
    created_at: date
    is_peer_review: bool
 
    class Config:
        from_attributes = True


# 🆕 1 câu hỏi cố định đã gán vào đề thi (kèm order_index/video_trigger_seconds riêng của quiz này)
class QuizFixedQuestionItem(BaseModel):
    question_id: UUID
    order_index: int
    video_trigger_seconds: int | None = None
    question: QuestionItem

    class Config:
        from_attributes = True


# 🆕 1 luật bốc pool ngẫu nhiên đã gán vào đề thi
class QuizPoolRuleItem(BaseModel):
    rule_id: UUID
    pool_id: UUID
    quantity: int
    pool_title: str
    pool_total_questions: int

    class Config:
        from_attributes = True


# 🆕 Chi tiết đầy đủ 1 quiz - dùng cho trang cấu hình đề thi
class QuizDetail(QuizItem):
    fixed_questions: list[QuizFixedQuestionItem] = []
    pool_rules: list[QuizPoolRuleItem] = []


# 🆕 Payload sắp xếp lại thứ tự câu hỏi cố định (kéo thả / nút lên-xuống)
class QuizQuestionReorderItem(BaseModel):
    question_id: UUID
    order_index: int

class QuizTakeResponse(BaseModel):
    submission_id: UUID
    quiz_id: UUID
    title: str
    quiz_type: QuizType
    attempt_number: int
    questions: List[QuestionDisplay]