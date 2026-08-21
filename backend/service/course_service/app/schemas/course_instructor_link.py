from datetime import date
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel

class CourseAssignment(BaseModel):
    course_id: UUID
    instructor_id: UUID
