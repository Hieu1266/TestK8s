from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db
from app.crud.question_bank import crud_question_bank

from app.schemas.question_bank import (
    QuestionResponse,
    QuestionCreate,
    QuestionCreateWrapper,
    QuestionUpdate,
    QuestionUpdateWrapper,
)

router = APIRouter(prefix="/questions-bank", tags=["Question Bank"])


@router.post("/", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
def create_question(
    payload: QuestionCreateWrapper | QuestionCreate,
    db: Session = Depends(get_db)
):
    print("\n==========================================", flush=True)
    print("✅ [FASTAPI ROUTER] ĐÃ NHẬN REQUEST TẠO CÂU HỎI", flush=True)

    # 🎯 Tự động unwrap payload linh hoạt (chấp nhận cả {"question": {...}} lẫn {...})
    obj_in = payload.question if isinstance(payload, QuestionCreateWrapper) else payload
    print(f"-> Parsed Payload: {obj_in.model_dump()}", flush=True)

    created_question = crud_question_bank.create(db, obj_in=obj_in)
    return created_question


@router.get("/get-list/{subject_id}", response_model=List[QuestionResponse])
def get_questions_by_subject(
    subject_id: UUID,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    questions = crud_question_bank.get_multi_by_subject(
        db, subject_id=subject_id, skip=skip, limit=limit
    )
    return questions


@router.get("/{question_id}", response_model=QuestionResponse)
def get_question_detail(
    question_id: UUID,
    db: Session = Depends(get_db)
):
    question = crud_question_bank.get(db, question_id=question_id)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Không tìm thấy câu hỏi"
        )
    return question


# @router.patch("/{question_id}", response_model=QuestionResponse)
@router.put("/{question_id}", response_model=QuestionResponse)
def update_question(
    question_id: UUID,
    payload: QuestionUpdateWrapper | QuestionUpdate,
    db: Session = Depends(get_db)
):
    # 1. Kiểm tra sự tồn tại của câu hỏi
    db_question = crud_question_bank.get(db, question_id=question_id)
    if not db_question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Không tìm thấy câu hỏi để cập nhật"
        )
    
    # 2. Trích xuất obj_in an toàn
    obj_in = payload.question if isinstance(payload, QuestionUpdateWrapper) else payload
    
    return crud_question_bank.update(db, db_obj=db_question, obj_in=obj_in)


@router.delete("/{question_id}", status_code=status.HTTP_200_OK)
def delete_question(
    question_id: UUID,
    db: Session = Depends(get_db)
):
    deleted_obj = crud_question_bank.remove(db, question_id=question_id)
    if not deleted_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Không tìm thấy câu hỏi để xóa"
        )
    return {"message": "Xóa câu hỏi thành công", "question_id": str(question_id)}