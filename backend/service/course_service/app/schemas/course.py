from datetime import date
from typing import Optional, List
from uuid import UUID
from app.schemas.enums import CourseType
from app.schemas.subject import SubjectPreview, SubjectLearningStructure
from pydantic import BaseModel
from app.schemas.enums import CourseStatus


# 📋 Schema cơ sở chứa các trường chung
class CourseBase(BaseModel):
    title: str
    description: Optional[str] = None
    price: int = 0


# 🟢 Schema dùng khi TẠO khóa học
class CourseCreate(CourseBase):
    curriculum_id: UUID
    instructor_id: Optional[UUID] = None  
    course_type: str
    status_id: str


# 🟠 Schema dùng khi CẬP NHẬT khóa học
class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[int] = None
    status_id: Optional[str] = None
    total_lessons: Optional[int] = None  


# 🔵 Schema dùng khi TRẢ VỀ dữ liệu (Read API)
class CourseRead(CourseBase):
    course_id: UUID
    curriculum_id: UUID                 
    created_at: date
    status_id: str
    image_url: Optional[str] = None     
    instructor_id: Optional[UUID] = None
    # Cấu hình Pydantic v2 để đọc được dữ liệu từ SQLModel/SQLAlchemy object (.from_attributes)
    model_config = {
        "from_attributes": True
    }


# ⚫ Schema phản hồi khi UPLOAD ảnh thành công
class CourseImageUploadResponse(BaseModel):
    image_url: str

class LessonOrderInfo(BaseModel):
    lesson_id: UUID
    is_optional: bool
    is_quiz: bool
    duration_seconds: int = 0
    first_subject_lesson: bool = False

class CourseLessonsResponse(BaseModel):
    course_id: UUID
    lessons: List[LessonOrderInfo]

class GeneralCourseInfo(CourseBase):
    course_id: UUID
    course_type: CourseType = CourseType.SHORT_TERM
    tags: List[str]

class CourseSearchPaginatedResponse(BaseModel):
    items: List[GeneralCourseInfo]
    total: int
    page: int
    size: int
    total_pages: int

class CoursePreview(BaseModel):
    title: str
    instructor_list: List[str]
    course_structure: List[SubjectPreview]
    tag_list: List[str]

class CourseLearningStructure(BaseModel):
    title: str
    subjects: List[SubjectLearningStructure]



class CourseStatusUpdate(BaseModel):
    status_id: CourseStatus