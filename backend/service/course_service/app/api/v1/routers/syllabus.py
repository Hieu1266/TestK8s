import os
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status, UploadFile, File
from fastapi.responses import FileResponse

from app.api.v1.deps import SessionDep
from app.core.security import RoleChecker
from app.crud.syllabus import crud_syllabus
from app.crud.syllabus_media import crud_syllabus_media  # 🟢 Import module media vừa tạo
from app.schemas.enums import SyllabusStatus
from app.schemas.syllabus import (
    CheckSyllabusInstructor,
    SyllabusCreate,
    SyllabusRead,
    SyllabusUpdate,
)

from fastapi.responses import RedirectResponse  # 🟢 Import RedirectResponse

NGINX_MEDIA_URL = os.getenv("NGINX_MEDIA_URL", "http://localhost:8081")

router = APIRouter(prefix="/syllabus", tags=["syllabus"])


# 🟢 1. API Upload file đề cương
@router.post("/upload")
def upload_file_only(
    file: UploadFile = File(...), 
    current_user: dict = Depends(RoleChecker(["Admin", "Instructor", "Manager"]))
):
    path = crud_syllabus_media.upload_file(file)
    return {"file_path": path}


# 🔵 2. API: Lấy thông tin đề cương theo ID Môn học
@router.get("/subject/{subject_id}", response_model=SyllabusRead, status_code=status.HTTP_200_OK)
def get_syllabus_by_subject(
    subject_id: UUID,
    db: SessionDep,
    request: Request,
    current_user: dict = Depends(RoleChecker(["Admin", "Instructor", "Student", "Manager"]))
):
    syllabus = crud_syllabus.get_by_subject(db=db, subject_id=subject_id)
    if not syllabus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Môn học này chưa có dữ liệu đề cương chi tiết."
        )
    return syllabus


# 🟢 3. API: Tạo mới một đề cương
@router.post("/", response_model=SyllabusRead, status_code=status.HTTP_201_CREATED)
def create_syllabus(
    payload: SyllabusCreate,
    db: SessionDep,
    current_user: dict = Depends(RoleChecker(["Admin", "Instructor", "Manager"]))
):
    existing = crud_syllabus.get_by_subject(db=db, subject_id=payload.subject_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Môn học này đã tồn tại đề cương, vui lòng sử dụng phương thức cập nhật."
        )
    
    if payload.status_id == "SYLLABUS_DRAFT" or not payload.status_id:
        payload.status_id = SyllabusStatus.SYLLABUS_DRAFT.value

    return crud_syllabus.create(db=db, obj_in=payload)


# 🟡 4. API: Cập nhật thông tin đề cương theo ID
@router.put("/{syllabus_id}", response_model=SyllabusRead, status_code=status.HTTP_200_OK)
def update_syllabus(
    syllabus_id: UUID,
    payload: SyllabusUpdate,
    db: SessionDep,
    current_user: dict = Depends(RoleChecker(["Admin", "Instructor", "Manager"]))
):
    db_obj = crud_syllabus.get_by_id(db=db, id=syllabus_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy đề cương yêu cầu.")
    return crud_syllabus.update(db=db, db_obj=db_obj, obj_in=payload)


@router.get("/check-instructor", response_model=bool)
def is_subject_instructor(
    db: SessionDep,
    instructor_id: UUID = Query(...),
    subject_id: UUID = Query(...)
):
    query = CheckSyllabusInstructor(subject_id=subject_id, instructor_id=instructor_id)
    return crud_syllabus.is_subject_instructor(db, query)



@router.get("/download/{syllabus_id}")
def download_syllabus_file(
    syllabus_id: UUID,
    db: SessionDep,
    current_user: dict = Depends(RoleChecker(["Admin", "Instructor", "Student", "Manager"]))
):
    syllabus = crud_syllabus.get_by_id(db=db, id=syllabus_id)
    if not syllabus or not syllabus.syllabus_file_path:
        raise HTTPException(status_code=404, detail="Không tìm thấy tập tin đề cương.")
    clean_path = syllabus.syllabus_file_path.lstrip('/')
    file_url = f"{NGINX_MEDIA_URL}/{clean_path}"
    
    return RedirectResponse(url=file_url)



# 🔴 6. API: Xóa đề cương theo ID
@router.delete("/{syllabus_id}", status_code=status.HTTP_200_OK)
def delete_syllabus(
    syllabus_id: UUID,
    db: SessionDep,
    current_user: dict = Depends(RoleChecker(["Admin", "Manager"]))
):
    db_obj = crud_syllabus.get_by_id(db=db, id=syllabus_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy đề cương yêu cầu.")

    crud_syllabus.delete(db=db, id=syllabus_id)
    return {"msg": "Xóa đề cương thành công"}