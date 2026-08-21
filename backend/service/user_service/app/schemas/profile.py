from pydantic import BaseModel
from uuid import UUID
from datetime import date

class ProfileUpdate(BaseModel):
    firstname: str | None = None
    lastname: str | None = None
    bio: str | None = None
    avatar_url: str | None = None

    
class ProfileCreate(BaseModel):
    firstname: str
    lastname: str
    bio: str | None = None
    avatar_url: str | None = None

class ProfileInfo(BaseModel):
    firstname: str | None = None
    lastname: str | None = None
    birthdate: date | None = None
    bio: str | None = None
    avatar_url: str | None = None

class ProfileAvtPath(BaseModel):
    avatar_url: str