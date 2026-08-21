from sqlmodel import Session, select
from app.crud.base import CRUDBase
from app.models.status_catalog import StatusCatalog
from typing import Any

class CRUDStatus(CRUDBase[StatusCatalog, Any, Any, str]):
    def get_display_status(self, db: Session, status_id: str) -> str:
        statement = select(StatusCatalog.display_name).where(
            StatusCatalog.status_id == status_id
        )
        return db.exec(statement).first()
    
    def get_status_mapping_by_ids(self, db: Session, status_ids: list[int]) -> dict[int, str]:
        """
        Lấy danh sách trạng thái theo IDs và trả về dạng dictionary {id: display_name}
        """
        if not status_ids:
            return {}
            
        stmt = select(StatusCatalog).where(StatusCatalog.status_id.in_(status_ids))
        statuses = db.exec(stmt).all() 
    
        return {status.status_id: status.display_name for status in statuses}
    
crud_status = CRUDStatus(StatusCatalog)