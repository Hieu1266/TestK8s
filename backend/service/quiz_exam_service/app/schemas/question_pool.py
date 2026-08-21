from pydantic import BaseModel
from uuid import UUID
from typing import Optional, List
from datetime import date

class QuestionPoolBase(BaseModel):
    subject_id: UUID  # 🆕 Bổ sung theo yêu cầu: 1 pool thuộc về 1 subject cụ thể (không dùng chung mọi môn)
    title: str
    description: str

class QuestionPoolCreate(QuestionPoolBase):
    owner_id: UUID
    

class QuestionPoolUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

class QuestionPoolItem(QuestionPoolBase):
    pool_id: UUID
    created_at: date
    total_questions: int = 0
    question_ids: List[UUID] = []  # 🆕 Để FE biết chính xác câu hỏi nào đã gán (hiển thị đúng trạng thái tick chọn)

    class Config:
        from_attributes = True

# 🆕 Payload thay thế toàn bộ danh sách câu hỏi được gán vào 1 pool
# (Modal "Thêm/Bớt câu hỏi" gửi lên danh sách question_id đã tick chọn cuối cùng)
class QuestionPoolSetQuestions(BaseModel):
    question_ids: List[UUID]