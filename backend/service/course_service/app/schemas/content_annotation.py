from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class AnnotationContentType(str, Enum):
    LESSON_CONTENT = "LESSON_CONTENT"
    PRESENTATION_SLIDE = "PRESENTATION_SLIDE"


class ContentAnnotationCreate(BaseModel):
    content_type: AnnotationContentType
    content_id: UUID

    selected_text: str = Field(
        min_length=1,
        max_length=255,
    )

    title: str = Field(
        min_length=1,
        max_length=255,
    )

    description: str = Field(
        min_length=1,
    )

    @field_validator(
        "selected_text",
        "title",
        "description",
    )
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        cleaned = value.strip()

        if not cleaned:
            raise ValueError(
                "Nội dung không được để trống"
            )

        return cleaned


class ContentAnnotationUpdate(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
    )

    description: str | None = Field(
        default=None,
        min_length=1,
    )

    @field_validator(
        "title",
        "description",
    )
    @classmethod
    def strip_optional_text(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        cleaned = value.strip()

        if not cleaned:
            raise ValueError(
                "Nội dung không được để trống"
            )

        return cleaned


class ContentAnnotationResponse(BaseModel):
    annotation_id: UUID
    content_type: AnnotationContentType
    content_id: UUID
    selected_text: str
    title: str
    description: str
    created_by: UUID
    created_at: datetime

    model_config = {
        "from_attributes": True
    }