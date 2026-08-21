import uuid
from uuid import UUID
from typing import Optional, TYPE_CHECKING
from sqlmodel import Field, SQLModel, Relationship
from app.models.enum import StructurePart, CommentStatus

if TYPE_CHECKING:
    from app.models.course_enrollment import CourseEnrollment

class Comment(SQLModel, table=True):
    __tablename__ = "comment"
    comment_id: UUID = Field(primary_key=True, default_factory=uuid.uuid4)
    enrollment_id: UUID = Field(
        foreign_key="course_enrollment.enrollment_id",
        nullable=False,
        index=True
    )
    tester_id: UUID = Field(nullable=False)
    structure_part: StructurePart = Field(nullable=False, default=StructurePart.COURSE)
    part_id: UUID = Field(nullable=False)
    title: str = Field(max_length=255, nullable=False)
    comment: str = Field(nullable=False)
    status: CommentStatus = Field(nullable=False, default=CommentStatus.PENDING)

    enrollment: Optional["CourseEnrollment"] = Relationship(back_populates="comments")