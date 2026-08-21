import uuid
from uuid import UUID
from sqlmodel import Field, SQLModel

class QuestionPoolLink(SQLModel, table=True):
    __tablename__ = "question_pool_link"

    pool_id: UUID = Field(foreign_key="question_pool.pool_id", primary_key=True, ondelete="CASCADE")
    question_id: UUID = Field(foreign_key="question.question_id", primary_key=True, ondelete="CASCADE")