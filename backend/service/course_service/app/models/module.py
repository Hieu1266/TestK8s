from sqlmodel import Field, SQLModel, Relationship
from typing import Optional, TYPE_CHECKING, List
from uuid import UUID
import uuid

if TYPE_CHECKING:
    from app.models.subject import Subject 
    from app.models.lesson import Lesson

class Module(SQLModel, table=True):
    __tablename__ = "module"
    module_id: UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    subject_id: UUID = Field(foreign_key="subject.subject_id", nullable=False)
    title: str = Field(nullable=False, max_length=255)
    order_index: int = Field(default=1, nullable=False)

    # Quan hệ
    # Một module thuộc về một môn học
    subject: Optional["Subject"] = Relationship(back_populates="modules")
    lessons: List["Lesson"] = Relationship(
        back_populates="module",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "order_by": "Lesson.order_index"}
    )