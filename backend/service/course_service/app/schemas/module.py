from pydantic import BaseModel
from uuid import UUID
from typing import Optional, List
from app.schemas.lesson import LessonLearningStructure

class ModuleBase(BaseModel):
    title: str
    order_index: int = 1

class ModuleCreate(BaseModel):
    title: str
    subject_id: UUID
    order_index: Optional[int] = None

class ModuleUpdate(BaseModel):
    title: Optional[str] = None
    order_index: Optional[int] = None

class ModuleRead(ModuleBase):
    module_id: UUID
    subject_id: UUID

class ModulePreview(BaseModel):
    title: str

class ModuleLearningStructure(BaseModel):
    title: str
    module_id: UUID
    lessons: List[LessonLearningStructure]

class ModuleData(BaseModel):
    module_id: UUID
    title: str
    total_lessons: int
    order_index: int