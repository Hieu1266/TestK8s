import uuid
from uuid import UUID
from datetime import date
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import Field, SQLModel, Relationship
from app.models.question_pool_link import QuestionPoolLink

if TYPE_CHECKING:
    from app.models.question import Question  
    from app.models.quiz_pool_rule import QuizPoolRule

class QuestionPool(SQLModel, table=True):
    __tablename__ = "question_pool"

    pool_id: UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    owner_id: UUID = Field(nullable=False)
    subject_id: UUID = Field(nullable=False, index=True)  
    title: str = Field(nullable=False, max_length=255)
    description: Optional[str] = Field(default=None)
    created_at: date = Field(default_factory=date.today)

    questions: List["Question"] = Relationship(
        back_populates="pools", 
        link_model=QuestionPoolLink  
    )
    
    pool_rules: List["QuizPoolRule"] = Relationship(back_populates="pool")