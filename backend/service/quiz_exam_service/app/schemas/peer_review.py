import uuid
from uuid import UUID
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enum import ReviewStatus, SubmissionStatus


# ---------------------------------------------------------------------------
# Danh sách bài được giao cho học viên (reviewer) chấm chéo
# ---------------------------------------------------------------------------
class MyAssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    assignment_id: UUID
    quiz_id: UUID
    submission_id: UUID
    status: ReviewStatus
    final_score_given: Optional[float] = None
    assigned_at: datetime
    completed_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Chi tiết 1 lượt chấm: câu trả lời tự luận cần chấm kèm rubric tương ứng
# ---------------------------------------------------------------------------
class RubricCriteriaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    criteria_id: UUID
    title: str
    description: Optional[str] = None
    percentage: float


class EssayAnswerOut(BaseModel):
    """Câu trả lời tự luận (ESSAY) của bài nộp, kèm rubric của câu hỏi đó."""

    question_id: UUID
    question_title: str
    body_content: str
    max_points: float

    essay_answer_text: Optional[str] = None
    graph_image_url: Optional[str] = None
    graph_json_data: Optional[str] = None
    video_trigger_seconds: Optional[int] = None

    rubric_criterias: List[RubricCriteriaOut] = Field(default_factory=list)


class AssignmentDetailOut(MyAssignmentOut):
    quiz_title: str
    general_comment: Optional[str] = None
    answers: List[EssayAnswerOut] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Nộp kết quả chấm chéo
# ---------------------------------------------------------------------------
class EvaluationItemIn(BaseModel):
    criteria_id: UUID
    score: float = Field(ge=0, description="Điểm cho riêng tiêu chí này")
    feedback: Optional[str] = None

    @field_validator("score")
    @classmethod
    def validate_score(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Điểm không được nhỏ hơn 0")
        return v


class SubmitEvaluationIn(BaseModel):
    evaluations: List[EvaluationItemIn] = Field(min_length=1)
    general_comment: Optional[str] = None


class EvaluationItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    evaluation_id: UUID
    criteria_id: UUID
    score: float
    feedback: Optional[str] = None


class SubmitEvaluationOut(BaseModel):
    assignment_id: UUID
    status: ReviewStatus
    final_score_given: float
    general_comment: Optional[str] = None
    completed_at: datetime
    evaluations: List[EvaluationItemOut]

    # Trạng thái tổng hợp phía submission sau khi lượt chấm này được ghi nhận
    submission_fully_reviewed: bool
    submission_peer_avg_score: Optional[float] = None
    submission_is_discrepant: Optional[bool] = None


# ---------------------------------------------------------------------------
# [Giảng viên] Danh sách bài nộp theo cờ is_peer_review (2 mục: bài nộp thường / chấm chéo)
# ---------------------------------------------------------------------------
class QuizPeerReviewInfoOut(BaseModel):
    """Thông tin tối thiểu để FE biết đề thi có bật chấm chéo hay không, dùng để
    quyết định có hiển thị 2 mục (bài nộp thường / chấm chéo) hay không."""

    model_config = ConfigDict(from_attributes=True)

    quiz_id: UUID
    title: str
    is_peer_review: bool


class SubmissionListItemOut(BaseModel):
    """1 lượt nộp bài, dùng cho cả 2 mục:
    - is_peer_review=False -> mục 'Bài nộp thường'.
    - is_peer_review=True  -> mục 'Chấm chéo' (gồm cả bài đã tự động chốt điểm
      lẫn bài lệch điểm cần chấm lại, phân biệt qua is_discrepant)."""

    model_config = ConfigDict(from_attributes=True)

    submission_id: UUID
    quiz_id: UUID
    user_id: UUID
    attempt_number: int
    status: SubmissionStatus
    is_peer_review: bool
    is_discrepant: bool
    peer_avg_score: Optional[float] = None
    completed_review_count: int
    total_score: Optional[float] = None
    is_passed: Optional[bool] = None
    started_at: datetime
    submitted_at: Optional[datetime] = None
