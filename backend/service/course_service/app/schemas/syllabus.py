import os
from pydantic import BaseModel, computed_field
from uuid import UUID
from typing import Optional
from app.schemas.enums import SyllabusStatus
class SyllabusBase(BaseModel):
    subject_id: UUID
    assigner_id: Optional[UUID] = None        
    instructor_id: Optional[UUID] = None      
    description: Optional[str] = None
    syllabus_file_path: Optional[str] = ""    
    status_id: Optional[str] = SyllabusStatus.SYLLABUS_DRAFT.value

class SyllabusCreate(SyllabusBase):
    pass

class SyllabusUpdate(BaseModel):
    assigner_id: Optional[UUID] = None
    instructor_id: Optional[UUID] = None
    description: Optional[str] = None
    syllabus_file_path: Optional[str] = None
    status_id: Optional[str] = None

class SyllabusRead(SyllabusBase):
    syllabus_id: UUID

    # Tự động trích xuất tên file từ đường dẫn để hiển thị lên UI
    @computed_field
    @property
    def file_name(self) -> str:
        return os.path.basename(self.syllabus_file_path) if self.syllabus_file_path else ""

    class Config:
        from_attributes = True

class CheckSyllabusInstructor(BaseModel):
    subject_id: UUID
    instructor_id: UUID