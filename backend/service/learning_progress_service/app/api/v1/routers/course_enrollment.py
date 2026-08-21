import asyncio
from fastapi import APIRouter, HTTPException, Depends, status, Request
from typing import List
from uuid import UUID
import httpx
from app.crud.video_progress import crud_video_progress
from app.core.config import settings
from app.core.security import get_current_user_role, RoleChecker
from app.crud.course_enrollment import crud_course_enrollment
from app.crud.lesson_progress import crud_lesson_progress
from app.crud.user_lesson_note import crud_note
from app.api.v1.deps import SessionDep
from app.schemas.course_enrollment import (
    CourseInProgress, 
    CourseEnrollmentUpdate, 
    CourseEnrollmentResponse,
    CourseEnrollmentCreate,
    GeneralUserEnrollmentInfo
)

from app.models.enum import TestingEnrollment, StructurePart
from app.schemas.comment import CommentCreate
from app.crud.comment import crud_comment
from pydantic import BaseModel
from typing import Optional


router = APIRouter(prefix="/course_enrollment", tags=["course_enrollment"])

# 1. ĐĂNG KÝ KHÓA HỌC (Tạo Enrollment + Khởi tạo Tiến độ bài học & Video)
@router.post("/", response_model=CourseEnrollmentResponse, status_code=status.HTTP_201_CREATED)
async def enroll_course(
    db: SessionDep,
    payload: CourseEnrollmentCreate,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = UUID(current_user["user_id"])
    course_id = payload.course_id

    # Bước 1: Kiểm tra xem người dùng đã đăng ký khóa học này chưa
    existing_enroll = crud_course_enrollment.get_by_user_and_course(db, user_id=user_id, course_id=course_id)
    if existing_enroll:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Người dùng đã đăng ký khóa học này rồi."
        )

    # Bước 2: Gọi sang Course Service lấy cấu trúc bài học mới
    course_lessons_url = f"{settings.BACKEND_COURSE_URL}/courses/{course_id}/lessons"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(course_lessons_url, timeout=5.0)
            if response.status_code == status.HTTP_404_NOT_FOUND:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khóa học không tồn tại.")
            elif response.status_code != status.HTTP_200_OK:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lỗi cấu trúc khóa học.")
                
            course_data = response.json()
            lessons_list = course_data.get("lessons", [])
            
        except httpx.RequestError:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Course Service sập.")

    # Chuẩn hóa dữ liệu: Map `is_quiz` sang `has_quiz` để tương thích với logic CRUD hiện tại
    for lesson in lessons_list:
        if "has_quiz" not in lesson:
            lesson["has_quiz"] = lesson.get("is_quiz", False)

    # Bước 3: Tạo bản ghi Đăng ký học chính thức
    enroll = crud_course_enrollment.create(db, {"user_id": user_id, "course_id": course_id, "is_tested": False})
    
    # Bước 4: Khởi tạo tiến độ bài học & tiến độ video
    if lessons_list:
        # 4.1. Khởi tạo tiến độ chung cho tất cả các bài học
        crud_lesson_progress.init_course_progress(
            db=db, user_id=user_id, course_id=course_id, lessons=lessons_list, is_tested=False
        )
        
        # 4.2. Lọc các bài học có video (duration_seconds > 0) để khởi tạo video progress
        video_lessons = [l for l in lessons_list if l.get("duration_seconds", 0) > 0]
        if video_lessons:
            crud_video_progress.init_video_progress(
                db=db, user_id=user_id, lessons=video_lessons, is_tested=False
            )
        
    return enroll

