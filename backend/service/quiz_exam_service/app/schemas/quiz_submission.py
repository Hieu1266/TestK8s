from pydantic import BaseModel, Field, EmailStr
from uuid import UUID
from typing import List, Optional
from app.models.enum import SubmissionStatus , QuestionType, QuizType
from datetime import datetime
from app.schemas.submission_detail import QuestionGradeInput

class QuizSubmissionCreate(BaseModel):
    quiz_id: UUID
    user_id: UUID
    attempt_number: Optional[int] = None
    is_peer_review: Optional[bool] = False

class QuizSubmissionUpdate(BaseModel):
    status: SubmissionStatus | None = None
    submitted_at: Optional[datetime] = None
    # Chấm điểm chéo
    peer_avg_score: Optional[float] = None
    is_discrepant: bool | None = None
    completed_review_count: int | None = None 
    
    total_score: Optional[float] = None 
    is_passed: Optional[bool] = None 
    grader_id: Optional[UUID] = None

class SubmissionStatusOption(BaseModel):
    option_id: UUID
    option_text: str
    is_correct: Optional[bool] = None  # Chỉ có giá trị khi bài đã được chấm

class SubmissionStatusDetail(BaseModel):
    detail_id: UUID
    question_id: UUID
    question_title: str
    question_type: QuestionType
    video_trigger_seconds: Optional[int] = None
    body_content: Optional[str]
    max_points: Optional[float]
    options: List[SubmissionStatusOption]

    selected_option_id: Optional[UUID] = None
    essay_answer_text: Optional[str] = None
    graph_json_data: Optional[str] = None
    graph_image_url: Optional[str] = None

    # Chỉ trả khi bài đã được chấm
    score_earned: Optional[float] = None
    teacher_feedback: Optional[str] = None

class QuizSubmissionStatusResponse(BaseModel):
    submission_id: UUID
    quiz_id: UUID
    status: SubmissionStatus
    attempt_number: int
    started_at: datetime
    total_score: Optional[float] = None
    is_passed: Optional[bool] = None
    is_peer_review: Optional[bool] = None
    questions: List[SubmissionStatusDetail]


class QuizSubmissionSummaryResponse(BaseModel):
    """Schema trả về danh sách Quiz và trạng thái tổng quan các lượt nộp"""
    quiz_id: UUID = Field(..., description="Mã bài thi")
    subject_id: UUID = Field(..., description="Mã môn học")
    title: str = Field(..., description="Tiêu đề bài thi")
    description: Optional[str] = Field(None, description="Mô tả bài thi")
    duration_minutes: int = Field(..., description="Thời lượng làm bài (phút)")
    quiz_type: QuizType = Field(..., description="Loại đề thi (FIXED_QUESTION hoặc RANDOM_QUESTION)")
    is_active: bool = Field(..., description="Trạng thái bài thi")
    
    total_submissions: int = Field(default=0, description="Tổng số lượt làm bài")
    pending_gradings: int = Field(default=0, description="Số lượt chờ chấm (status = SUBMITTED)")
    graded_count: int = Field(default=0, description="Số lượt đã hoàn tất chấm (status = GRADED)")

class SubmissionListItemResponse(BaseModel):
    """Schema thông tin một lượt nộp bài hiển thị trên danh sách bảng"""
    submission_id: UUID = Field(..., description="Mã lượt nộp bài")
    quiz_id: UUID = Field(..., description="Mã bài thi")
    user_id: UUID = Field(..., description="Mã học viên")
    user_name: str = Field(..., description="Họ tên học viên (lấy từ User Service)")
    user_email: EmailStr = Field(..., description="Email học viên (lấy từ User Service)")
    
    attempt_number: int = Field(..., description="Lần làm bài thứ mấy")
    status: SubmissionStatus = Field(..., description="Trạng thái lượt nộp (IN_PROGRESS, SUBMITTED, GRADED)")
    started_at: datetime = Field(..., description="Thời điểm bắt đầu")
    submitted_at: Optional[datetime] = Field(None, description="Thời điểm nộp bài")
    
    total_score: Optional[float] = Field(None, description="Tổng điểm lượt làm bài")
    is_passed: Optional[bool] = Field(None, description="Đã đạt bài thi hay chưa")

class GradeSubmissionRequest(BaseModel):
    """Request Body khi giảng viên bấm 'Lưu kết quả chấm điểm'"""
    grader_id: UUID = Field(..., description="Mã giảng viên thực hiện chấm bài")
    grades: List[QuestionGradeInput] = Field(..., min_items=1, description="Danh sách điểm chấm từng câu")


class GradeSubmissionResponse(BaseModel):
    """Response trả về sau khi cập nhật điểm thành công"""
    submission_id: UUID = Field(..., description="Mã lượt nộp bài")
    status: SubmissionStatus = Field(..., description="Trạng thái sau chấm (Thường là GRADED)")
    total_score: float = Field(..., description="Tổng điểm sau khi tính toán")
    is_passed: bool = Field(..., description="Kết quả Đạt / Không đạt")
    grader_id: UUID = Field(..., description="Mã giảng viên chấm")
    graded_at: datetime = Field(..., description="Thời điểm hoàn tất chấm điểm")

class QuizUserSummaryResponse(BaseModel):
    user_id: UUID
    username: str
    email: EmailStr
    total_submissions: int
    pending_gradings: int
    latest_submitted_at: Optional[datetime] = None

class UserSubmissionItem(BaseModel):
    submission_id: UUID
    quiz_id: UUID
    user_id: UUID
    total_score: Optional[float] = None
    max_score: Optional[float] = None
    status: SubmissionStatus
    started_at: datetime
    submitted_at: Optional[datetime] = None

class QuestionGradingInput(BaseModel):
    detail_id: UUID
    score_earned: float
    teacher_feedback: Optional[str] = None

class GradeSubmissionRequest(BaseModel):
    gradings: List[QuestionGradingInput]

class QuizSubmissionStatus(BaseModel):
    submit_status: Optional[str] = None
    is_peer_review: bool | None = None