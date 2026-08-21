from sqlmodel import Session, select
from app.crud.base import CRUDBase
from app.models.status_catalog import StatusCatalog
from typing import Any

class CRUDStatus(CRUDBase[StatusCatalog, Any, Any, str]):
    pass

crud_status = CRUDStatus(StatusCatalog)