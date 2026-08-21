from app.crud.base import CRUDBase
from app.models.comment import Comment
from app.models.course_enrollment import CourseEnrollment
from app.models.enum import StructurePart, CommentStatus
from app.schemas.comment import CommentCreate, CommentUpdate
from uuid import UUID
from sqlmodel import Session, select


class CRUDComment(CRUDBase[Comment, CommentCreate, CommentUpdate, UUID]):

    def get_by_id(self, db: Session, comment_id: UUID) -> Comment | None:
        statement = select(Comment).where(Comment.comment_id == comment_id)
        return db.exec(statement).first()

    def get_multi_by_enrollment(self, db: Session, enrollment_id: UUID) -> list[Comment]:
        statement = select(Comment).where(Comment.enrollment_id == enrollment_id)
        return db.exec(statement).all()

    def get_by_enrollment_and_part(
        self, db: Session, enrollment_id: UUID, structure_part: StructurePart, part_id: UUID
    ) -> Comment | None:
        statement = select(Comment).where(
            Comment.enrollment_id == enrollment_id,
            Comment.structure_part == structure_part,
            Comment.part_id == part_id,
        )
        return db.exec(statement).first()

    # Chỉ join CourseEnrollment (cùng service/DB) — KHÔNG join User (khác service)
    def get_multi_by_course(self, db: Session, course_id: UUID) -> list[Comment]:
        statement = (
            select(Comment)
            .join(CourseEnrollment, Comment.enrollment_id == CourseEnrollment.enrollment_id)
            .where(CourseEnrollment.course_id == course_id)
            .order_by(Comment.structure_part, Comment.part_id)
        )
        return db.exec(statement).all()

    # Lấy comment theo NHIỀU course cùng lúc (dùng cho instructor xem toàn bộ khóa học của mình)
    def get_multi_by_courses(self, db: Session, course_ids: list[UUID]) -> list[Comment]:
        if not course_ids:
            return []
        statement = (
            select(Comment)
            .join(CourseEnrollment, Comment.enrollment_id == CourseEnrollment.enrollment_id)
            .where(CourseEnrollment.course_id.in_(course_ids))
            .order_by(Comment.structure_part, Comment.part_id)
        )
        return db.exec(statement).all()

    def update_status(self, db: Session, comment_id: UUID, new_status: CommentStatus) -> Comment | None:
        comment = self.get_by_id(db, comment_id)
        if not comment:
            return None
        comment.status = new_status
        db.add(comment)
        db.commit()
        db.refresh(comment)
        return comment


crud_comment = CRUDComment(Comment)