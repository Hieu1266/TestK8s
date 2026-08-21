import uuid
from uuid import UUID
from datetime import date
from typing import Optional, List  
from sqlmodel import Field, SQLModel, Relationship
from app.models.curriculum import CourseType 

class CourseTagLink(SQLModel, table=True):
    __tablename__ = "course_tag_link"

    course_id: UUID = Field(foreign_key="course.course_id", primary_key=True)
    tag_id: UUID = Field(foreign_key="tag.tag_id", primary_key=True)