import uuid
from uuid import UUID
from datetime import date, datetime
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import Field, SQLModel, Relationship
from app.models.enum import SubmissionStatus

if TYPE_CHECKING:
    from app.models.quiz import Quiz
    from app.models.submission_detail import SubmissionDetail
    from app.models.peer_review_assignments import PeerReviewAssignment

# Model lượt làm bài tổng quát
class QuizSubmission(SQLModel, table=True):
    __tablename__ = "quiz_submission"

    submission_id: UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    quiz_id: UUID = Field(foreign_key="quiz.quiz_id", nullable=False, ondelete="CASCADE")
    user_id: UUID = Field(nullable=False, index=True) # Khóa ngoại logic từ User Service (Học viên)
    
    attempt_number: int = Field(default=1, nullable=False) # Làm bài lần thứ mấy
    status: SubmissionStatus = Field(default=SubmissionStatus.IN_PROGRESS)
    
    started_at: datetime = Field(default_factory=datetime.utcnow)
    submitted_at: Optional[datetime] = Field(default=None)

    # Chấm điểm chéo
    is_peer_review: Optional[bool] = Field(default=False)
    peer_avg_score: Optional[float] = Field(default=None) 
    is_discrepant: bool = Field(default=False, nullable=False) #Cờ đánh dấu bài này có bị lệch điểm nghiêm trọng hay không
    completed_review_count: int = Field(default=0, nullable=False) # Số lượng người đã hoàn thành chấm bài
    
    total_score: Optional[float] = Field(default=None)  # Điểm tổng (Hệ thống tự tính hoặc GV chấm)
    is_passed: Optional[bool] = Field(default=None)     # Điểm tổng >= passing_score của Quiz
    
    grader_id: Optional[UUID] = Field(default=None)     # Khóa ngoại logic từ User Service (Giảng viên chấm bài)
    graded_at: Optional[datetime] = Field(default=None)

    # Quan hệ
    quiz: Optional["Quiz"] = Relationship(back_populates="submissions")
    details: List["SubmissionDetail"] = Relationship(back_populates="submission")
    peer_assignments: List["PeerReviewAssignment"] = Relationship(back_populates="submission")