from app.crud.base import CRUDBase
from app.models.syllabus import Syllabus
from app.schemas.syllabus import SyllabusCreate, SyllabusUpdate, CheckSyllabusInstructor
from uuid import UUID
from sqlmodel import Session, select

class CRUDSyllabus(CRUDBase[Syllabus, SyllabusCreate, SyllabusUpdate, UUID]):
    # 🔵 Lấy Đề cương dựa theo ID Môn học (vì quan hệ 1:1 nên chỉ lấy cái đầu tiên tìm thấy)
    def get_by_subject(self, db: Session, subject_id: UUID) -> Syllabus | None:
        statement = select(Syllabus).where(Syllabus.subject_id == subject_id)
        return db.exec(statement).first()
    def is_subject_instructor(self, db: Session, check_query: CheckSyllabusInstructor) -> bool:
        statement = select(Syllabus).where(
            Syllabus.instructor_id == check_query.instructor_id,
            Syllabus.subject_id == check_query.subject_id
        )
        return db.exec(statement).first() is not None
    
crud_syllabus = CRUDSyllabus(Syllabus)