from sqlmodel import SQLModel, Field
from typing import Optional
from uuid import UUID
import uuid

class Profile(SQLModel, table=True):
    __tablename__= "profile"
    profile_id: UUID = Field(primary_key=True, default_factory=uuid.uuid4, index=True)
    user_id: UUID = Field(foreign_key="user.user_id", unique=True, index=True, nullable=False)
    firstname: str = Field(nullable=False, max_length=50)
    lastname: Optional[str] = Field(default=None, max_length=50)
    bio: Optional[str] = Field(default=None, max_length=255)
    avatar_url: Optional[str] = Field(default=None)
