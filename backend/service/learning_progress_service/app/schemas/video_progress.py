from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional

class VideoProgressCreate(BaseModel):
    user_id: UUID
    lesson_id: UUID
    duration_seconds: int
    last_watched_second: int = 0
    max_watched_second: int = 0
    current_points: Optional[float] = 0.0

class VideoProgressUpdate(BaseModel):
    duration_seconds: Optional[int] = None
    last_watched_second: Optional[int] = None
    max_watched_second: Optional[int] = None
    completion_percentage: Optional[float] = None
    is_finished: Optional[bool] = None
    current_points: Optional[float] = None

class VideoProgressLookupIn(BaseModel):
    lesson_id: UUID
    duration_seconds: int = Field(..., ge=0)

class VideoProgressResponse(BaseModel):
    video_progress_id: UUID
    lesson_id: UUID
    duration_seconds: int
    last_watched_second: int
    max_watched_second: int
    completion_percentage: float
    is_finished: bool
    current_points: float

    class Config:
        from_attributes = True

class AddScoreRequest(BaseModel):
    adding_score: float = Field(gt=0, description="Số điểm muốn cộng thêm (phải lớn hơn 0)")