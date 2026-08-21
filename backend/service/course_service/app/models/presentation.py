import uuid
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.lesson import Lesson
    from app.models.presentation_slide import PresentationSlide


class Presentation(SQLModel, table=True):
    __tablename__ = "presentation"

    presentation_id: UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    lesson_id: UUID = Field(
        foreign_key="lesson.lesson_id",
        nullable=False,
        unique=True,
        index=True,
    )
    title: Optional[str] = Field(default=None, max_length=255)

    lesson: Optional["Lesson"] = Relationship(back_populates="presentation")
    slides: List["PresentationSlide"] = Relationship(
        back_populates="presentation",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
            "order_by": "PresentationSlide.slide_order",
        },
    )