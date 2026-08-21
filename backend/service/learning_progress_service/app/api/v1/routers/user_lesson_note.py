from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from app.core.security import get_current_user_role
from app.api.v1.deps import SessionDep
from app.schemas.user_lesson_note import NoteCreate, NoteUpdate, NoteIn, NoteResponse
from uuid import UUID  
from app.crud.lesson_progress import crud_lesson_progress
from app.crud.course_enrollment import crud_course_enrollment
from app.crud.user_lesson_note import crud_note

router = APIRouter(prefix="/note", tags=["notes"])

@router.get("/get-lesson-notes/{lesson_id}", response_model=List[NoteResponse])
def get_lesson_notes(
    db: SessionDep,
    lesson_id: UUID,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = UUID(current_user["user_id"])

    if not crud_course_enrollment.check_enrolled_by_lesson(db, user_id, lesson_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn chưa đăng ký khóa học chứa bài học này"
        )

    return crud_note.get_multi_by_user_and_lesson(db, user_id, lesson_id)




@router.post(
    "/", 
    response_model=NoteResponse, 
    status_code=status.HTTP_201_CREATED
)
def create_note(
    db: SessionDep,
    obj_in: NoteIn,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = current_user["user_id"]

    # 1. Dùng obj_in.course_id để kiểm tra enrollment
    if not crud_course_enrollment.check_already_enrolled(db, user_id, obj_in.course_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn chưa đăng ký khóa học này để tạo ghi chú"
        )

    # 2. Khởi tạo schema NoteCreate
    new_note = NoteCreate(
        user_id=user_id,
        course_id=obj_in.course_id,
        lesson_id=obj_in.lesson_id,
        timestamp_seconds=obj_in.timestamp_seconds,
        content=obj_in.content
    )

    # 3. Tạo record trong DB và trả về object vừa tạo (Chuẩn RESTful API)
    created_note = crud_note.create(db, obj_in=new_note)
    return created_note

@router.get("/{note_id}", response_model=NoteResponse)
def get_note(
    db: SessionDep,
    note_id: UUID,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = UUID(current_user["user_id"])
    note = crud_note.get_by_id(db, note_id)
    if user_id != note.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền lấy ghi chú trên"
        )

    return note

@router.delete("/{note_id}")
def delete_note(
    db: SessionDep,
    note_id: UUID,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = UUID(current_user["user_id"])
    note = crud_note.get_by_id(db, note_id)
    if user_id != note.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xóa ghi chú trên"
        )
    crud_note.delete(db, note_id)

    return {
        "success": True,
        "message": "Xóa ghi chú thành công"
    }

@router.patch("/{note_id}")
def update_note(
    db: SessionDep,
    note_id: UUID,
    obj_in: NoteUpdate,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = UUID(current_user["user_id"])
    note = crud_note.get_by_id(db, note_id)
    if user_id != note.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền chỉnh sửa ghi chú trên"
        )
    crud_note.update(db, note, obj_in)
    return {
        "success": True,
        "message": "Cập nhật ghi chú thành công"
    }