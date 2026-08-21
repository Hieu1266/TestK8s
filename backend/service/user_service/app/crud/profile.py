from sqlmodel import Session, select
from app.crud.base import CRUDBase
from app.models.profile import Profile
from app.schemas.profile import ProfileUpdate
from uuid import UUID
from typing import Any

class CRUDProfile(CRUDBase[Profile, Any, ProfileUpdate, UUID]):
    def get_by_user_id(self, db: Session, user_id: UUID) -> Profile | None:
        statement = select(self.model).where(self.model.user_id == user_id)
        return db.exec(statement).first()

crud_profile = CRUDProfile(Profile)
