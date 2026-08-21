from uuid import UUID
from pydantic import BaseModel, Field
from app.models.enum import QuestionType
from app.schemas.question_option import OptionDisplay
from typing import Optional, List

class RubricCreate(BaseModel):
    title: str
    description: str | None = None
    percentage: float = 0.0

class RubricItem(BaseModel):
    criteria_id: UUID
    title: str
    description: str | None = None
    percentage: float = Field(default=0.0, validation_alias="max_score")

    class Config:
        from_attributes = True

class QuestionCreate(BaseModel):
    subject_id: UUID
    question_title: str
    question_type: QuestionType
    body_content: str | None = None
    max_points: float
    rubrics: list[RubricCreate] | None = None 

class QuestionUpdate(BaseModel):
    question_title: str | None = None
    body_content: str | None = None
    max_points: float | None = None
    rubrics: list[RubricCreate] | None = None
class QuestionItem(BaseModel):
    question_id: UUID
    question_title: str 
    question_type: QuestionType
    body_content: str | None = None
    max_points: float | None = None
    rubric_criterias: list[RubricItem] | None = None

    class Config:
        from_attributes = True

class QuestionDisplay(BaseModel):
    detail_id: UUID          # ID của SubmissionDetail dùng để gọi API PATCH đáp án
    question_id: UUID
    question_title: str
    question_type: QuestionType
    body_content: Optional[str] = None
    max_points: float        # Hiển thị điểm tối đa của câu hỏi
    options: List[OptionDisplay] = []

    # 🆕 Dùng cho câu hỏi chèn giữa video (Quiz.placement_type == IN_VIDEO)
    # Mốc giây trong video mà câu hỏi này sẽ được kích hoạt (None nếu quiz không phải IN_VIDEO)
    video_trigger_seconds: Optional[int] = None
    # 🆕 Prefill khi resume lại submission IN_PROGRESS đang dang dở (vd load lại trang giữa video)
    selected_option_id: Optional[UUID] = None
    # 🆕 True/False nếu câu này đã được chấm và trả lời đúng/sai, None nếu chưa trả lời hoặc là ESSAY
    is_answered_correct: Optional[bool] = None

class GenerateFillInBlankConfig(BaseModel):
    num_questions: int = Field(
        default=5, 
        ge=1, 
        le=5, 
        description="Số lượng câu hỏi cần tạo (từ 1 đến 5 câu)"
    )
    max_points: float = Field(
        default=1.0, 
        gt=0, 
        description="Điểm tối đa cho mỗi câu hỏi"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "num_questions": 5,
                "max_points": 1.0
            }
        }
    }