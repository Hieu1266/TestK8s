import uuid
from uuid import UUID
from datetime import date
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import Field, SQLModel, Relationship
from app.models.enum import QuizPlacementType, QuizType

if TYPE_CHECKING:
    from app.models.quiz_submission import QuizSubmission
    from app.models.rubric_criteria import RubricCriteria
    from app.models.peer_review_assignments import PeerReviewAssignment
    from app.models.quiz_question import QuizQuestion
    from app.models.quiz_pool_rule import QuizPoolRule

class Quiz(SQLModel, table=True):
    __tablename__ = "quiz"

    quiz_id: UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    subject_id: UUID = Field(nullable=False, index=True)
    title: str = Field(nullable=False, max_length=255)
    description: Optional[str] = Field(default=None)
    duration_minutes: int = Field(default=15, nullable=False)
    passing_percentage: Optional[float] = Field(default=5.0)
    max_attempts: int = Field(default=3, nullable=False)
    
    # Loại đề thi (RANDOM_QUESTION hoặc FIXED_QUESTION)
    quiz_type: QuizType = Field(default=QuizType.FIXED_QUESTION, nullable=False)
    
    placement_type: QuizPlacementType = Field(default=QuizPlacementType.STANDALONE_LESSON)
    target_lesson_id: Optional[UUID] = Field(default=None, index=True)
    is_active: bool = Field(default=True, nullable=False)
    is_peer_review: bool = Field(default=False, nullable=False)
    created_at: date = Field(default_factory=date.today)

    # Quan hệ nội bộ phân hệ (Đã thêm cascade delete)
    quiz_questions: List["QuizQuestion"] = Relationship(
        back_populates="quiz",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    ) # FIXED_QUESTION
    
    pool_rules: List["QuizPoolRule"] = Relationship(
        back_populates="quiz",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )     # RANDOM_QUESTION
    
    submissions: List["QuizSubmission"] = Relationship(
        back_populates="quiz",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    
    peer_assignments: List["PeerReviewAssignment"] = Relationship(
        back_populates="quiz",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )