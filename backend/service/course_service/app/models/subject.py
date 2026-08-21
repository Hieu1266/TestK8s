from sqlmodel import Field, SQLModel, Relationship
from typing import Optional, TYPE_CHECKING, List
from uuid import UUID
from app.schemas.enums import SubjectStatus
import uuid
from sqlalchemy import Enum

if TYPE_CHECKING:
    from app.models.course import Course
    from app.models.syllabus import Syllabus
    from app.models.module import Module

class Subject(SQLModel, table=True):
    __tablename__ = "subject"

    subject_id: UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False
    )
    course_id: UUID = Field(foreign_key="course.course_id", nullable=False)
    title: str = Field(nullable=False, max_length=255)
    description: str = Field(nullable=False)
    order_index: int = Field(default=1, nullable=False)
    status_id: SubjectStatus = Field(
        sa_type=Enum(SubjectStatus),
        nullable=False
    )

    # Quan hệ
    # Một môn học thuộc về một khóa học
    course: Optional["Course"] = Relationship(back_populates="subjects")
    # Một môn học có một đề cương môn học
    syllabus: Optional["Syllabus"] = Relationship(back_populates="subject", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    # Một môn học có 1 hoặc nhiều module
    modules: List["Module"] = Relationship(
        back_populates="subject",
        sa_relationship_kwargs={"order_by": "Module.order_index"}
    )