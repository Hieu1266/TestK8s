from sqlmodel import Session, select, func
from app.crud.base import CRUDBase
from app.models.quiz import Quiz
from app.schemas.quiz import QuizCreate, QuizUpdate, QuizItem
from uuid import UUID

class CRUDQuiz(CRUDBase[Quiz, QuizCreate, QuizUpdate, UUID]):
    def is_lesson_had_quiz(self, db: Session, lesson_id: UUID) -> bool:
        statement = select(Quiz).where(
            Quiz.target_lesson_id == lesson_id
        )
        return db.exec(statement).first() is not None
    def get_multi_by_subject(self, db: Session, subject_id: UUID, search: str | None = None) -> list[Quiz]:
        statement = select(Quiz).where(
            Quiz.subject_id == subject_id
        )
        
        # Thêm điều kiện tìm kiếm nếu có tham số search
        if search:
            # ilike giúp tìm kiếm không phân biệt hoa thường
            statement = statement.where(Quiz.title.ilike(f"%{search}%"))
            
        return db.exec(statement).all()
    def get_subject_id(self, db: Session, quiz_id: UUID) -> UUID:
        statement = select(Quiz.subject_id).where(
            Quiz.quiz_id == quiz_id
        )
        return db.exec(statement).first()
    def get_total_quiz_by_subject(self, db: Session, subject_id: UUID) -> int:
        statement = select(func.count(Quiz.quiz_id)).where(
            Quiz.subject_id == subject_id
        )
        return db.exec(statement).first() or 0
    def get_quiz_by_lesson(self, db: Session, lesson_id: UUID)-> Quiz:
            statement = select(Quiz).where(
                 Quiz.target_lesson_id == lesson_id
            )
            return db.exec(statement).first()

    
crud_quiz = CRUDQuiz(Quiz)