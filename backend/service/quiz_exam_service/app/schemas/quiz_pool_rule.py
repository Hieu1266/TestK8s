from pydantic import BaseModel, Field
from uuid import UUID
from app.models.quiz_pool_rule import QuizPoolRule

class QuizPoolRuleCreate(BaseModel):
    quiz_id: UUID
    pool_id: UUID
    quantity: int = Field(..., gt=0) 

class QuizPoolRuleUpdate(BaseModel):
    quantity: int = Field(..., gt=0)



