from pydantic import BaseModel, Field
from uuid import UUID


class CourseTagLinkBase(BaseModel):
    course_id: UUID
    tag_id: UUID


class CourseTagLinkCreate(CourseTagLinkBase):
    pass


class CourseTagLinkUpdate(CourseTagLinkBase):
    pass


class CourseTagAssignmentUpdate(BaseModel):
    course_id: UUID

    # Cho phép danh sách rỗng để người quản lý có thể
    # xóa toàn bộ Tag khỏi khóa học.
    tag_ids: list[UUID] = Field(default_factory=list)