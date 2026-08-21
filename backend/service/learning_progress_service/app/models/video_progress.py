import uuid
from uuid import UUID
from sqlmodel import Field, SQLModel

class VideoProgress(SQLModel, table=True):
    __tablename__ = "video_progress"

    video_progress_id: UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    user_id: UUID = Field(nullable=False, index=True)       # Định danh học viên từ User Service
    lesson_id: UUID = Field(nullable=False, index=True)     # Định danh bài học chứa video từ Course Service
    
    duration_seconds: int = Field(default=0, nullable=False)     # Tổng thời lượng tính bằng giây của video bài giảng
    last_watched_second: int = Field(default=0, nullable=False)  # Mốc giây cuối cùng học viên tạm dừng video
    max_watched_second: int = Field(default=0, nullable=False)   # Mốc giây xa nhất học viên từng xem tới trong video
    
    completion_percentage: float = Field(default=0.0)            # Phần trăm thời lượng video đã hoàn thành (0% - 100%)
    is_finished: bool = Field(default=False)                     # Trạng thái đã xem hết cấu phần video bài giảng
    current_points: float = Field(default=0.0)      #Tổng điểm đang có trong video hiện tại 