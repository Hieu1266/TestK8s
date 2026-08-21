from fastapi import APIRouter, HTTPException, Depends, status, Header
from typing import List, Optional
from uuid import UUID
import httpx

from app.api.v1.deps import SessionDep
from app.core.security import RoleChecker
from app.core.config import settings
from app.crud.comment import crud_comment
from app.crud.course_enrollment import crud_course_enrollment
from app.schemas.comment import (
    CommentCreate, 
    CommentUpdate, 
    CommentResponse, 
    StructureCommentIn,
    CommentTeacherView, 
    CommentStatusUpdate
)

router = APIRouter(prefix="/comment", tags=["comment"])


# 🟢 HELPER FUNCTIONS
def get_user_id_from_current_user(current_user: dict) -> UUID:
    """Lấy user_id an toàn từ current_user (hỗ trợ cả dict và object)"""
    user_id = getattr(current_user, "id", None) or current_user.get("user_id")
    return UUID(str(user_id))

def call_get_usernames_service(tester_ids: list[UUID], token: Optional[str] = None) -> dict[str, str]:
    """Gọi HTTP sang User Service để lấy tên hiển thị của các Tester"""
    if not tester_ids:
        return {}

    USER_SERVICE_URL = getattr(settings, "BACKEND_USER_URL", "http://localhost:8000/api/v1")
    result: dict[str, str] = {}
    timeout = httpx.Timeout(connect=3.0, read=3.0, write=3.0, pool=3.0)

    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    with httpx.Client(timeout=timeout, headers=headers) as client:
        for tester_id in tester_ids:
            try:
                # Gọi API lấy thông tin user theo ID
                response = client.get(f"{USER_SERVICE_URL}/get-user/{tester_id}")
                if response.status_code == 200:
                    data = response.json()
                    # Lấy trường full_name hoặc username
                    result[str(tester_id)] = data.get("full_name") or data.get("username") or "Không rõ"
                else:
                    result[str(tester_id)] = "Không rõ"
            except httpx.RequestError:
                result[str(tester_id)] = "Không rõ"

    return result


# 1. TESTER TẠO NHẬN XÉT CHO 1 SUBJECT/MODULE/LESSON CỤ THỂ
@router.post("/", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def create_structure_comment(
    db: SessionDep,
    obj_in: StructureCommentIn,
    current_user: dict = Depends(RoleChecker(["Tester", "Instructor"])),
):
    tester_id = get_user_id_from_current_user(current_user)

    enroll = crud_course_enrollment.get_by_user_and_course(
        db, user_id=tester_id, course_id=obj_in.course_id
    )
    if not enroll:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bạn chưa được giao khóa học này.",
        )
    if not enroll.is_tested:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Đây không phải khóa học kiểm thử được giao cho bạn.",
        )

    existing = crud_comment.get_by_enrollment_and_part(
        db,
        enrollment_id=enroll.enrollment_id,
        structure_part=obj_in.structure_part,
        part_id=obj_in.part_id,
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bạn đã để lại nhận xét cho phần này rồi. Vui lòng chỉnh sửa thay vì tạo mới.",
        )

    new_comment = CommentCreate(
        enrollment_id=enroll.enrollment_id,
        tester_id=tester_id,
        structure_part=obj_in.structure_part,
        part_id=obj_in.part_id,
        title=obj_in.title,
        comment=obj_in.comment,
    )
    return crud_comment.create(db, obj_in=new_comment)


# 2. LẤY TOÀN BỘ NHẬN XÉT CỦA TESTER CHO 1 KHÓA HỌC
@router.get("/my-course/{course_id}", response_model=List[CommentResponse])
def get_my_comments_for_course(
    db: SessionDep,
    course_id: UUID,
    current_user: dict = Depends(RoleChecker(["Tester", "Instructor"])),
):
    tester_id = get_user_id_from_current_user(current_user)
    enroll = crud_course_enrollment.get_by_user_and_course(db, user_id=tester_id, course_id=course_id)
    if not enroll:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bạn chưa được giao khóa học này.",
        )
    return crud_comment.get_multi_by_enrollment(db, enrollment_id=enroll.enrollment_id)


# 3. ADMIN/MANAGER XEM TOÀN BỘ NHẬN XÉT THEO ENROLLMENT
@router.get("/enrollment/{enrollment_id}", response_model=List[CommentResponse])
def get_comments_by_enrollment(
    db: SessionDep,
    enrollment_id: UUID,
    current_user: dict = Depends(RoleChecker(["Admin", "Manager"])),
):
    return crud_comment.get_multi_by_enrollment(db, enrollment_id=enrollment_id)


# 4. SỬA NHẬN XÉT (chỉ chủ sở hữu)
@router.patch("/{comment_id}", response_model=CommentResponse)
def update_comment(
    db: SessionDep,
    comment_id: UUID,
    obj_in: CommentUpdate,
    current_user: dict = Depends(RoleChecker(["Tester", "Instructor"])),
):
    tester_id = get_user_id_from_current_user(current_user)
    existing = crud_comment.get_by_id(db, comment_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy nhận xét.")
    if existing.tester_id != tester_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền sửa nhận xét này.")
    return crud_comment.update(db, existing, obj_in)


# 5. XÓA NHẬN XÉT (cho phép cả Tester và Instructor làm chủ sở hữu)
@router.delete("/{comment_id}")
def delete_comment(
    db: SessionDep,
    comment_id: UUID,
    current_user: dict = Depends(RoleChecker(["Tester", "Instructor"])),
):
    tester_id = get_user_id_from_current_user(current_user)
    existing = crud_comment.get_by_id(db, comment_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy nhận xét.")
    if existing.tester_id != tester_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền xóa nhận xét này.")
    crud_comment.delete(db, comment_id)
    return {"success": True, "message": "Đã xóa nhận xét."}


# 6. GIẢNG VIÊN XEM TOÀN BỘ NHẬN XÉT CỦA MỌI TESTER THEO COURSE
@router.get("/course/{course_id}", response_model=List[CommentTeacherView])
def get_comments_for_course(
    db: SessionDep,
    course_id: UUID,
    authorization: Optional[str] = Header(None), # Lấy token từ header để gửi kèm
    current_user: dict = Depends(RoleChecker(["Instructor"])),
):
    comments = crud_comment.get_multi_by_course(db, course_id=course_id)
    if not comments:
        return []

    # Tách chuỗi Bearer lấy token
    token = authorization.split(" ")[1] if authorization and authorization.startswith("Bearer ") else None

    # Lấy danh sách tester_id
    tester_ids = list({c.tester_id for c in comments if getattr(c, "tester_id", None)})
    username_map = call_get_usernames_service(tester_ids, token=token)

    results = []
    for comment in comments:
        # Convert an toàn từ SQLAlchemy ORM sang dict
        if hasattr(comment, "model_dump"):
            comment_dict = comment.model_dump()
        else:
            comment_dict = {col.name: getattr(comment, col.name) for col in comment.__table__.columns}

        comment_dict["tester_username"] = username_map.get(str(comment.tester_id), "Không rõ")
        results.append(comment_dict)

    return results


# 7. GIẢNG VIÊN CẬP NHẬT TRẠNG THÁI XỬ LÝ
@router.patch("/{comment_id}/status", response_model=CommentResponse)
def update_comment_status(
    db: SessionDep,
    comment_id: UUID,
    obj_in: CommentStatusUpdate,
    current_user: dict = Depends(RoleChecker(["Instructor"])),
):
    updated = crud_comment.update_status(db, comment_id, obj_in.status)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy nhận xét.")
    return updated