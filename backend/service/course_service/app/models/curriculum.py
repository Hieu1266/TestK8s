from sqlmodel import Field, SQLModel, Relationship
from typing import Optional, TYPE_CHECKING
from uuid import UUID
import uuid
from app.schemas.enums import CourseType
from app.schemas.enums import CurriculumStatus
from sqlalchemy import Enum, String
if TYPE_CHECKING:
    from app.models.course import Course

# Model của Chương trình đào tạo khóa học
class Curriculum(SQLModel, table=True):
    __tablename__ = "curriculum"

    curriculum_id: UUID = Field(
        default_factory=uuid.uuid4, 
        primary_key=True, 
        index=True,
        nullable=False
    )
    assigner_id: UUID = Field(nullable=False) #id của người phân công
    curriculum_name: str = Field(nullable=False, max_length=255)
    description: Optional[str] = Field(default=None, max_length=255)
    course_type: CourseType = Field(nullable=False)
    course_finished_months: int = Field(nullable=False) #Số tháng để hoàn thành khóa học
    curriculum_file_path: Optional[str] = Field(default=None, nullable=True)
    certificate_name: str = Field(nullable=False, max_length=255)
    # status_id: CurriculumStatus = Field(
    #     sa_type=Enum(CurriculumStatus),
    #     nullable=False
    # )
    status_id: str = Field(
        sa_type=String(50), 
        default=CurriculumStatus.CURRICULUM_DRAFT.value, # Lấy .value để làm chuỗi mặc định
        nullable=False
    )
    # Quan hệ
    # Một CTDT thuộc về một khóa học
    course: Optional["Course"] = Relationship(
        back_populates="curriculum",
        sa_relationship_kwargs={
        "cascade": "all, delete-orphan", 
    }
        )
