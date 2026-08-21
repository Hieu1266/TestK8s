import os
import shutil  
import uuid   
from fastapi import APIRouter, File, UploadFile, HTTPException, status, Depends
from uuid import UUID
from app.models.curriculum import Curriculum
from app.models.course_instructor_link import CourseInstructorLink
from app.models.course import Course
from app.api.v1.deps import SessionDep
from app.core.security import RoleChecker
from app.crud.curriculum import crud_curriculum
from typing import Optional
from app.schemas.curriculum import CurriculumCreate, CurriculumUpdate, CurriculumRead, CurriculumFileUploadResponse
from app.crud.curriculum import crud_curriculum
from app.crud.curriculum_media import crud_curriculum_media


router = APIRouter(prefix="/curriculums", tags=["curriculums"])

@router.post("/upload", response_model=CurriculumFileUploadResponse)
def upload_file_only(
    file: UploadFile = File(...), 
    current_user: dict = Depends(RoleChecker(["Admin", "Instructor", "Manager"]))
):
    path = crud_curriculum_media.upload_file(file)
    return {"file_path": path}


# 🟢 2. Tạo bản ghi (Hứng bằng schema mới và gọi qua crud_curriculum)
@router.post("/", response_model=CurriculumRead, status_code=status.HTTP_201_CREATED)
def create_curriculum(
    payload: CurriculumCreate,          
    db: SessionDep,
    current_user: dict = Depends(RoleChecker(["Admin", "Instructor", "Manager"]))
):
    if not payload.assigner_id:
        user_id = current_user.id if hasattr(current_user, 'id') else current_user.get("user_id")
        payload.assigner_id = user_id

    return crud_curriculum.create(db=db, obj_in=payload)


# 🔵 3. Lấy toàn bộ danh sách Curriculum
@router.get("/", response_model=list[CurriculumRead])
def get_curriculums(db: SessionDep, skip: int = 0, limit: Optional[int] = None):
    curriculums = crud_curriculum.get_multi(db, skip=skip, limit=limit)
    
    results = []
    for curr in curriculums:
        course = db.query(Course).filter(Course.curriculum_id == curr.curriculum_id).first()
        curr_data = curr.model_dump() # hoặc curr.dict() tùy phiên bản pydantic bạn đang dùng
        if course:
            link = db.query(CourseInstructorLink).filter(CourseInstructorLink.course_id == course.course_id).first()
            if link:
                curr_data["instructor_id"] = link.instructor_id
            else:
                curr_data["instructor_id"] = None
        else:
            curr_data["instructor_id"] = None
            
        results.append(curr_data)

    return results



# 🔵 4. Lấy chi tiết Curriculum theo ID
@router.get("/{curriculum_id}", response_model=CurriculumRead)
def get_curriculum(
    db: SessionDep,
    curriculum_id: UUID,
    current_user: dict = Depends(RoleChecker(["Admin", "Instructor", "Student", "Manager"]))
):
    curriculum = crud_curriculum.get_by_id(db=db, id=curriculum_id)
    if not curriculum:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy Curriculum tương ứng")
    return curriculum


# 🟡 5. Cập nhật Curriculum theo ID
@router.put("/{curriculum_id}", response_model=CurriculumRead)
def update_curriculum(
    curriculum_id: UUID,
    payload: CurriculumUpdate,
    db: SessionDep,
    current_user: dict = Depends(RoleChecker(["Admin", "Instructor", "Manager"]))
):
    db_obj = crud_curriculum.get_by_id(db=db, id=curriculum_id)
    if not db_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy chương trình đào tạo cần sửa")
    
    return crud_curriculum.update(db=db, db_obj=db_obj, obj_in=payload)


# 🔴 6. Xóa Curriculum khỏi hệ thống
@router.delete("/{curriculum_id}")
def delete_curriculum(
    curriculum_id: UUID,
    db: SessionDep,   
    current_user: dict = Depends(RoleChecker(["Admin", "Instructor", "Manager"]))
):
    # Gọi hàm delete đã gom gọn logic truy vấn SQL ở file CRUD
    db_obj = crud_curriculum.delete(db=db, id=curriculum_id)
    
    if not db_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Không tìm thấy chương trình đào tạo cần xóa"
        )
        
    return {"message": "Xóa chương trình đào tạo khỏi hệ thống thành công"}