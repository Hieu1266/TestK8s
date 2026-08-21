import asyncio
from fastapi import APIRouter, HTTPException, Depends, status, Request
from typing import List
from uuid import UUID
import httpx
from app.core.config import settings
from app.core.security import get_current_user_role
from app.crud.certificate import crud_certificate
from app.crud.course_enrollment import crud_course_enrollment
from app.api.v1.deps import SessionDep
from app.schemas.certificate import CertificateItem, CertificateCreate

router = APIRouter(prefix="/certificate", tags=["certificate"])

@router.get("/get-list", response_model=List[CertificateItem])
def get_certificate_list(
    db: SessionDep,
    current_user: dict = Depends(get_current_user_role)
):
    user = current_user["user_id"]

    certificates = crud_certificate.get_multi_user_id(db, user)
    
    if not certificates:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nguoi dung khong ton tai hoac chua so huu chung chi"
        )
    
    return [
        {
            "course_name": cert.course_name, 
            "created_at": cert.created_at
        } 
        for cert in certificates
    ]