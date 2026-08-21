from app.crud.base import CRUDBase
from app.models.certificate import Certificate
from app.schemas.certificate import CertificateCreate, CertificateUpdate
from uuid import UUID
from sqlmodel import Session, select, func

class CRUDCertificate(CRUDBase[Certificate, CertificateCreate, CertificateUpdate, UUID]):
    def get_multi_user_id(self, db: Session, user_id: UUID) -> list[Certificate]:
    # Truy vấn lấy toàn bộ bản ghi Certificate của user_id
        statement = select(Certificate).where(Certificate.user_id == user_id)
        results = db.exec(statement).all()
        return results
    def is_user_have_certificates(self, db: Session, user_id: UUID) -> bool:
        statement = select(Certificate).where(
            Certificate.user_id == user_id
        )
        return db.exec(statement).first is None
    def get_by_enrollment_id(self, db: Session, enrollment_id: UUID) -> Certificate:
        statement = select(Certificate).where(
            Certificate.enrollment_id == enrollment_id
        )
        return db.exec(statement).first()
crud_certificate = CRUDCertificate(Certificate)