@router.post("/create-testing-enrollment/{tester_id}")
async def create_testing_enrollment(
    db: SessionDep,
    obj_in: CourseEnrollmentCreate,
    tester_id: UUID,
    current_user: dict = Depends(RoleChecker(["Manager"]))
):
    course_id = obj_in.course_id
    existing_enroll = crud_course_enrollment.get_by_user_and_course(db, user_id=tester_id, course_id=course_id)
    if existing_enroll:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Người dùng đã đăng ký khóa học này rồi."
        )
    course_lessons_url = f"{settings.BACKEND_COURSE_URL}/courses/{course_id}/lessons"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(course_lessons_url, timeout=5.0)
            if response.status_code == status.HTTP_404_NOT_FOUND:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khóa học không tồn tại.")
            elif response.status_code != status.HTTP_200_OK:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lỗi cấu trúc khóa học.")
                
            course_data = response.json()
            lessons_list = course_data.get("lessons", [])
            
        except httpx.RequestError:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Course Service sập.")

    # Chuẩn hóa dữ liệu: Map `is_quiz` sang `has_quiz` để tương thích với logic CRUD hiện tại
    for lesson in lessons_list:
        if "has_quiz" not in lesson:
            lesson["has_quiz"] = lesson.get("is_quiz", False)

    enroll = crud_course_enrollment.create(db, {"user_id": tester_id, "course_id": course_id, "is_tested": True})
    if lessons_list:
        # 4.1. Khởi tạo tiến độ chung cho tất cả các bài học
        crud_lesson_progress.init_course_progress(
        db=db, user_id=tester_id, course_id=course_id, lessons=lessons_list, is_tested=True
    )
    video_lessons = [l for l in lessons_list if l.get("duration_seconds", 0) > 0]
    if video_lessons:
        crud_video_progress.init_video_progress(
           db=db, user_id=tester_id, lessons=video_lessons, is_tested=True
        )
        
    return enroll

# 2. LẤY DANH SÁCH TIẾN ĐỘ KHÓA HỌC (Đang học / Đã xong)
@router.get("/history/{is_completed}", response_model=List[CourseInProgress])
async def get_progress_list(
    request: Request,
    db: SessionDep,
    is_completed: bool,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = UUID(current_user["user_id"])

    enrollments = crud_course_enrollment.get_history_by_user(db, user_id=user_id, is_completed=is_completed)

    if not enrollments:
        return []

    token = request.headers.get("Authorization")
    headers = {"Authorization": token} if token else {}

    async def fetch_course_title(client: httpx.AsyncClient, course_id: UUID) -> str:
        url = f"{settings.BACKEND_COURSE_URL}/courses/title/{course_id}"
        try:
            res = await client.get(url, headers=headers, timeout=5.0)
            return res.json() if res.status_code == 200 else "Khóa học không xác định"
        except httpx.RequestError:
            return "Lỗi kết nối hệ thống"

    async with httpx.AsyncClient() as client:
        tasks = [fetch_course_title(client, enroll.course_id) for enroll in enrollments]
        titles = await asyncio.gather(*tasks)

    result = []
    for enroll, title in zip(enrollments, titles):
        result.append(
            CourseInProgress(
                course_id=enroll.course_id,
                course_title=title,
                current_overall_progress=enroll.current_overall_progress,
                is_completed=enroll.is_completed,
                is_tested=enroll.is_tested,
                testing_course_status=enroll.testing_course_status,
            )
        )

    return result


# 3. LẤY CHI TIẾT TIẾN ĐỘ CỦA MỘT KHÓA HỌC CỤ THỂ
@router.get("/course/{course_id}", response_model=CourseEnrollmentResponse)
def get_single_course_progress(
    db: SessionDep,
    course_id: UUID,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = UUID(current_user["user_id"])
    enroll = crud_course_enrollment.get_by_user_and_course(db, user_id=user_id, course_id=course_id)
    if not enroll:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bạn chưa đăng ký khóa học này."
        )
    return enroll


# 4. CẬP NHẬT TIẾN ĐỘ KHÓA HỌC
@router.put("/course/{course_id}", response_model=CourseEnrollmentResponse)
def update_enrollment(
    db: SessionDep,
    course_id: UUID,
    payload: CourseEnrollmentUpdate,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = UUID(current_user["user_id"])
    
    enroll = crud_course_enrollment.get_by_user_and_course(db, user_id=user_id, course_id=course_id)
    if not enroll:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bản ghi đăng ký khóa học không tồn tại."
        )
        
    updated_enroll = crud_course_enrollment.update_progress(
        db, db_obj=enroll, progress=payload.current_overall_progress
    )
    return updated_enroll


# 5. HỦY ĐĂNG KÝ KHÓA HỌC 
@router.delete("/course/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def unenroll_course(
    db: SessionDep,
    course_id: UUID,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = UUID(current_user["user_id"])
    
    # Bước 1: Tìm bản ghi đăng ký
    enroll = crud_course_enrollment.get_by_user_and_course(db, user_id=user_id, course_id=course_id)
    if not enroll:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bạn chưa từng đăng ký khóa học này."
        )
        
    # Bước 2: KIỂM TRA NGHIỆP VỤ - Hoàn thành rồi thì cấm hủy
    if enroll.is_completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Khóa học đã hoàn thành, bạn không thể hủy đăng ký."
        )
        
    # Bước 3: Xóa sạch tiến độ Video & tiến độ Bài học liên quan (Đảm bảo Data Integrity)
    # Note: Phải xóa video_progress trước khi xóa lesson_progress 
    # để lấy danh sách lesson_id tương ứng từ lesson_progress.
    crud_video_progress.remove_by_course(db, user_id=user_id, course_id=course_id)
    crud_lesson_progress.remove_by_course(db, user_id=user_id, course_id=course_id)
    crud_note.delete_notes_by_user_and_course(db, user_id=user_id, course_id=course_id)

    # Bước 4: Tiến hành xóa bản ghi đăng ký chính
    crud_course_enrollment.delete(db, enroll.enrollment_id)
    
    return None

