from sqlmodel import Session, select, update, func
from app.crud.base import CRUDBase
from uuid import UUID
from app.models.quiz_question import QuizQuestion
from app.schemas.quiz_question import QuizQuestionCreate, QuizQuestionUpdate

class CRUDQuizQuestion(CRUDBase[QuizQuestion, QuizQuestionCreate, QuizQuestionUpdate, UUID]):
    
    def add_questions_to_quiz(
        self, db: Session, *, quiz_id: UUID, questions_in: list[QuizQuestionCreate]
    ) -> list[QuizQuestion]:
        # 1. Lấy ra order_index lớn nhất hiện tại của Quiz này trong DB
        statement = select(func.max(QuizQuestion.order_index)).where(QuizQuestion.quiz_id == quiz_id)
        current_max = db.exec(statement).first()
        
        # Nếu chưa có câu hỏi nào thì bắt đầu từ 0, nếu có thì lấy số lớn nhất
        next_index = current_max if current_max is not None else 0
        
        db_objs = []
        for q in questions_in:
            next_index += 1  # Tự động tăng tiến sau mỗi câu hỏi
            db_obj = QuizQuestion(
                quiz_id=quiz_id,
                question_id=q.question_id,
                order_index=next_index,
                video_trigger_seconds=q.video_trigger_seconds,
            )
            db.add(db_obj)
            db_objs.append(db_obj)
            
        db.flush()  # Đẩy dữ liệu vào transaction
        return db_objs
    
    def delete_question_and_reorder(
        self, db: Session, *, quiz_id: UUID, question_id: UUID
    ) -> bool:
        """
        Xóa một câu hỏi ra khỏi Quiz và tự động dời các câu hỏi phía sau lên trước.
        """
        # 1. Tìm bản ghi câu hỏi cần xóa dựa trên cặp Khóa chính (quiz_id, question_id)
        statement = select(QuizQuestion).where(
            QuizQuestion.quiz_id == quiz_id,
            QuizQuestion.question_id == question_id
        )
        target_quiz_question = db.exec(statement).first()

        # Nếu không tìm thấy câu hỏi này trong đề thi, trả về False
        if not target_quiz_question:
            return False

        # Lưu lại vị trí (order_index) của câu hỏi chuẩn bị xóa
        deleted_index = target_quiz_question.order_index

        # 2. Tiến hành xóa câu hỏi mục tiêu
        db.delete(target_quiz_question)
        db.flush()  # Đẩy lệnh xóa vào transaction để giải phóng vị trí

        # 3. Tìm các câu hỏi đứng sau câu hỏi vừa xóa trong cùng một Quiz
        update_statement = select(QuizQuestion).where(
            QuizQuestion.quiz_id == quiz_id,
            QuizQuestion.order_index > deleted_index
        )
        subsequent_questions = db.exec(update_statement).all()

        # 4. Tịnh tiến dời thứ tự hiển thị của các câu hỏi phía sau lên 1 đơn vị
        for q in subsequent_questions:
            q.order_index -= 1
            db.add(q)
            
        db.flush()  # Đồng bộ toàn bộ thay đổi vào transaction hiện tại
        db.commit()
        return True

    # 🆕 Lấy 1 câu hỏi cố định theo cặp (quiz_id, question_id) - dùng để cập nhật video_trigger_seconds riêng
    def get_by_quiz_and_question(self, db: Session, *, quiz_id: UUID, question_id: UUID) -> QuizQuestion | None:
        statement = select(QuizQuestion).where(
            QuizQuestion.quiz_id == quiz_id,
            QuizQuestion.question_id == question_id,
        )
        return db.exec(statement).first()

    # 🆕 Lấy danh sách câu hỏi cố định của 1 quiz, sắp xếp theo order_index
    def get_multi_by_quiz(self, db: Session, quiz_id: UUID) -> list[QuizQuestion]:
        statement = (
            select(QuizQuestion)
            .where(QuizQuestion.quiz_id == quiz_id)
            .order_by(QuizQuestion.order_index)
        )
        return db.exec(statement).all()

    # 🆕 Sắp xếp lại thứ tự câu hỏi (kéo thả / nút lên-xuống ở FE gửi lên toàn bộ thứ tự mới)
    def reorder_questions(
        self, db: Session, *, quiz_id: UUID, ordered_items: list[tuple[UUID, int]]
    ) -> None:
        existing = {
            qq.question_id: qq for qq in self.get_multi_by_quiz(db, quiz_id)
        }
        for question_id, new_order in ordered_items:
            qq = existing.get(question_id)
            if qq:
                qq.order_index = new_order
                db.add(qq)
        db.commit()

    def get_trigger_seconds(self, db, quiz_id: UUID, question_id: UUID) -> int:
        statement = select(QuizQuestion.video_trigger_seconds).where(
            QuizQuestion.quiz_id == quiz_id,
            QuizQuestion.question_id == question_id
        )
        return db.exec(statement).first()

crud_quiz_question = CRUDQuizQuestion(QuizQuestion)