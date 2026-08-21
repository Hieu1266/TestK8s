from sqlmodel import Field, SQLModel, Relationship
from typing import Optional, List, TYPE_CHECKING
from uuid import UUID
import uuid
from app.models.course_tag_link import CourseTagLink

if TYPE_CHECKING:
    from app.models.course import Course

class Tag(SQLModel, table=True):
    __tablename__ = "tag"
    
    tag_id: UUID = Field(
        default_factory=uuid.uuid4, 
        primary_key=True,
        index=True,
        nullable=False
    )
    tag_name: str = Field(nullable=False, max_length=100)
    description: Optional[str] = Field(default=None, max_length=255)

    # Quan hệ
    # Một tag có thể thuộc 1 hoặc nhiều khóa học
    courses: List["Course"] = Relationship(back_populates="tags", link_model=CourseTagLink)