from pydantic import BaseModel
from uuid import UUID
from typing import Optional, List
from app.schemas.module import ModulePreview, ModuleLearningStructure
from app.schemas.enums import SubjectStatus

class SubjectBase(BaseModel):
    title: str
    order_index: int = 1
    description: str


class SubjectCreate(SubjectBase):
    course_id: UUID

class SubjectUpdate(BaseModel):
    title: Optional[str] = None
    order_index: Optional[int] = None
    description: str = None
    status_id: SubjectStatus


class SubjectPreview(BaseModel):
    title: str
    instructor_name: Optional[str] = None
    modules_preview: List[ModulePreview]

# class SubjectRead(SubjectBase):
#     subject_id: UUID
#     course_id: UUID

class InstructorStatictisSubject(BaseModel):
    total_subjects: int
    total_modules: int
    total_active_subject: int
    total_developing_subject: int

class GeneralInfoInstructorSubject(BaseModel):
    subject_id: UUID
    course_id: UUID
    title: str
    description: str
    status_id: str
    total_modules: int
    total_lessons: int

class SubjectInfoWithQuestions(BaseModel):
    subject_id: UUID
    title: str
    description: str
    status_id: str
    total_modules: int
    total_questions: Optional[int] = None    

class SubjectInfoWithQuizzes(BaseModel):
    subject_id: UUID
    title: str
    description: str
    status_id: str
    total_quizzes: int

class SubjectRead(BaseModel):
    subject_id: UUID
    course_id: UUID
    title: str
    description: Optional[str] = None
    order_index: int
    status_id: str
    file_url: Optional[str] = None 


    class Config:
        from_attributes = True

class SubjectLearningStructure(BaseModel):
    title: str
    subject_id: UUID
    modules: List[ModuleLearningStructure]