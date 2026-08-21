from sqlmodel import Field, SQLModel, Relationship
from typing import Optional, TYPE_CHECKING
from uuid import UUID
from app.schemas.enums import SyllabusStatus
import uuid
from sqlalchemy import Enum

if TYPE_CHECKING:
    from app.models.subject import Subject

# Model đề cương của môn học trong khóa học
class Syllabus(SQLModel, table=True):
    __tablename__ = "syllabus"

    syllabus_id: UUID = Field(primary_key=True, default_factory=uuid.uuid4)
    subject_id: UUID = Field(foreign_key="subject.subject_id", nullable=False, unique=True)
    assigner_id: UUID | None = Field(default=None, nullable=True)
    instructor_id: Optional[UUID] = Field(nullable=False)
    description: Optional[str] = Field(default=None, max_length=255)
    syllabus_file_path: str = Field(nullable=False)
    status_id: SyllabusStatus = Field(
        sa_type=Enum(
            SyllabusStatus,
            name="syllabusstatus",
            values_callable=lambda x: [e.value for e in x]
        ),
        nullable=False
    )
    # Quan hệ
    # Một đề cương môn học chỉ thuộc về 1 môn học
    subject: Optional["Subject"] = Relationship(back_populates="syllabus")