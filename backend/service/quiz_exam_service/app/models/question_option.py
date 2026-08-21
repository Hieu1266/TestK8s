import uuid
from uuid import UUID
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import Field, SQLModel, Relationship

if TYPE_CHECKING:
    from app.models.question import Question

# Model các lựa chọn câu trả lời trong câu hỏi trắc nghiệm
class QuestionOption(SQLModel, table=True):
    __tablename__ = "question_option"

    option_id: UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    question_id: UUID = Field(foreign_key="question.question_id", nullable=False, ondelete="CASCADE")
    
    option_text: str = Field(nullable=False) # Nội dung đáp án (Ví dụ: "A. f(x) = 2x")
    is_correct: bool = Field(default=False, nullable=False) # Có phải đáp án đúng không

    # Quan hệ
    question: Optional["Question"] = Relationship(back_populates="options")