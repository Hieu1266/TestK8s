import uuid
from uuid import UUID
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import Field, SQLModel, Relationship
from app.models.enum import ReviewStatus

if TYPE_CHECKING:
    from app.models.peer_review_evaluations import PeerReviewEvaluation
    from app.models.quiz_submission import QuizSubmission
    from app.models.quiz import Quiz

class PeerReviewAssignment(SQLModel, table=True):
    __tablename__ = "peer_review_assignments"

    assignment_id: UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    quiz_id: UUID = Field(foreign_key="quiz.quiz_id", nullable=False, ondelete="CASCADE")# Định danh đề thi tự luận được chấm chéo
    
    reviewer_id: UUID = Field(nullable=False, index=True)     # Định danh học viên đóng vai trò là người đi chấm bài
    submission_id: UUID = Field(foreign_key="quiz_submission.submission_id", index=True, ondelete="CASCADE") # Định danh bài nộp được giao để chấm
    
    status: ReviewStatus = Field(default=ReviewStatus.PENDING) # Trạng thái của lượt phân công chấm chéo
    final_score_given: Optional[float] = Field(default=None)   # Tổng điểm số người chấm đưa ra sau khi hoàn tất
    general_comment: Optional[str] = Field(default=None)      # Nhận xét hoặc lời phê tổng quan cho bài làm
    
    assigned_at: datetime = Field(default_factory=datetime.utcnow) # Thời điểm hệ thống tự động phân phối bài
    completed_at: Optional[datetime] = Field(default=None)    # Thời điểm người chấm bấm nút hoàn thành

    # Quan hệ nội bộ phân hệ
    quiz: Optional["Quiz"] = Relationship(back_populates="peer_assignments")
    submission: Optional["QuizSubmission"] = Relationship(back_populates="peer_assignments")
    evaluations: List["PeerReviewEvaluation"] = Relationship(back_populates="assignment")