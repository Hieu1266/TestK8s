import uuid
from uuid import UUID
from datetime import date
from typing import Optional, List  
from sqlmodel import Field, SQLModel, Relationship

class CourseCollaboratorLink(SQLModel, table=True):
    __tablename__ = "subject_collaborator_link"
    
    collab_id: UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    subject_id: UUID = Field(foreign_key="subject.subject_id", nullable=False)
    collaborator_id: UUID = Field(nullable=False)