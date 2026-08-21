from sqlmodel import Session, select, delete
from app.crud.base import CRUDBase
from uuid import UUID
from app.models.question_pool import QuestionPool
from app.models.question_pool_link import QuestionPoolLink
from app.schemas.question_pool import QuestionPoolCreate, QuestionPoolUpdate

class CRUDQuestionPool(CRUDBase[QuestionPool, QuestionPoolCreate, QuestionPoolUpdate, UUID]):
    def is_title_existed(self, db: Session, title: str, subject_id: UUID):
        statement = select(QuestionPool).where(
            QuestionPool.title == title,
            QuestionPool.subject_id == subject_id
        )
        return db.exec(statement).first() is not None

    def get_multi_by_owner(self, db: Session, owner_id: UUID) -> list[QuestionPool]:
        statement = select(QuestionPool).where(
            QuestionPool.owner_id == owner_id
        )
        return db.exec(statement).all()

    # 🆕 Lấy danh sách pool theo subject (dùng cho trang cấu hình đề Random + QuestionPoolManager)
    def get_multi_by_subject(self, db: Session, subject_id: UUID) -> list[QuestionPool]:
        statement = select(QuestionPool).where(
            QuestionPool.subject_id == subject_id
        )
        return db.exec(statement).all()

    # 🆕 Thay thế TOÀN BỘ danh sách câu hỏi được gán vào 1 pool (xóa link cũ, chèn link mới)
    def set_questions(self, db: Session, pool_id: UUID, question_ids: list[UUID]) -> None:
        db.exec(delete(QuestionPoolLink).where(QuestionPoolLink.pool_id == pool_id))
        for qid in question_ids:
            db.add(QuestionPoolLink(pool_id=pool_id, question_id=qid))
        db.commit()

    def count_questions(self, db: Session, pool_id: UUID) -> int:
        statement = select(QuestionPoolLink).where(QuestionPoolLink.pool_id == pool_id)
        return len(db.exec(statement).all())

    # 🆕 Lấy danh sách question_id đã gán trong pool (để FE hiển thị đúng trạng thái tick chọn)
    def get_question_ids(self, db: Session, pool_id: UUID) -> list:
        statement = select(QuestionPoolLink.question_id).where(QuestionPoolLink.pool_id == pool_id)
        return db.exec(statement).all()

crud_question_pool = CRUDQuestionPool(QuestionPool)