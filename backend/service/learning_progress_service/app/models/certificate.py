import uuid
from uuid import UUID
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlmodel import Field, SQLModel, Relationship

if TYPE_CHECKING:
    from app.models.course_enrollment import CourseEnrollment

class Certificate(SQLModel, table=True):
    certificate_id: UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    user_id: UUID = Field(nullable=False, index=True)
    full_name: str = Field(nullable=False, max_length=100)
    course_name: str = Field(nullable=False, max_length=255)
    enrollment_id: UUID = Field(
        foreign_key="course_enrollment.enrollment_id", 
        nullable=False, 
        unique=True # Đảm bảo quan hệ 1-1 (Một lượt đăng ký học chỉ có tối đa một chứng chỉ)
    )

    enrollment: Optional["CourseEnrollment"] = Relationship(back_populates="certificate")