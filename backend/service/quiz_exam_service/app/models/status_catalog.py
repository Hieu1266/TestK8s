from sqlmodel import Field, SQLModel
from enum import Enum
from typing import Optional
import sqlalchemy as sa

class StatusCatalog(SQLModel, table=True):
    __tablename__ = "status_catalog"
    status_id: str = Field(primary_key=True, index=True, max_length=50)
    entity_type: str = Field(
        sa_column=sa.Column(sa.String, nullable=False, server_default="COURSE"),
        default="COURSE"
    )
    # status_key: CourseStatus = Field(nullable=False, index=True)
    display_name: str = Field(nullable=False)
    description: Optional[str] = Field(default=None)