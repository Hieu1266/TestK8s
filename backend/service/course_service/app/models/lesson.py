from sqlmodel import Field, SQLModel, Relationship
from typing import Optional, TYPE_CHECKING, List
from uuid import UUID
import uuid

if TYPE_CHECKING:
    from app.models.module import Module
    from app.models.lesson_resource import LessonResource
    from app.models.presentation import Presentation

class Lesson(SQLModel, table=True):
    __tablename__ = "lesson"

    lesson_id: UUID = Field(
        default_factory=uuid.uuid4, 
        primary_key=True, 
        index=True, 
        nullable=False
    )
    module_id: UUID = Field(foreign_key="module.module_id", nullable=False)
    title: str = Field(nullable=False, max_length=255)
    # Đường dẫn video (để trống nếu bài học không có video)
    video_url: Optional[str] = Field(default=None, max_length=500)
    duration_seconds: Optional[int] = Field(default=0, nullable=False)

    # Nội dung văn bản/bài đọc (để trống nếu bài học không có phần đọc)
    content_body: Optional[str] = Field(default=None)
    
    order_index: int = Field(default=1, nullable=False)
    
    # Bài học này là bắt buộc hay tự chọn
    is_optional: bool = Field(default=False, nullable=False)
    # Có hiển thị nội dung bài học dưới dạng slide hay không
    is_slide_presentation: bool = Field(default=False, nullable=False)

    # Có phải là bài thi/kiểm tra không
    is_quiz: bool = Field(default=False, nullable=False)

    # Quan hệ
    module: Optional["Module"] = Relationship(back_populates="lessons")
    
    # Một bài học có thể có một hoặc nhiều file tài nguyên
    resources: List["LessonResource"] = Relationship(
        back_populates="lesson",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

    # Một lesson có tối đa một bài trình chiếu.
    presentation: Optional["Presentation"] = Relationship(
        back_populates="lesson",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
            "single_parent": True,
            "uselist": False,
        },
    )