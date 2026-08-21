from pydantic import BaseModel
from uuid import UUID

class QuestionOptionCreate(BaseModel):
    question_id: UUID
    option_text: str
    is_correct: bool

class QuestionOptionUpdate(BaseModel):
    option_id: UUID
    option_text: str | None = None
    is_correct: bool | None = None

#Khung mẫu nhận vào dữ liệu từ FE để tạo question và opt cùng lúc
class QuestionOptionAutoCreate(BaseModel):
    option_text: str
    is_correct: bool

class QuestionOptionItem(BaseModel):
    option_id: UUID
    option_text: str
    is_correct: bool

class OptionDisplay(BaseModel):
    option_id: UUID
    option_text: str