@router.get("/statistics/me", response_model=GeneralUserEnrollmentInfo)
def get_user_statistics(
    db: SessionDep,
    current_user: dict = Depends(get_current_user_role)
):
    """
    API lấy thông số số lượng (Đang học, Hoàn thành, Chứng chỉ) của học viên hiện tại
    """
    # Trích xuất và ép kiểu user_id về UUID giống hệt API mẫu của bạn
    user_id = UUID(current_user["user_id"])
    
    # Gọi tầng CRUD xử lý logic tính toán dữ liệu
    stats = crud_course_enrollment.get_general_statistics(db, user_id=user_id)
    
    return stats

@router.get("/internal/top-enrolled-courses")
def get_top_enrolled_courses(session: SessionDep):
    """
    Internal API dành cho các Service khác gọi sang để lấy Top 5 course_id đăng ký nhiều nhất
    """
    data = crud_course_enrollment.get_top_5_course_ids(session)
    return {"success": True, "data": data}

@router.get("/is-enrolled/{course_id}", response_model=bool)
def is_enrolled_course(
    db: SessionDep,
    course_id: UUID,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = current_user["user_id"]
    return crud_course_enrollment.check_already_enrolled(db, user_id, course_id)


@router.get("/get-users-in-progress/{course_id}", response_model=int)
def get_users_inprogress(
    db: SessionDep,
    course_id: UUID,
    current_user: dict = Depends(get_current_user_role)
):
    return crud_course_enrollment.get_users_in_progress(db, course_id)


@router.get("/admin/history/{user_id}/{is_completed}", response_model=List[CourseInProgress])
async def get_progress_list_admin(
    request: Request,
    db: SessionDep,
    user_id: UUID,
    is_completed: bool,
    current_user: dict = Depends(RoleChecker(["Admin", "Manager"]))
):

    enrollments = crud_course_enrollment.get_history_by_user(
        db, user_id=user_id, is_completed=is_completed
    )
 
    if not enrollments:
        return []
 
    token = request.headers.get("Authorization")
    headers = {"Authorization": token} if token else {}
 
    async def fetch_course_title(client: httpx.AsyncClient, course_id: UUID) -> str:
        url = f"{settings.BACKEND_COURSE_URL}/courses/title/{course_id}"
        try:
            res = await client.get(url, headers=headers, timeout=5.0)
            return res.json() if res.status_code == 200 else "Khóa học không xác định"
        except httpx.RequestError:
            return "Lỗi kết nối hệ thống"
 
    async with httpx.AsyncClient() as client:
        tasks = [fetch_course_title(client, enroll.course_id) for enroll in enrollments]
        titles = await asyncio.gather(*tasks)
 
    result = []
    for enroll, title in zip(enrollments, titles):
        result.append(
            CourseInProgress(
                course_id=enroll.course_id,
                course_title=title,
                current_overall_progress=enroll.current_overall_progress,
                is_completed=enroll.is_completed,
                is_tested=enroll.is_tested,                             # 🌟 THÊM
                testing_course_status=enroll.testing_course_status,     # 🌟 THÊM
            )
        )

    return result
 



@router.get("/admin/statistics/{user_id}", response_model=GeneralUserEnrollmentInfo)
def get_user_statistics_admin(
    db: SessionDep,
    user_id: UUID,
    current_user: dict = Depends(RoleChecker(["Admin", "Manager"]))
):
    """
    API dành cho ADMIN: lấy thông số thống kê (đang học/hoàn thành/chứng chỉ)
    của một user bất kỳ.
    """
    stats = crud_course_enrollment.get_general_statistics(db, user_id=user_id)
    return stats


@router.put("/admin/testing-status/{tester_id}/{course_id}", response_model=CourseEnrollmentResponse)
def update_testing_status_admin(
    db: SessionDep,
    tester_id: UUID,
    course_id: UUID,
    payload: CourseEnrollmentUpdate,
    current_user: dict = Depends(RoleChecker(["Admin", "Manager"]))
):
    """
    API dành cho Manager/Admin: cập nhật trạng thái duyệt kiểm thử
    (testing_course_status) cho enrollment của một tester cụ thể.
    """
    enroll = crud_course_enrollment.get_by_user_and_course(
        db, user_id=tester_id, course_id=course_id
    )
    if not enroll:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tester chưa đăng ký khóa học này."
        )

    if payload.testing_course_status is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thiếu trạng thái testing_course_status."
        )

    updated_enroll = crud_course_enrollment.update_testing_status(
        db, db_obj=enroll, status=payload.testing_course_status
    )
    return updated_enroll 



