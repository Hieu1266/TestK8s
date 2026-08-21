import uuid
from uuid import UUID
from datetime import date
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import Field, SQLModel, Relationship

if TYPE_CHECKING:
    from app.models.question_pool import QuestionPool
    from app.models.quiz import Quiz

    

class QuizPoolRule(SQLModel, table=True):
    __tablename__ = "quiz_pool_rule"

    rule_id: UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    
    # Khóa ngoại liên kết tới Quiz và QuestionPool
    quiz_id: UUID = Field(foreign_key="quiz.quiz_id", nullable=False, index=True, ondelete="CASCADE")
    pool_id: UUID = Field(foreign_key="question_pool.pool_id", nullable=False, index=True, ondelete="CASCADE")
    
    quantity: int = Field(default=1, nullable=False)          # Số lượng câu hỏi cần bốc ngẫu nhiên từ pool này
    
    # Quan hệ
    quiz: Optional["Quiz"] = Relationship(back_populates="pool_rules")
    pool: Optional["QuestionPool"] = Relationship(back_populates="pool_rules")