from pydantic import BaseModel
from uuid import UUID
from typing import Optional

class TagCreate(BaseModel):
    tag_name: str
    description: Optional[str] = None

class TagUpdate(BaseModel):
    tag_id: UUID
    tag_name: Optional[str] = None
    description: Optional[str] = None

class TagItem(BaseModel):
    tag_id: UUID
    tag_name: str
    description: Optional[str] = None

class TagListQuery(BaseModel):
    skip: int = 0
    limit: int = 10

class TagName(BaseModel):
    tag_id: UUID
    tag_name: str
