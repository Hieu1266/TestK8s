from uuid import UUID
import httpx
from pydantic import BaseModel
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status, Query
from typing import Optional, Any, Dict, List
from app.api.v1.deps import SessionDep
from app.core.security import RoleChecker, get_current_user_role, oauth2_scheme
from app.core.config import settings
from app.schemas.subject_collaborator_link import CourseCollaboratorLinkBase, CourseCollaboratorRead
from app.crud.subject import crud_subject
from app.crud.subject_collaborator_link import crud_collab_subject
import asyncio

router = APIRouter(prefix="/course-collab-link", tags=["course-collab-link"])

USER_SERVICE = settings.BACKEND_USER_URL


class TesterSubjectSummary(BaseModel):
    """
    Thông tin môn học rút gọn cho Tester (chỉ những field có sẵn trực tiếp trên
    Subject, KHÔNG dùng chung schema GeneralInfoInstructorSubject vì schema đó
    yêu cầu thêm total_modules/total_lessons mà crud_subject.get_collaborator_subject_list
    không tính toán).
    """
    subject_id: UUID
    title: str
    description: Optional[str] = None
    status_id: str
    course_id: UUID
    order_index: Optional[int] = None

    class Config:
        from_attributes = True


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_collab_link(
    db: SessionDep,
    obj_in: CourseCollaboratorLinkBase,
    token: str = Depends(oauth2_scheme),
    current_user: dict = Depends(RoleChecker(["Instructor"]))
):
    instructor_id = UUID(current_user["user_id"])
    subject_list = crud_subject.get_instructor_subject_list(db, instructor_id)
    subject = crud_subject.get_by_id(db, obj_in.subject_id)

    # 1. Kiểm tra sự tồn tại của môn học
    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Môn học không tồn tại"
        )
    
    # 2. Kiểm tra quyền sở hữu môn học của Giảng viên
    if subject not in subject_list:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền thêm cộng tác viên cho môn học này"
        )

    # 3. Gọi HTTP Request sang User Service để kiểm tra vai trò (is-tester)
    user_service_url = f"{USER_SERVICE}/is-tester/{obj_in.collaborator_id}"
    headers = {"Authorization": f"Bearer {token}"}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(user_service_url, headers=headers, timeout=5.0)

            if response.status_code == status.HTTP_404_NOT_FOUND:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Người dùng (cộng tác viên) không tồn tại trên hệ thống"
                )
            elif response.status_code != status.HTTP_200_OK:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Không thể kết nối đến User Service để xác thực (Mã lỗi: {response.status_code})"
                )

            is_tester_result = response.json()
            if not is_tester_result:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Người dùng được chọn không phải là Tester/Cộng tác viên hợp lệ"
                )

    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Lỗi kết nối mạng tới User Service: {exc}"
        )

    # 4. Kiểm tra xem liên kết đã tồn tại trong CSDL chưa
    existing_link = crud_collab_subject.get_by_subject_and_collaborator(
        db, subject_id=obj_in.subject_id, collaborator_id=obj_in.collaborator_id
    )
    if existing_link:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cộng tác viên này đã được phân công cho môn học trước đó"
        )

    # 5. Lưu thông tin liên kết mới
    new_link = crud_collab_subject.create(db=db, obj_in=obj_in)
    return new_link

@router.delete("/", status_code=status.HTTP_200_OK)
async def delete_collab_link(
    db: SessionDep,
    obj_in: CourseCollaboratorLinkBase,
    current_user: dict = Depends(RoleChecker(["Instructor"]))
):
    instructor_id = UUID(current_user["user_id"])

    # 1. Kiểm tra sự tồn tại của môn học
    subject = crud_subject.get_by_id(db, obj_in.subject_id)
    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Môn học không tồn tại"
        )

    # 2. Kiểm tra quyền sở hữu môn học của Giảng viên
    subject_list = crud_subject.get_instructor_subject_list(db, instructor_id)
    if subject not in subject_list:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xóa cộng tác viên của môn học này"
        )

    # 3. Kiểm tra xem liên kết có tồn tại hay không
    existing_link = crud_collab_subject.get_by_subject_and_collaborator(
        db, subject_id=obj_in.subject_id, collaborator_id=obj_in.collaborator_id
    )
    if not existing_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy phân công cộng tác viên cho môn học này"
        )

    # 4. Thực hiện xóa phân công cộng tác viên
    crud_collab_subject.remove_by_subject_and_collaborator(
        db, subject_id=obj_in.subject_id, collaborator_id=obj_in.collaborator_id
    )

    return {"message": "Đã xóa phân công cộng tác viên thành công"}

@router.get("/check-assignment/{subject_id}/{collaborator_id}", response_model=bool)
async def check_collaborator_assignment(
    db: SessionDep,
    subject_id: UUID,
    collaborator_id: UUID,
):
    """
    [Nội bộ - Service to Service] Kiểm tra xem một Tester (cộng tác viên) có đang
    được giao (phân công) môn học subject_id hay không.

    Được các service khác (vd: Quiz Service) gọi để xác thực quyền truy cập của
    Tester trước khi cho phép thao tác trên dữ liệu của môn học đó (vd: chấm điểm
    bài thi), tương tự cách course_service gọi User Service để kiểm tra "/is-tester".
    """
    link = crud_collab_subject.get_by_subject_and_collaborator(
        db, subject_id=subject_id, collaborator_id=collaborator_id
    )
    return link is not None


@router.get("/my-subjects", response_model=List[TesterSubjectSummary])
async def get_my_assigned_subjects(
    db: SessionDep,
    search: Optional[str] = Query(None),
    current_user: dict = Depends(RoleChecker(["Tester"])),
):
    """
    [Tester] Lấy danh sách các môn học mà Tester (cộng tác viên) hiện tại đang
    được Giảng viên giao, hỗ trợ tìm kiếm theo tên/mô tả môn học.
    """
    collaborator_id = UUID(current_user["user_id"])
    return crud_subject.get_collaborator_subject_list(
        db, collaborator_id=collaborator_id, search=search
    )


@router.get("/subject/{subject_id}", response_model=List[CourseCollaboratorRead])
async def get_subject_collaborators(
    db: SessionDep,
    subject_id: UUID,
    token: str = Depends(oauth2_scheme),
    current_user: dict = Depends(RoleChecker(["Instructor"]))
):
    instructor_id = UUID(current_user["user_id"])

    # 1. Kiểm tra tồn tại + quyền sở hữu môn học
    subject = crud_subject.get_by_id(db, subject_id)
    if subject is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Môn học không tồn tại")

    subject_list = crud_subject.get_instructor_subject_list(db, instructor_id)
    if subject not in subject_list:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xem cộng tác viên của môn học này"
        )

    # 2. Lấy các liên kết CTV
    links = crud_collab_subject.get_by_subject(db, subject_id=subject_id)
    if not links:
        return []

    # 3. Lấy tên hiển thị từ User Service (gọi song song)
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient() as client:
        async def fetch_name(collaborator_id: UUID) -> Optional[str]:
            try:
                resp = await client.get(
                    f"{USER_SERVICE}/get-name/{collaborator_id}", headers=headers, timeout=5.0
                )
                return resp.json() if resp.status_code == status.HTTP_200_OK else None
            except httpx.RequestError:
                return None

        names = await asyncio.gather(*(fetch_name(link.collaborator_id) for link in links))

    return [
        CourseCollaboratorRead(
            collab_id=link.collab_id,
            subject_id=link.subject_id,
            collaborator_id=link.collaborator_id,
            username=name,
        )
        for link, name in zip(links, names)
    ]