import uuid
from uuid import UUID
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.peer_review_evaluations import PeerReviewEvaluation
    from app.models.question import Question


class RubricCriteria(SQLModel, table=True):
    __tablename__ = "rubric_criteria"

    criteria_id: UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    question_id: Optional[UUID] = Field(
        default=None, 
        foreign_key="question.question_id", 
        ondelete="CASCADE"
    )
    
    title: str = Field(nullable=False)
    description: Optional[str] = Field(default=None)
    
    percentage: float = Field(default=0.0, nullable=False)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    question: Optional["Question"] = Relationship(back_populates="rubric_criterias")
    evaluations: List["PeerReviewEvaluation"] = Relationship(back_populates="criteria") 