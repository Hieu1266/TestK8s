# app/models/course_instructor_link.py
import uuid
from uuid import UUID
from sqlmodel import Field, SQLModel, Relationship
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.course import Course

class CourseInstructorLink(SQLModel, table=True):
    __tablename__ = "course_instructor_link"

    course_id: UUID = Field(
        foreign_key="course.course_id", 
        primary_key=True, 
        nullable=False
    )

    instructor_id: UUID = Field(
        primary_key=True, 
        nullable=True, 
        index=True
    )

    course: Optional["Course"] = Relationship(back_populates="course_instructors")