class TesterReviewPayload(BaseModel):
    testing_course_status: TestingEnrollment
    reason: Optional[str] = None


@router.put("/testing-status/{course_id}", response_model=CourseEnrollmentResponse)
def submit_testing_status(
    db: SessionDep,
    course_id: UUID,
    payload: TesterReviewPayload,
    current_user: dict = Depends(RoleChecker(["Tester"])),   # ⚠️ xác nhận đúng chuỗi role_name
):
    user_id = UUID(current_user["user_id"])
    enroll = crud_course_enrollment.get_by_user_and_course(db, user_id=user_id, course_id=course_id)
    if not enroll:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bản ghi đăng ký khóa học không tồn tại.")

    if not enroll.is_tested:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Đây không phải khóa học kiểm thử được giao cho bạn.")

    if not enroll.is_completed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cần hoàn thành khóa học trước khi chấm kết quả.")

    if payload.testing_course_status not in (TestingEnrollment.APPROVED, TestingEnrollment.REJECTED):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Trạng thái phải là APPROVED hoặc REJECTED.")

    if payload.testing_course_status == TestingEnrollment.REJECTED and not (payload.reason and payload.reason.strip()):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vui lòng nhập lý do khi chọn Không đạt.")

    updated_enroll = crud_course_enrollment.update_testing_status(
        db, db_obj=enroll, status=payload.testing_course_status
    )

    if payload.testing_course_status == TestingEnrollment.REJECTED:
        crud_comment.create(
            db,
            obj_in=CommentCreate(
                enrollment_id=enroll.enrollment_id,
                tester_id=user_id,
                structure_part=StructurePart.COURSE,
                part_id=course_id,
                title="Lý do không đạt",
                comment=payload.reason.strip(),
            ),
        )

    return updated_enroll