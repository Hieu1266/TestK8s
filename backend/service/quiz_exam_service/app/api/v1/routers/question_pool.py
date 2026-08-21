from app.models.question_pool import QuestionPool
from app.schemas.question_pool import (
    QuestionPoolCreate, QuestionPoolUpdate, QuestionPoolBase,
    QuestionPoolItem, QuestionPoolSetQuestions,
)
from app.crud.question_pool import crud_question_pool
from app.crud.question import crud_question
from app.api.v1.deps import SessionDep
from app.core.config import settings
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.core.security import get_current_user_role, RoleChecker
import asyncio
import httpx
from uuid import UUID

router = APIRouter(prefix="/question_pools", tags=["question_pools"])


def _to_item(db: SessionDep, pool: QuestionPool) -> QuestionPoolItem:
    return QuestionPoolItem(
        pool_id=pool.pool_id,
        subject_id=pool.subject_id,
        title=pool.title,
        description=pool.description or "",
        created_at=pool.created_at,
        total_questions=crud_question_pool.count_questions(db, pool.pool_id),
        question_ids=crud_question_pool.get_question_ids(db, pool.pool_id),
    )


@router.post("/")
def create_question_pool(
    db: SessionDep,
    obj_in: QuestionPoolBase,
    current_user: dict = Depends(RoleChecker(["Instructor"]))
):
    user_id = UUID(current_user["user_id"])
    if crud_question_pool.is_title_existed(db, obj_in.title, obj_in.subject_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail = "Tên pool đã được sử dụng"
        )
    new_pool = QuestionPoolCreate(
        owner_id=user_id,
        subject_id=obj_in.subject_id,
        title=obj_in.title,
        description=obj_in.description
    )
    pool = crud_question_pool.create(db, new_pool)
    return {
        "success": True,
        "message": f"Tạo pool {obj_in.title} thành công!",
        "data": _to_item(db, pool),
    }

@router.get("/get-pool-list", response_model=List[QuestionPoolItem])
def get_pool_list(
    db: SessionDep,
    current_user: dict = Depends(RoleChecker(["Instructor"]))
):
    user_id = UUID(current_user["user_id"])
    pools = crud_question_pool.get_multi_by_owner(db, user_id)
    return [_to_item(db, p) for p in pools]

# 🆕 Lấy danh sách pool theo subject (dùng cho QuestionPoolManager + cấu hình đề Random)
@router.get("/get-by-subject/{subject_id}", response_model=List[QuestionPoolItem])
def get_pools_by_subject(
    db: SessionDep,
    subject_id: UUID,
    current_user: dict = Depends(RoleChecker(["Instructor"]))
):
    pools = crud_question_pool.get_multi_by_subject(db, subject_id)
    return [_to_item(db, p) for p in pools]

@router.patch("/{pool_id}")
def update_question_pool(
    db: SessionDep,
    obj_in: QuestionPoolUpdate,
    pool_id: UUID,
    current_user: dict = Depends(RoleChecker(["Instructor"]))
):
  user_id = UUID(current_user["user_id"])
  pool = crud_question_pool.get_by_id(db, pool_id)
  if pool is None:
      raise HTTPException(
          status_code=status.HTTP_404_NOT_FOUND,
          detail="Pool không tồn tại"
      )  
  if user_id != pool.owner_id:
      raise HTTPException(
          status_code=status.HTTP_403_FORBIDDEN,
          detail="Bạn không có quyền sửa pool"
      )
  updated_pool = crud_question_pool.update(db, pool, obj_in)
  return {
      "success": True,
      "pool": _to_item(db, updated_pool),
  }

# 🆕 Xóa Question Pool
@router.delete("/{pool_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question_pool(
    db: SessionDep,
    pool_id: UUID,
    current_user: dict = Depends(RoleChecker(["Instructor"]))
):
    user_id = UUID(current_user["user_id"])
    pool = crud_question_pool.get_by_id(db, pool_id)
    if pool is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pool không tồn tại")
    if user_id != pool.owner_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền xóa pool")

    # Lưu ý: nếu pool này đang được tham chiếu bởi QuizPoolRule (đề Random đang dùng),
    # cần cân nhắc chặn xóa hoặc cascade xóa các rule liên quan tùy nghiệp vụ mong muốn.
    crud_question_pool.delete(db, id=pool_id)
    return None

# 🆕 Thay thế TOÀN BỘ danh sách câu hỏi được gán vào pool (Modal "Thêm/Bớt câu hỏi")
@router.patch("/{pool_id}/questions")
def set_pool_questions(
    db: SessionDep,
    pool_id: UUID,
    obj_in: QuestionPoolSetQuestions,
    current_user: dict = Depends(RoleChecker(["Instructor"]))
):
    user_id = UUID(current_user["user_id"])
    pool = crud_question_pool.get_by_id(db, pool_id)
    if pool is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pool không tồn tại")
    if user_id != pool.owner_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền sửa pool")

    # Xác thực toàn bộ question_id thuộc đúng subject của pool (tránh gán nhầm câu hỏi môn khác)
    valid_ids = {
        q.question_id for q in crud_question.get_multi_by_subject_id(db, pool.subject_id)
    }
    invalid_ids = [str(qid) for qid in obj_in.question_ids if qid not in valid_ids]
    if invalid_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Các câu hỏi sau không thuộc Ngân hàng câu hỏi của môn học này: {', '.join(invalid_ids)}"
        )

    crud_question_pool.set_questions(db, pool_id, obj_in.question_ids)
    return {"success": True, "message": "Đã cập nhật danh sách câu hỏi trong pool."}