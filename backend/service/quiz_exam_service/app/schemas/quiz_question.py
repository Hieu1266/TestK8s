from pydantic import BaseModel
from uuid import UUID

class QuizQuestionCreate(BaseModel):
    quiz_id: UUID
    question_id: UUID
    video_trigger_seconds: int | None = None
    order_index: int

class QuizQuestionUpdate(BaseModel):
    video_trigger_seconds: int | None = None
    order_index: int | None = None