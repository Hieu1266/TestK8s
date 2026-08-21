import uuid
from uuid import UUID
from datetime import datetime
from typing import Optional, TYPE_CHECKING, List
from sqlmodel import Field, SQLModel, Relationship
from app.models.enum import TestingEnrollment

if TYPE_CHECKING:
    from app.models.certificate import Certificate
    from app.models.comment import Comment

class CourseEnrollment(SQLModel, table=True):
    __tablename__ = "course_enrollment"

    enrollment_id: UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: UUID = Field(nullable=False, index=True)       # Định danh học viên từ User Service
    course_id: UUID = Field(nullable=False, index=True)     # Định danh khóa học từ Course Service
    
    enrolled_at: datetime = Field(default_factory=datetime.utcnow) # Thời điểm học viên bấm đăng ký học
    current_overall_progress: float = Field(default=0.0)    # Tiến độ tổng quan của khóa học (0% - 100%)
    is_completed: bool = Field(default=False)               # Trạng thái hoàn thành toàn bộ khóa học để cấp chứng chỉ
    completed_at: Optional[datetime] = Field(default=None)  # Thời điểm khóa học chính thức hoàn thành
    is_tested: bool = Field(default=False)                  # Có phải khóa học test không
    testing_course_status: Optional[TestingEnrollment] = Field(nullable=True, default=None) # Trạng thái của khóa học thử nghiệm do tester đánh giá

    certificate: Optional["Certificate"] = Relationship(
        back_populates="enrollment", 
        sa_relationship_kwargs={"uselist": False}
    )

    comments: List["Comment"] = Relationship(back_populates="enrollment")