import uuid
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlalchemy import Column, Text
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.presentation import Presentation


class PresentationSlide(SQLModel, table=True):
    __tablename__ = "presentation_slide"

    slide_id: UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    presentation_id: UUID = Field(
        foreign_key="presentation.presentation_id",
        nullable=False,
        index=True,
    )
    title: Optional[str] = Field(default=None, max_length=150)
    content_body: str = Field(sa_column=Column(Text, nullable=False))
    slide_order: int = Field(nullable=False, ge=1)

    presentation: Optional["Presentation"] = Relationship(back_populates="slides")