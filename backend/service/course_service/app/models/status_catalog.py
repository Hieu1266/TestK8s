from sqlmodel import Field, SQLModel
from enum import Enum
from typing import Optional
import sqlalchemy as sa

class StatusCatalog(SQLModel, table=True):
    __tablename__ = "status_catalog"
    status_id: str = Field(primary_key=True, index=True, max_length=50)
    entity_type: str = Field(nullable=False)
    status_key: str = Field(nullable=False, index=True)
    display_name: str = Field(nullable=False)
    description: Optional[str] = Field(default=None)