from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List
from app.api.v1.deps import SessionDep
from app.core.security import RoleChecker, get_current_user_role
from app.crud.module import crud_module
from app.crud.subject import crud_subject
from app.schemas.module import ModuleCreate, ModuleRead, ModuleUpdate, ModuleData

router = APIRouter(prefix="/modules", tags=["modules"])

# 🟢 Tạo Module
@router.post("/", response_model=ModuleRead, status_code=status.HTTP_201_CREATED)
def create_module(
    db: SessionDep,
    module_in: ModuleCreate,
    current_user: dict = Depends(get_current_user_role),
):
    user_id = UUID(current_user["user_id"])
    owner_id = crud_subject.get_owner(db, module_in.subject_id)
    if user_id != owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xóa module"
        )
    return crud_module.create(db, module_in)


# 🟡 Lấy danh sách Module (Đặt trước route dynamic)
@router.get("/", response_model=list[ModuleRead])
def get_modules(
    db: SessionDep,
    skip: int = Query(0, ge=0, description="Số lượng bản ghi bỏ qua"),
    limit: int = Query(10, ge=1, le=100, description="Số lượng bản ghi tối đa"),
    current_user: dict = Depends(get_current_user_role),
):
    return crud_module.get_multi(db, skip=skip, limit=limit)

@router.get("/get-list/{subject_id}", response_model=List[ModuleData])
def get_list_by_subject(
    db: SessionDep,
    subject_id: UUID,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = UUID(current_user["user_id"])
    owner_id = crud_subject.get_owner(db, subject_id)
    if user_id != owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xóa module"
        ) 
    result = []
    modules = crud_module.get_by_subject(db, subject_id)
    for module in modules:
        total_lessons = crud_module.count_lessons(db, module.module_id)
        data = ModuleData(
            module_id=module.module_id,
            title=module.title,
            total_lessons=total_lessons,
            order_index=module.order_index
        )
        result.append(data)

    return result

# 🔵 Lấy Module theo ID
@router.get("/{module_id}", response_model=ModuleRead)
def get_module(
    db: SessionDep,
    module_id: UUID,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = UUID(current_user["user_id"])
    owner_id = crud_module.get_course_owner(db, module_id)
    if user_id != owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xóa module"
        )    
    module = crud_module.get_by_id(db, module_id)
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Module not found"
        )
    return module


# 🟠 Cập nhật Module
@router.put("/{module_id}", response_model=ModuleRead)
def update_module(
    db: SessionDep,
    module_id: UUID,
    module_in: ModuleUpdate,
    current_user: dict = Depends(get_current_user_role),
):
    user_id = UUID(current_user["user_id"])
    owner_id = crud_module.get_course_owner(db, module_id)
    if user_id != owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xóa module"
        )
    db_obj = crud_module.get_by_id(db, module_id)
    if not db_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Module not found"
        )
    return crud_module.update(db, db_obj, module_in)


# 🔴 Xóa Module
@router.delete("/{module_id}")
def delete_module(
    db: SessionDep,
    module_id: UUID,
    current_user: dict = Depends(get_current_user_role),
):
    user_id = UUID(current_user["user_id"])
    owner_id = crud_module.get_course_owner(db, module_id)
    if user_id != owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xóa module"
        )
    db_obj = crud_module.delete(db, module_id)
    if not db_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Module not found"
        )
    return {"msg": "Module deleted successfully"}