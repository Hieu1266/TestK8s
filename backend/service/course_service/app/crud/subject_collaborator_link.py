from typing import List, Optional
from uuid import UUID
from sqlmodel import Session, select
from app.models.subject_collaborator_link import CourseCollaboratorLink
from app.schemas.subject_collaborator_link import CourseCollaboratorLinkBase


class CRUDSubjectCollaboratorLink:
    def get_by_subject_and_collaborator(
        self, db: Session, *, subject_id: UUID, collaborator_id: UUID
    ) -> Optional[CourseCollaboratorLink]:
        statement = select(CourseCollaboratorLink).where(
            CourseCollaboratorLink.subject_id == subject_id,
            CourseCollaboratorLink.collaborator_id == collaborator_id,
        )
        return db.exec(statement).first()

    def get_by_subject(self, db: Session, *, subject_id: UUID) -> List[CourseCollaboratorLink]:
        statement = select(CourseCollaboratorLink).where(
            CourseCollaboratorLink.subject_id == subject_id
        )
        return db.exec(statement).all()

    def create(self, db: Session, *, obj_in: CourseCollaboratorLinkBase) -> CourseCollaboratorLink:
        db_obj = CourseCollaboratorLink(
            subject_id=obj_in.subject_id,
            collaborator_id=obj_in.collaborator_id,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove_by_subject_and_collaborator(
        self, db: Session, *, subject_id: UUID, collaborator_id: UUID
    ) -> None:
        db_obj = self.get_by_subject_and_collaborator(
            db, subject_id=subject_id, collaborator_id=collaborator_id
        )
        if db_obj:
            db.delete(db_obj)
            db.commit()


crud_collab_subject = CRUDSubjectCollaboratorLink()