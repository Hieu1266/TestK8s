from sqlmodel import Session, select
from uuid import UUID
from app.models.course_instructor_link import CourseInstructorLink

class CRUDCourseInstructorLink:
    
    def create_link(self, db: Session, course_id: UUID, instructor_id: UUID) -> CourseInstructorLink:
        db_obj = CourseInstructorLink(course_id=course_id, instructor_id=instructor_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove_link(self, db: Session, course_id: UUID, instructor_id: UUID) -> Optional[CourseInstructorLink]:
        statement = select(CourseInstructorLink).where(
            CourseInstructorLink.course_id == course_id,
            CourseInstructorLink.instructor_id == instructor_id
        )
        obj = db.exec(statement).first()
        if obj:
            db.delete(obj)
            db.commit()
        return obj