from pydantic import BaseModel
from uuid import UUID

class LessonResourceResponse(BaseModel):
    resource_id: UUID
    lesson_id: UUID
    file_name: str
    file_path: str
    file_extension: str

    class Config:
        from_attributes = True