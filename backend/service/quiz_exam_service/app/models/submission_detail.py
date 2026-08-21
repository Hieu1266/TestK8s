import uuid
from uuid import UUID
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import Field, SQLModel, Relationship

if TYPE_CHECKING:
    from app.models.quiz_submission import QuizSubmission
    from app.models.question import Question

# Model chi tiết câu trả lời của lượt nộp bài
class SubmissionDetail(SQLModel, table=True):
    __tablename__ = "submission_detail"

    detail_id: UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    submission_id: UUID = Field(foreign_key="quiz_submission.submission_id", nullable=False, ondelete="CASCADE")
    question_id: UUID = Field(foreign_key="question.question_id", nullable=False, ondelete="CASCADE")
    
    # Trường hợp Trắc nghiệm: Lưu ID của lựa chọn được chọn
    selected_option_id: Optional[UUID] = Field(default=None)
    
    # Trường hợp Tự luận gõ text/công thức toán: Lưu chuỗi HTML chứa mã LaTeX từ Rich Text Editor
    essay_answer_text: Optional[str] = Field(default=None)
    video_trigger_seconds: Optional[int] = Field(default=None)
    # Trường hợp Tự luận vẽ hình/đồ thị:
    # Lưu chuỗi tọa độ vẽ (dạng JSON string) để FE tái tạo lại nét vẽ nếu cần chỉnh sửa
    graph_json_data: Optional[str] = Field(default=None)
    # Lưu URL của ảnh kết quả đồ thị sau khi gửi qua Storage Service (Để hiển thị nhanh cho GV chấm)
    graph_image_url: Optional[str] = Field(default=None, max_length=500)
    is_passed: Optional[bool] = Field(default= None)
    score_earned: Optional[float] = Field(default=None)   # Điểm đạt được cho riêng câu này
    teacher_feedback: Optional[str] = Field(default=None) # Nhận xét, sửa lỗi của Giảng viên (nếu có)

    # Quan hệ
    submission: Optional["QuizSubmission"] = Relationship(back_populates="details")
    question: Optional["Question"] = Relationship(back_populates="submission_details")