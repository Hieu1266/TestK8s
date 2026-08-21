from sqlmodel import Session, select
from datetime import datetime, timezone
from uuid import UUID
from app.crud.base import CRUDBase
from app.models.lesson_progress import LessonProgress
from app.schemas.lesson_progress import LessonProgressCreate, LessonProgressUpdate
from app.models.enum import LessonStatus
from app.core.config import settings
import httpx

class CRUDLessonProgress(CRUDBase[LessonProgress, LessonProgressCreate, LessonProgressUpdate, UUID]):
    def get_by_id(self, db: Session, progress_id: UUID) -> LessonProgress:
        statement = select(LessonProgress).where(
            LessonProgress.progress_id == progress_id
        )
        return db.exec(statement).first()
    
    # Lấy tiến độ của 1 bài học cụ thể thuộc 1 học viên
    def get_by_lesson(self, db: Session, user_id: UUID, lesson_id: UUID) -> LessonProgress | None:
        statement = select(self.model).where(
            self.model.user_id == user_id,
            self.model.lesson_id == lesson_id
        )
        return db.exec(statement).first()

    # Lấy toàn bộ tiến độ các bài học trong một của học viên
    def get_by_course(self, db: Session, user_id: UUID, course_id: UUID) -> list[LessonProgress]:
        statement = select(self.model).where(
            self.model.user_id == user_id,
            self.model.course_id == course_id
        )
        return db.exec(statement).all()

    # Hàm chuyên biệt cập nhật trạng thái kèm tự động update thời gian thực `updated_at`
    def update_status(self, db: Session, db_obj: LessonProgress, status: LessonStatus) -> LessonProgress:
        db_obj.status = status
        db_obj.updated_at = datetime.now(timezone.utc)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def init_course_progress(self, db: Session, user_id: UUID, course_id: UUID, lessons: list[dict], is_tested: bool):
        for index, lesson in enumerate(lessons):
            lesson_id = lesson["lesson_id"]
            is_optional = lesson["is_optional"]
            has_quiz = lesson.get("has_quiz", False)  
            first_subject_lesson = lesson.get("first_subject_lesson", False)
            if not is_tested: 
                if first_subject_lesson or is_optional:
                    initial_status = LessonStatus.UNLOCKED
                else:
                    initial_status = LessonStatus.LOCKED
            else: 
                initial_status = LessonStatus.UNLOCKED
            
            db_obj = LessonProgress(
                user_id=user_id,
                course_id=course_id,
                lesson_id=lesson_id,
                status=initial_status,
                quiz_passed=False if has_quiz else True  # Logic xử lý gán quiz_passed
            )
            db.add(db_obj)
        db.commit()

    def remove_by_course(self, db: Session, user_id: UUID, course_id: UUID):
        statement = select(LessonProgress).where(
            LessonProgress.user_id == user_id,
            LessonProgress.course_id == course_id
        )
        lessons = db.exec(statement).all()
        for lesson in lessons:
            db.delete(lesson)
        db.commit()

    def count_completed_lessons(self, db: Session, user_id: UUID, course_id: UUID) -> int:
        """
        Đếm tổng số bản ghi tiến độ có trạng thái COMPLETED của học viên trong khóa học.
        """
        statement = select(LessonProgress).where(
            LessonProgress.user_id == user_id,
            LessonProgress.course_id == course_id,
            LessonProgress.status == LessonStatus.COMPLETED
        )
        results = db.exec(statement).all()
        return len(results)

    def complete_and_unlock_next_by_lesson(
        self, db: Session, user_id: UUID, lesson_id: UUID, ordered_lessons: list[dict]
    ) -> LessonProgress | None:
        # 1. Tìm bản ghi tiến độ thông qua user_id và lesson_id
        current_progress = self.get_by_lesson(db, user_id=user_id, lesson_id=lesson_id)
        if not current_progress:
            return None

        if current_progress.status == LessonStatus.COMPLETED:
            return current_progress

        # Đánh dấu bài hiện tại thành COMPLETED
        current_progress.status = LessonStatus.COMPLETED
        current_progress.updated_at = datetime.now(timezone.utc)
        db.add(current_progress)

        lesson_ids = [UUID(str(l["lesson_id"])) for l in ordered_lessons]
        
        try:
            current_index = lesson_ids.index(current_progress.lesson_id)
            current_lesson_info = ordered_lessons[current_index]
            
            # Nếu là bài học không bắt buộc (is_optional = True), dừng lại và không mở bài tiếp theo
            if current_lesson_info.get("is_optional", False):
                db.commit()
                db.refresh(current_progress)
                return current_progress

            # 2. Mở khóa bài bắt buộc tiếp theo đang ở trạng thái LOCKED
            for next_index in range(current_index + 1, len(lesson_ids)):
                next_lesson_id = lesson_ids[next_index]
                next_progress = self.get_by_lesson(db, user_id=user_id, lesson_id=next_lesson_id)
                
                if next_progress and next_progress.status == LessonStatus.LOCKED:
                    next_progress.status = LessonStatus.UNLOCKED
                    next_progress.updated_at = datetime.now(timezone.utc)
                    db.add(next_progress)
                    break
                    
        except ValueError:
            print(f"DEBUG: Không tìm thấy lesson_id {current_progress.lesson_id} trong mảng lộ trình.")

        db.commit()
        db.refresh(current_progress)
        return current_progress
    
    def get_lesson_progress_status(self, db: Session, lesson_id: UUID, user_id: UUID) -> LessonStatus:
        statement = select(LessonProgress.status).where(
            LessonProgress.lesson_id == lesson_id,
            LessonProgress.user_id == user_id
        )
        return db.exec(statement).first()

    def unlock_next_lesson_only(
        self, db: Session, user_id: UUID, lesson_id: UUID, ordered_lessons: list[dict]
    ) -> LessonProgress | None:
        current_progress = self.get_by_lesson(db, user_id=user_id, lesson_id=lesson_id)
        if not current_progress:
            return None

        lesson_ids = [UUID(str(l["lesson_id"])) for l in ordered_lessons]

        try:
            current_index = lesson_ids.index(lesson_id)
            current_lesson_info = ordered_lessons[current_index]

            # Giữ đúng quy tắc cũ: bài học không bắt buộc thì không tự động mở bài tiếp theo
            if current_lesson_info.get("is_optional", False):
                return None

            # Quét về phía trước, chỉ mở khóa bài BẮT BUỘC (is_optional == False)
            # và CHƯA hoàn thành (status != COMPLETED) để tránh mở nhầm/mở lặp
            # khi hàm này bị gọi nhiều lần (ví dụ do nộp bài nhiều lần).
            for next_index in range(current_index + 1, len(lesson_ids)):
                next_lesson_id = lesson_ids[next_index]
                next_lesson_info = ordered_lessons[next_index]
                next_progress = self.get_by_lesson(db, user_id=user_id, lesson_id=next_lesson_id)

                if not next_progress:
                    continue

                is_next_optional = next_lesson_info.get("is_optional", False)

                # Bỏ qua bài optional trong lúc quét — không dừng tại đây,
                # tiếp tục tìm bài bắt buộc tiếp theo phía sau
                if is_next_optional:
                    continue

                # Nếu bài bắt buộc gặp đầu tiên đã COMPLETED rồi thì không cần mở lại,
                # dừng quét luôn vì các bài phía sau chắc chắn đã có trạng thái hợp lệ
                if next_progress.status == LessonStatus.COMPLETED:
                    return None

                if next_progress.status == LessonStatus.LOCKED:
                    next_progress.status = LessonStatus.UNLOCKED
                    next_progress.updated_at = datetime.now(timezone.utc)
                    db.add(next_progress)
                    db.commit()
                    db.refresh(next_progress)
                    return next_progress

                # Trạng thái khác LOCKED/COMPLETED (vd. đã UNLOCKED sẵn) -> không cần mở nữa
                return None

        except ValueError:
            print(f"DEBUG: Không tìm thấy lesson_id {lesson_id} trong mảng lộ trình.")

        return None
    def mark_completed_only(self, db: Session, user_id: UUID, lesson_id: UUID) -> LessonProgress | None:
        """
        Đánh dấu duy nhất bài học được chỉ định thành COMPLETED mà KHÔNG tự động mở khóa bài học tiếp theo.
        """
        # 1. Chuyển đổi kiểu dữ liệu sang UUID nếu đầu vào là chuỗi str
        if isinstance(user_id, str):
            user_id = UUID(user_id)
        if isinstance(lesson_id, str):
            lesson_id = UUID(lesson_id)

        # 2. Lấy tiến độ bài học của học viên
        progress = self.get_by_lesson(db, user_id=user_id, lesson_id=lesson_id)
        if not progress:
            return None

        # Nếu đã ở trạng thái COMPLETED thì giữ nguyên
        if progress.status == LessonStatus.COMPLETED:
            return progress

        # 3. Cập nhật trạng thái
        progress.status = LessonStatus.COMPLETED
        progress.updated_at = datetime.now(timezone.utc)
        db.add(progress)
        db.commit()
        db.refresh(progress)
        return progress

crud_lesson_progress = CRUDLessonProgress(LessonProgress)