from sqlmodel import Session, select, update, func
from app.crud.base import CRUDBase
from uuid import UUID
from app.models.question import Question
from app.models.question_pool_link import QuestionPoolLink
from app.schemas.question import QuestionCreate, QuestionUpdate
from app.models.enum import QuestionType
from typing import Set

class CRUDQuestion(CRUDBase[Question, QuestionCreate, QuestionUpdate, UUID]):
    def get_multi_by_subject_id(self, db: Session, subject_id: UUID):
        statement = select(Question).where(
            Question.subject_id == subject_id
        )
        return db.exec(statement).all()
    
    def add_to_pool(self, db: Session, pool_id: UUID | None, question_id: UUID) -> bool:
        statement = (
            update(Question)
            .where(Question.id == question_id)
            .values(pool_id=pool_id)
        )
        
        result = db.exec(statement)
        db.commit()
        
        return result.rowcount > 0
    def get_subject_id(self, db: Session, question_id: UUID) -> UUID:
        statement = select(Question.subject_id).where(
            Question.question_id == question_id
        )
        return db.exec(statement).first()
    def total_questions_in_subject(self, db: Session, subject_id: UUID) -> int:
        statement = select(func.count(Question.question_id)).where(
            Question.subject_id == subject_id
        )
        return db.exec(statement).first() or 0
    def get_random_by_pool(self, db: Session, pool_id: UUID, limit: int) -> list[Question]:
        """Lấy danh sách ngẫu nhiên tối đa `limit` câu hỏi từ một Question Pool."""
        statement = (
            select(Question)
            .join(QuestionPoolLink)
            .where(QuestionPoolLink.pool_id == pool_id)
            .order_by(func.random())
            .limit(limit)
        )
        return db.exec(statement).all()

    def get_existing_fill_in_blank(self, db: Session, subject_id: UUID) -> Set[str]:
        """
        Lấy tập hợp tất cả body_content của câu hỏi FILL_IN_BLANK thuộc subject_id
        """
        statement = (
            select(Question.body_content)
            .where(
                Question.subject_id == subject_id,
                Question.question_type == QuestionType.FILL_IN_BLANK
            )
        )
        results = db.exec(statement).all()
        return set(results)
crud_question = CRUDQuestion(Question)