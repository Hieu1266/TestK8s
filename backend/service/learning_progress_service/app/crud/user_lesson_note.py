from sqlmodel import Session, select, delete, col
from typing import Optional, List
from datetime import datetime, timezone
from app.crud.base import CRUDBase
from app.schemas.user_lesson_note import NoteUpdate, NoteCreate
from app.models.user_lesson_note import UserLessonNote
from app.models.lesson_progress import LessonProgress
from uuid import UUID

class CRUDNote(CRUDBase[UserLessonNote, NoteCreate, NoteUpdate, UUID]):
    def delete_note_by_user(
        self, db: Session, note_id: UUID, user_id: UUID
    ) -> Optional[UserLessonNote]:
        statement = select(UserLessonNote).where(
            UserLessonNote.note_id == note_id,
            UserLessonNote.user_id == user_id
        )
        note = db.exec(statement).first()
        if not note:
            return None

        db.delete(note)
        db.commit()
        return note
    
    def delete_notes_by_user_and_course(
        self, db: Session, user_id: UUID, course_id: UUID
    ) -> bool:
        statement = delete(UserLessonNote).where(
            UserLessonNote.user_id == user_id,
            UserLessonNote.course_id == course_id
        )
        
        result = db.exec(statement)
        db.commit()
        
        # Trả về True nếu có ít nhất 1 dòng bị xóa
        return result.rowcount > 0

    def update(
        self, db: Session, db_obj: UserLessonNote, obj_in: NoteUpdate
    ) -> UserLessonNote:
        # Cập nhật mốc thời gian trước khi gọi hàm base
        db_obj.updated_at = datetime.now(timezone.utc)
        return super().update(db, db_obj=db_obj, obj_in=obj_in)

    def get_course_note(self, db: Session, note_id: UUID) -> UUID:
        statement = select(LessonProgress.course_id).join(
            LessonProgress, LessonProgress.lesson_id == UserLessonNote.lesson_id
        ).where(
            UserLessonNote.note_id == note_id
        )
        return db.exec(statement).first()

    def get_multi_by_user_and_lesson(
        self, db: Session, user_id: UUID, lesson_id: UUID
    ) -> List[UserLessonNote]:
        """
        Lấy danh sách ghi chú của 1 học viên trong 1 bài học,
        sắp xếp theo mốc thời gian chạy video (timestamp_seconds).
        """
        statement = (
            select(UserLessonNote)
            .where(
                UserLessonNote.user_id == user_id,
                UserLessonNote.lesson_id == lesson_id
            )
            # Sắp xếp theo timestamp của video, các note không có timestamp sẽ nằm ở cuối
            .order_by(
                col(UserLessonNote.timestamp_seconds).asc().nulls_last(),
                UserLessonNote.created_at.asc()
            )
        )
        return list(db.exec(statement).all())
crud_note = CRUDNote(UserLessonNote)