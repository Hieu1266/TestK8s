from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from app.models.enum import TestingEnrollment

class CourseEnrollmentCreate(BaseModel):
    course_id: UUID
    is_tested: bool = False


class CourseEnrollmentUpdate(BaseModel):
    current_overall_progress: float = None
    testing_course_status: TestingEnrollment = None


class CourseEnrollmentResponse(BaseModel):
    enrollment_id: UUID
    user_id: UUID
    course_id: UUID
    enrolled_at: datetime
    current_overall_progress: float
    is_completed: bool
    completed_at: Optional[datetime] = None
    testing_course_status: Optional[TestingEnrollment] = None
    class Config:
        from_attributes = True

class CourseInProgress(BaseModel):
    course_id: UUID
    course_title: str
    current_overall_progress: float
    is_completed: bool
    is_tested: bool = False                                     
    testing_course_status: Optional[TestingEnrollment] = None

class GeneralUserEnrollmentInfo(BaseModel):
    inprogress_courses: int
    completed_courses: int
    certificate: int

class LessonItem(BaseModel):
    lesson_id: UUID
    is_optional: bool
    is_quiz: bool
    duration_seconds: int

class CourseLessonsResponse(BaseModel):
    course_id: UUID
    lessons: List[LessonItem]