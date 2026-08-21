from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.api.v1.deps import SessionDep
from app.core.security import get_current_user_role, call_check_instructor_service
from app.schemas.question_option import QuestionOptionCreate, QuestionOptionAutoCreate, QuestionOptionItem, QuestionOptionUpdate
from uuid import UUID
from app.crud.question import crud_question
from app.crud.question_option import crud_question_option

router = APIRouter(prefix="/question-options", tags=["question-options"])

@router.get("/get-option-list/{question_id}", response_model=List[QuestionOptionItem])
def get_option_list(
    db: SessionDep,
    question_id: UUID,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = current_user["user_id"]
    
    question = crud_question.get_by_id(db, question_id)
    if question is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Câu hỏi không tồn tại"
        )
    options = crud_question_option.get_options_by_question(db, question_id)
    return options

@router.patch("/{question_id}")
def update_options(
    db: SessionDep,
    obj_in: List[QuestionOptionUpdate],
    question_id: UUID,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = current_user["user_id"]
    
    # 1. Kiểm tra quyền Instructor
    subject_id = crud_question.get_subject_id(db, question_id)
    is_instructor = call_check_instructor_service(user_id, subject_id)
    if not is_instructor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không phải giảng viên phụ trách môn học này."
        )
    
    # 2. Gọi hàm cập nhật hàng loạt đã được validate số lượng đáp án True
    crud_question_option.update_multiple_options(
        db=db, 
        question_id=question_id, 
        obj_in_list=obj_in
    )
    
    return {
        "status": "success",
        "message": "Cập nhật danh sách phương án thành công!"
    }
    