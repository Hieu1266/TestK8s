import uuid

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import Column, DateTime, Text
from sqlmodel import Field, SQLModel


class ContentAnnotation(SQLModel, table=True):
    __tablename__ = "content_annotation"

    annotation_id: UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )

    # LESSON_CONTENT hoặc PRESENTATION_SLIDE
    content_type: str = Field(
        nullable=False,
        max_length=32,
        index=True,
    )

    # lesson_id hoặc slide_id
    content_id: UUID = Field(
        nullable=False,
        index=True,
    )

    # Từ hoặc cụm từ giảng viên đã bôi đen
    selected_text: str = Field(
        nullable=False,
        max_length=255,
    )

    # Tiêu đề hiển thị trên khung thông tin
    title: str = Field(
        nullable=False,
        max_length=255,
    )

    # Nội dung giải thích
    description: str = Field(
        sa_column=Column(
            Text,
            nullable=False,
        )
    )

    # Giảng viên đã tạo chú giải
    created_by: UUID = Field(
        nullable=False,
        index=True,
    )

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
        ),
    )