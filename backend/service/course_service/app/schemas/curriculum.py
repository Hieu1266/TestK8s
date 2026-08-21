from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from app.schemas.enums import CurriculumStatus, CourseType


# Cấu trúc chung cho Curriculum
class CurriculumBase(BaseModel):
    curriculum_name: str
    description: Optional[str] = None
    course_type: str 
    course_finished_months: int
    certificate_name: Optional[str] = None
    
    status_id: Optional[CurriculumStatus] = CurriculumStatus.CURRICULUM_DRAFT

# Schema dùng để nhận data TẠO MỚI (Từ payload gửi lên)
class CurriculumCreate(CurriculumBase):
    assigner_id: Optional[UUID] = None
    curriculum_file_path: Optional[str] = ""  

# Schema dùng khi CẬP NHẬT thông tin
class CurriculumUpdate(CurriculumBase):
    assigner_id: Optional[UUID] = None
    curriculum_file_path: Optional[str] = None

# Schema dùng khi TRẢ VỀ dữ liệu sạch (Response Model)
class CurriculumRead(CurriculumBase):
    curriculum_id: UUID
    assigner_id: Optional[UUID] = None
    curriculum_file_path: Optional[str] = None
    instructor_id: Optional[UUID] = None
    
class CurriculumFileUploadResponse(BaseModel):
    file_path: str

    
    class Config:
        from_attributes = True  
        
