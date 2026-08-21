import uuid
from uuid import UUID
from typing import Optional, TYPE_CHECKING
from sqlmodel import Field, SQLModel, Relationship

if TYPE_CHECKING:
    from app.models.lesson import Lesson

class LessonResource(SQLModel, table=True):
    __tablename__ = "lesson_resource"

    resource_id: UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    lesson_id: UUID = Field(foreign_key="lesson.lesson_id", nullable=False)
    
    file_name: str = Field(nullable=False, max_length=255)
    file_path: str = Field(nullable=False, max_length=500)
    file_extension: str = Field(nullable=False, max_length=10) # pdf, zip, docx...

    lesson: Optional["Lesson"] = Relationship(back_populates="resources")