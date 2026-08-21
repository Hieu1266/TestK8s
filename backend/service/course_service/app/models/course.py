from sqlmodel import Field, SQLModel, Relationship
from typing import Optional, List, TYPE_CHECKING
from app.models.curriculum import CourseType
from app.models.course_tag_link import CourseTagLink
from app.schemas.enums import CourseStatus
from uuid import UUID
from datetime import date
import uuid
from sqlalchemy import Enum

if TYPE_CHECKING:
    from app.models.tag import Tag
    from app.models.subject import Subject
    from app.models.curriculum import Curriculum
    from app.models.course_instructor_link import CourseInstructorLink

class Course(SQLModel, table=True):
    __tablename__ = "course"

    course_id: UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True, 
        index=True,
        nullable=False
    )
    curriculum_id: UUID = Field(
        foreign_key="curriculum.curriculum_id", 
        nullable=False, 
        unique=True,
    )
    instructor_id: Optional[UUID] = Field(default=None, nullable=True)
    title: str = Field(nullable=False, max_length=255)
    course_type: CourseType = Field(nullable=False)
    description: Optional[str] = Field(default=None)
    price: int = Field(default=0)
    created_at: date = Field(default_factory=date.today)
    status_id: CourseStatus = Field(
        sa_type=Enum(CourseStatus),
        nullable=False
    )
    total_lessons: int = Field(default=0, nullable=False)

    # Quan hệ
    # Một khóa học có thể không có hoặc có nhiều giảng viên
    course_instructors: List["CourseInstructorLink"] = Relationship(
        back_populates="course",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    # Một khóa học có một chương trình đào tạo
    curriculum: Optional["Curriculum"] = Relationship(back_populates="course")
    # Một khóa học có một hoặc nhiều tag
    tags: List["Tag"] = Relationship(back_populates="courses", link_model=CourseTagLink)
    # Một khóa học có một hoặc nhiều môn học
    subjects: List["Subject"] = Relationship(
        back_populates="course",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",  # Khi xóa Course -> Tự động xóa sạch các Subject liên quan
            "order_by": "Subject.order_index"
        }
    )
