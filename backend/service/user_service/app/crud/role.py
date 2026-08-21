from sqlmodel import Session, select
from app.crud.base import CRUDBase
from app.models.role import Role
from typing import Any

class CRUDRole(CRUDBase[Role, Any, Any, int]):
    def get_name_by_id(self, db: Session, id: int) -> str | None:
        statement = select(self.model.role_name).where(self.model.role_id == id)
        return db.exec(statement).first()
    def get_role_mapping_by_ids(self, db: Session, ids: list[int]) -> dict[int, str]:
        if not ids:
            return {}
        statement = select(self.model.role_id, self.model.role_name).where(self.model.role_id.in_(ids))
        results = db.exec(statement).all()
        return {role_id: role_name for role_id, role_name in results}
crud_role = CRUDRole(Role)