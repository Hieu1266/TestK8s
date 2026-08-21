from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional
from app.models.enum import StructurePart, CommentStatus


class CommentBase(BaseModel):
    enrollment_id: UUID
    structure_part: StructurePart
    part_id: UUID
    title: str
    comment: str

class CommentCreate(CommentBase):
    tester_id: UUID
    status: CommentStatus = CommentStatus.PENDING

class CommentUpdate(BaseModel):
    structure_part: Optional[StructurePart] = None
    part_id: Optional[UUID] = None
    title: Optional[str] = None
    comment: Optional[str] = None
    status: Optional[CommentStatus] = None

class CommentResponse(CommentBase):
    comment_id: UUID
    tester_id: UUID
    status: CommentStatus

    class Config:
        from_attributes = True


class StructureCommentIn(BaseModel):
    course_id: UUID
    structure_part: StructurePart
    part_id: UUID
    title: str
    comment: str


class CommentStatusUpdate(BaseModel):
    status: CommentStatus


class CommentTeacherView(CommentResponse):
    tester_username: str