import uuid
from uuid import UUID
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import Field, SQLModel, Relationship

if TYPE_CHECKING:
    from app.models.peer_review_assignments import PeerReviewAssignment
    from app.models.rubric_criteria import RubricCriteria

class PeerReviewEvaluation(SQLModel, table=True):
    __tablename__ = "peer_review_evaluations"

    evaluation_id: UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    assignment_id: UUID = Field(foreign_key="peer_review_assignments.assignment_id", nullable=False, ondelete="CASCADE")
    criteria_id: UUID = Field(foreign_key="rubric_criteria.criteria_id", nullable=False, ondelete="CASCADE")
    
    score: float = Field(nullable=False)             # Điểm số cho riêng tiêu chí này
    feedback: Optional[str] = Field(default=None)    # Nhận xét cho riêng tiêu chí này

    # Quan hệ
    assignment: "PeerReviewAssignment" = Relationship(back_populates="evaluations")
    criteria: "RubricCriteria" = Relationship(back_populates="evaluations")