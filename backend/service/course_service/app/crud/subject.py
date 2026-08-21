from app.crud.base import CRUDBase
from app.models.subject import Subject
from app.models.syllabus import Syllabus
from app.models.module import Module
from app.models.lesson import Lesson
from app.models.subject_collaborator_link import CourseCollaboratorLink
from app.schemas.subject import SubjectCreate, SubjectUpdate, GeneralInfoInstructorSubject
from app.schemas.enums import SubjectStatus
from uuid import UUID
from typing import Optional
from sqlmodel import Session, select, func, join, or_

class CRUDSubject(CRUDBase[Subject, SubjectCreate, SubjectUpdate, UUID]):
    def get_by_course(self, db: Session, course_id: UUID) -> list[Subject]:
        statement = select(Subject).where(Subject.course_id == course_id)
        return db.exec(statement).all()
    
    # Lấy tổng số môn học mà giảng viên đảm nhiệm
    def total_subject_by_instructor(self, db: Session, instructor_id: UUID) -> int:
        statement = (
            select(func.count(Subject.subject_id.distinct())) 
            .join(Syllabus, Syllabus.subject_id == Subject.subject_id)
            .where(Syllabus.instructor_id == instructor_id)
        )
        return db.exec(statement).first() or 0
    
    # Lấy tổng số môn học mà giảng viên đảm nhiệm theo trạng thái
    def get_total_instructor_subject_by_status(
        self, db: Session, instructor_id: UUID, status_id: SubjectStatus
    ) -> int:
        statement = (
            select(func.count(Subject.subject_id.distinct()))
            .join(Syllabus, Syllabus.subject_id == Subject.subject_id)
            .where(
                Syllabus.instructor_id == instructor_id,
                Subject.status_id == status_id
            )
        )
        return db.exec(statement).first() or 0
    
    def get_total_lessons(self, db: Session, subject_id: UUID) -> int:
        statement = (
            select(func.count(Lesson.lesson_id))
            .select_from(Lesson)
            .join(Module, Lesson.module_id == Module.module_id)
            .where(Module.subject_id == subject_id)
        )
        
        result = db.exec(statement).first() or 0
        
        return result or 0
    
    def get_instructor_subject_list(
        self, 
        db: Session, 
        instructor_id: UUID, 
        search: Optional[str] = None
    ) -> list[Subject]:
        """
        Lấy danh sách môn học của Giảng viên (JOIN qua Syllabus) và hỗ trợ tìm kiếm (Search)
        """
        # 1. Base query: JOIN qua Syllabus để lấy đúng môn giảng viên đảm nhiệm
        statement = (
            select(Subject)
            .join(Syllabus, Syllabus.subject_id == Subject.subject_id)
            .where(Syllabus.instructor_id == instructor_id)
        )

        # 2. Nếu có từ khóa tìm kiếm, lọc thêm theo tiêu đề hoặc mô tả môn học
        if search and search.strip():
            keyword = f"%{search.strip()}%"
            statement = statement.where(
                or_(
                    Subject.title.ilike(keyword),
                    Subject.description.ilike(keyword)
                )
            )

        return db.exec(statement).all()
    def get_owner(self, db: Session, subject_id: UUID) -> Optional[UUID]:
        statement = (
            select(Syllabus.instructor_id)
            .where(Syllabus.subject_id == subject_id)
        )
        return db.exec(statement).first()

    def get_ids_by_instructor(self, db: Session, instructor_id: UUID) -> list[UUID]:
        statement = (
            select(Subject.subject_id)
            .join(Syllabus, Syllabus.subject_id == Subject.subject_id)
            .where(Syllabus.instructor_id == instructor_id)
        )
        return db.exec(statement).all()

    def get_collaborator_subject_list(
        self, 
        db: Session, 
        collaborator_id: UUID, 
        search: Optional[str] = None
    ) -> list[Subject]:
        """
        Lấy danh sách môn học mà Cộng tác viên (Collaborator) được phân công trong bảng CourseCollaboratorLink
        """
        # 1. Query môn học JOIN qua bảng liên kết CourseCollaboratorLink
        statement = (
            select(Subject)
            .join(CourseCollaboratorLink, CourseCollaboratorLink.subject_id == Subject.subject_id)
            .where(CourseCollaboratorLink.collaborator_id == collaborator_id)
        )

        # 2. Hỗ trợ tìm kiếm theo tiêu đề hoặc mô tả môn học nếu có
        if search and search.strip():
            keyword = f"%{search.strip()}%"
            statement = statement.where(
                or_(
                    Subject.title.ilike(keyword),
                    Subject.description.ilike(keyword)
                )
            )

        return db.exec(statement).all()
crud_subject = CRUDSubject(Subject)
