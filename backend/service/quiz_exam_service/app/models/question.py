import uuid
from uuid import UUID
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import Field, SQLModel, Relationship
from app.models.enum import QuestionType
from app.models.question_pool_link import QuestionPoolLink 

if TYPE_CHECKING:
    from app.models.rubric_criteria import RubricCriteria
    from app.models.question_option import QuestionOption
    from app.models.submission_detail import SubmissionDetail
    from app.models.quiz_question import QuizQuestion
    from app.models.question_pool import QuestionPool  # Giữ ở đây để tránh circular import

class Question(SQLModel, table=True):
    __tablename__ = "question"

    question_id: UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    subject_id: UUID = Field(nullable=False)
    question_title: str = Field(nullable=False)
    question_type: QuestionType = Field(nullable=False)
    body_content: str = Field(nullable=True)
    max_points: float = Field(default=1.0, nullable=True)

    # Quan hệ
    quiz_questions: List["QuizQuestion"] = Relationship(back_populates="question")
    options: List["QuestionOption"] = Relationship(back_populates="question")
    submission_details: List["SubmissionDetail"] = Relationship(back_populates="question")
    rubric_criterias: List["RubricCriteria"] = Relationship(back_populates="question")
    pools: List["QuestionPool"] = Relationship(
        back_populates="questions", 
        link_model=QuestionPoolLink  
    )