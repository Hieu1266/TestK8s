from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional

class CertificateCreate(BaseModel):
    full_name: str 
    course_name: str
    user_id: UUID
    enrollment_id: UUID

class CertificateUpdate(BaseModel):
    full_name: str | None = None
    course_name: str | None = None

class CertificateItem(BaseModel):
    course_name: str
    created_at: datetime
    