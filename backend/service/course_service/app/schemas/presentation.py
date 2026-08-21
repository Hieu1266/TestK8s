from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class PresentationCreate(BaseModel):
    lesson_id: UUID
    title: Optional[str] = Field(default=None, max_length=255)


class PresentationUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=255)



class PresentationSlideCreate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=150)
    content_body: str = Field(min_length=1)
    slide_order: int = Field(ge=1)


class PresentationSlideUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=150)
    content_body: Optional[str] = Field(default=None, min_length=1)
    slide_order: Optional[int] = Field(default=None, ge=1)

class PresentationSlideReorder(BaseModel):
    slide_ids: List[UUID] = Field(min_length=1)

class PresentationSlideResponse(BaseModel):
    slide_id: UUID
    presentation_id: UUID
    title: Optional[str] = None
    content_body: str
    slide_order: int

    class Config:
        from_attributes = True


class PresentationResponse(BaseModel):
    presentation_id: UUID
    lesson_id: UUID
    title: Optional[str] = None
    slides: List[PresentationSlideResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True