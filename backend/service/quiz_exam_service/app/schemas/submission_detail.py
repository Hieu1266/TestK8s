from pydantic import BaseModel, Field, EmailStr
from uuid import UUID
from typing import List, Optional, Any
from app.models.enum import QuestionType, SubmissionStatus
from datetime import datetime

class SubmissionDetailCreate(BaseModel):
    submission_id: UUID
    question_id: UUID
    video_trigger_seconds: Optional[int] = None

class SubmissionDetailUpdate(BaseModel):
    selected_option_id: Optional[UUID] = None
    essay_answer_text: Optional[str] = None
    graph_json_data: Optional[str] = None
    graph_image_url: Optional[str] = None
    score_earned: Optional[float] = None
    teacher_feedback: Optional[str] = None

class SubmissionDetailItemResponse(BaseModel):
    """Schema chi tiết bài làm của từng câu hỏi trong lượt nộp"""
    detail_id: UUID = Field(..., description="Mã chi tiết lượt nộp")
    question_id: UUID = Field(..., description="Mã câu hỏi")
    question_title: str = Field(..., description="Nội dung/Tiêu đề câu hỏi")
    question_type: QuestionType = Field(..., description="Loại câu hỏi (MULTIPLE_CHOICE, ESSAY, TRUE_FALSE)")
    max_points: float = Field(default=1.0, description="Điểm tối đa của câu hỏi")
    
    # Dữ liệu bài làm tự luận
    essay_answer_text: Optional[str] = Field(None, description="Mã HTML chứa bài giải/công thức LaTeX")
    graph_image_url: Optional[str] = Field(None, description="URL ảnh đồ thị gửi qua Storage Service")
    graph_json_data: Optional[str] = Field(None, description="Dữ liệu tọa độ nét vẽ JSON")
    
    # Dữ liệu trắc nghiệm
    selected_option_id: Optional[UUID] = Field(None, description="ID đáp án thí sinh đã chọn")
    
    # Đánh giá của giảng viên
    score_earned: Optional[float] = Field(None, description="Điểm giảng viên chấm cho câu này")
    teacher_feedback: Optional[str] = Field(None, description="Nhận xét của giảng viên")


class SubmissionFullDetailResponse(BaseModel):
    """Schema trả về toàn bộ bài làm để mở Modal chấm bài"""
    submission_id: UUID = Field(..., description="Mã lượt nộp bài")
    quiz_id: UUID = Field(..., description="Mã bài thi")
    user_id: UUID = Field(..., description="Mã học viên")
    status: SubmissionStatus = Field(..., description="Trạng thái lượt làm bài")
    details: List[SubmissionDetailItemResponse] = Field(default=[], description="Danh sách câu hỏi & câu trả lời")

class QuestionGradeInput(BaseModel):
    """Dữ liệu điểm chấm cho từng câu hỏi tự luận"""
    detail_id: UUID = Field(..., description="Mã chi tiết lượt nộp")
    score_earned: float = Field(..., ge=0, description="Điểm cho câu hỏi (>= 0)")
    teacher_feedback: Optional[str] = Field(None, description="Nhận xét/Góp ý của giảng viên")

class QuestionOptionDetail(BaseModel):
    option_id: UUID
    option_text: str
    is_correct: bool

class SubmissionAnswerDetail(BaseModel):
    detail_id: UUID
    question_id: UUID
    question_text: str
    body_content: Optional[str] = None  # 🆕 Nội dung câu có chỗ trống (dùng cho FILL_IN_BLANK)
    question_type: QuestionType
    max_score: float
    score_earned: Optional[float] = None
    selected_option_id: Optional[UUID] = None
    essay_answer_text: Optional[str] = None
    graph_json_data: Optional[str] = None
    graph_image_url: Optional[str] = None
    teacher_feedback: Optional[str] = None
    options: List[QuestionOptionDetail] = []

class QuizSubmissionDetailResponse(BaseModel):
    submission_id: UUID
    quiz_id: UUID
    quiz_title: str
    user_id: UUID
    username: str
    email: EmailStr
    score: Optional[float] = None
    max_possible_score: float
    status: SubmissionStatus
    started_at: datetime
    submitted_at: Optional[datetime] = None
    answers: List[SubmissionAnswerDetail]