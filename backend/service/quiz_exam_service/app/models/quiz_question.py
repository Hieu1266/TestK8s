import uuid
from uuid import UUID
from sqlmodel import Field, SQLModel, Relationship
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.quiz import Quiz
    from app.models.question import Question

class QuizQuestion(SQLModel, table=True):
    __tablename__ = "quiz_question"

    # Thêm ondelete="CASCADE" vào foreign_key
    quiz_id: UUID = Field(
        foreign_key="quiz.quiz_id", 
        primary_key=True, 
        nullable=False,
        ondelete="CASCADE"
    )
    question_id: UUID = Field(foreign_key="question.question_id", primary_key=True, nullable=False, ondelete="CASCADE")
    video_trigger_seconds: Optional[int] = Field(default=None) # Mốc giây kích hoạt đề thi tự động trong video bài giảng
    order_index: int = Field(default=1, nullable=False)    # Thứ tự hiển thị của câu hỏi trong riêng đề thi này

    # Quan hệ cấu trúc liên kết trung gian
    quiz: Optional["Quiz"] = Relationship(back_populates="quiz_questions")
    question: Optional["Question"] = Relationship(back_populates="quiz_questions")