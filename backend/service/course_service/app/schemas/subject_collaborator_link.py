from uuid import UUID
from typing import Optional
from pydantic import BaseModel

class CourseCollaboratorLinkBase(BaseModel):
    collaborator_id: UUID
    subject_id: UUID

class CourseCollaboratorRead(BaseModel):
    collab_id: UUID
    subject_id: UUID
    collaborator_id: UUID
    username: Optional[str] = None

    class Config:
        from_attributes = True