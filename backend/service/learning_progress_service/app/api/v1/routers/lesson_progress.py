import asyncio
from fastapi import APIRouter, HTTPException, Depends, status, Query
from app.models.lesson_progress import LessonProgress
from typing import List, Optional
from uuid import UUID
import httpx
from app.crud.course_enrollment import crud_course_enrollment
from app.api.v1.deps import SessionDep
from app.core.config import settings
from app.core.security import get_current_user_role, RoleChecker
from app.crud.lesson_progress import crud_lesson_progress
from app.schemas.lesson_progress import LessonProgressResponse
from app.models.enum import LessonStatus

router = APIRouter(prefix="/lesson_progress", tags=["lesson_progress"])


# Hàm helper gọi sang Course Service lấy danh sách bài học
async def fetch_ordered_lessons(course_id: UUID) -> list[dict]:
    course_lessons_url = f"{settings.BACKEND_COURSE_URL}/courses/{course_id}/lessons"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(course_lessons_url, timeout=5.0)
            if response.status_code == 200:
                return response.json().get("lessons", [])
            return []
        except httpx.RequestError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Lỗi kết nối tới Course Service."
            )

async def fetch_total_lessons(course_id: UUID) -> int:
    url = f"{settings.BACKEND_COURSE_URL}/courses/{course_id}/total-lessons"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, timeout=5.0)
            if response.status_code == 200:
                return int(response.json())
            return 0
        except httpx.RequestError:
            return 0

@router.put("/lesson/{lesson_id}/complete", response_model=LessonProgressResponse)
async def complete_lesson(
    lesson_id: UUID,
    db: SessionDep,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = UUID(current_user["user_id"])

    # 1. Lấy thông tin tiến độ của user để kiểm tra tính hợp lệ
    progress = crud_lesson_progress.get_by_lesson(db, user_id=user_id, lesson_id=lesson_id)
    if not progress:
        raise HTTPException(status_code=404, detail="Không tìm thấy tiến độ bài học của học viên.")
    if progress.status == LessonStatus.LOCKED:
        raise HTTPException(status_code=400, detail="Bài học đang bị khóa.")

    if progress.status == LessonStatus.COMPLETED:
        return progress

    # 2. Lấy lộ trình các bài học từ Course Service
    ordered_lessons = await fetch_ordered_lessons(progress.course_id)

    # 3. Cập nhật trạng thái bài học thành COMPLETED và mở khóa bài tiếp theo
    updated_progress = crud_lesson_progress.complete_and_unlock_next_by_lesson(
        db=db,
        user_id=user_id,
        lesson_id=lesson_id,
        ordered_lessons=ordered_lessons
    )

    if not updated_progress:
        raise HTTPException(status_code=500, detail="Cập nhật tiến độ không thành công.")

    # 4. Tính toán tiến độ tổng thể của toàn khóa học
    total_lessons = await fetch_total_lessons(progress.course_id)
    completed_lessons = crud_lesson_progress.count_completed_lessons(db, user_id=user_id, course_id=progress.course_id)

    if total_lessons > 0:
        overall_progress = round((completed_lessons / total_lessons) * 100, 2)
        if overall_progress > 100.0:
            overall_progress = 100.0

        is_completed = (completed_lessons >= total_lessons) or (overall_progress == 100.0)

        enroll = crud_course_enrollment.get_by_user_and_course(db, user_id=user_id, course_id=progress.course_id)
        if enroll:
            crud_course_enrollment.update_overall_progress(
                db=db,
                db_obj=enroll,
                progress=overall_progress,
                is_completed=is_completed
            )

    return updated_progress

@router.put("/lesson/{lesson_id}/unlock-next", response_model=Optional[LessonProgressResponse])
async def unlock_next_lesson(
    lesson_id: UUID,
    db: SessionDep,
    current_user: dict = Depends(get_current_user_role)
):
    """
    🆕 Dùng riêng cho trường hợp bài thi (quiz) ĐẠT: CHỈ mở khóa bài học kế tiếp.
    Khác với /lesson/{lesson_id}/complete:
    - KHÔNG đánh dấu lesson_id hiện tại là COMPLETED.
    - KHÔNG tính lại/tính lại tiến độ tổng thể (overall_progress) của course_enrollment.
 
    Trả về LessonProgressResponse của bài học VỪA được mở khóa, hoặc null nếu không có gì
    được mở (lesson hiện tại là bài tự chọn, bài kế tiếp đã mở sẵn/hoàn thành, hoặc là bài cuối).
    """
    user_id = UUID(current_user["user_id"])
 
    # 1. Kiểm tra tiến độ của lesson hiện tại có tồn tại và không bị khóa
    progress = crud_lesson_progress.get_by_lesson(db, user_id=user_id, lesson_id=lesson_id)
    if not progress:
        raise HTTPException(status_code=404, detail="Không tìm thấy tiến độ bài học của học viên.")
    if progress.status == LessonStatus.LOCKED:
        raise HTTPException(status_code=400, detail="Bài học đang bị khóa.")
 
    # 2. Lấy lộ trình các bài học từ Course Service (giống hệt endpoint /complete)
    ordered_lessons = await fetch_ordered_lessons(progress.course_id)
 
    # 3. Chỉ mở khóa bài kế tiếp, không đổi gì khác
    next_progress = crud_lesson_progress.unlock_next_lesson_only(
        db=db,
        user_id=user_id,
        lesson_id=lesson_id,
        ordered_lessons=ordered_lessons
    )
 
    return next_progress


@router.get("/get-status/{lesson_id}", response_model=LessonStatus)
async def get_lesson_progress_status(
    lesson_id: str,
    db: SessionDep,
    current_user = Depends(get_current_user_role)
):
    user_id = UUID(current_user["user_id"])
    status = crud_lesson_progress.get_lesson_progress_status(db, lesson_id=lesson_id, user_id=user_id)
    if status is None:
        return "LOCKED"
    return status

@router.put("/teacher/lesson/{lesson_id}/grade-complete", response_model=LessonProgressResponse)
async def teacher_complete_quiz(
    lesson_id: UUID,
    user_id: UUID = Query(..., description="ID của học viên cần được chấm/đánh dấu hoàn thành bài thi"),
    db: SessionDep = None,
    current_user: dict = Depends(RoleChecker(["Instructor"]))
):
    """
    🎓 API dành cho Giáo viên / Admin:
    Thực hiện đánh dấu hoàn thành (COMPLETED) bài quiz cho học viên chỉ định và cập nhật tiến độ.
    
    Hành động:
    1. Đánh dấu bài học hiện tại của học viên thành COMPLETED (KHÔNG mở khóa bài tiếp theo).
    2. Tính toán và cập nhật lại tiến độ tổng thể (overall_progress) của khóa học.
    """

    # 1. Lấy thông tin tiến độ của học viên
    progress = crud_lesson_progress.get_by_lesson(db, user_id=user_id, lesson_id=lesson_id)
    if not progress:
        raise HTTPException(
            status_code=404, 
            detail="Không tìm thấy tiến độ bài học của học viên này."
        )

    # Nếu bài học đã hoàn thành từ trước, trả về tiến độ hiện tại ngay
    if progress.status == LessonStatus.COMPLETED:
        return progress

    # 2. Cập nhật duy nhất trạng thái bài học này thành COMPLETED (Không gọi fetch_ordered_lessons)
    updated_progress = crud_lesson_progress.mark_completed_only(
        db=db,
        user_id=user_id,
        lesson_id=lesson_id
    )

    if not updated_progress:
        raise HTTPException(
            status_code=500, 
            detail="Cập nhật tiến độ bài học cho học viên thất bại."
        )

    # 3. Tính toán và cập nhật lại tiến độ tổng thể (overall_progress) cho học viên
    total_lessons = await fetch_total_lessons(progress.course_id)
    completed_lessons = crud_lesson_progress.count_completed_lessons(
        db, user_id=user_id, course_id=progress.course_id
    )

    if total_lessons > 0:
        overall_progress = round((completed_lessons / total_lessons) * 100, 2)
        if overall_progress > 100.0:
            overall_progress = 100.0

        is_completed = (completed_lessons >= total_lessons) or (overall_progress == 100.0)

        enroll = crud_course_enrollment.get_by_user_and_course(
            db, user_id=user_id, course_id=progress.course_id
        )
        if enroll:
            crud_course_enrollment.update_overall_progress(
                db=db,
                db_obj=enroll,
                progress=overall_progress,
                is_completed=is_completed
            )

    return updated_progress

@router.put("/complete-peer-review-submission/{lesson_id}", response_model=LessonProgressResponse)
async def complete_peer_review_submission(
    lesson_id: UUID,
    user_id: UUID = Query(..., description="ID của học viên nộp bài Peer Review"),
    db: SessionDep = None,
):
    """
    🤝 Dùng khi bài nộp Peer Review của học viên đã hoàn thành và đạt yêu cầu:
    1. Đánh dấu bài học (lesson_id) của user_id thành COMPLETED.
    2. Mở khóa bài học kế tiếp trong khóa học.
    3. Tính toán và cập nhật lại tiến độ tổng thể (overall_progress) của khóa học.
    """

    # 1. Lấy thông tin tiến độ của user để kiểm tra tính hợp lệ
    progress = crud_lesson_progress.get_by_lesson(db, user_id=user_id, lesson_id=lesson_id)
    if not progress:
        raise HTTPException(status_code=404, detail="Không tìm thấy tiến độ bài học của học viên.")
    if progress.status == LessonStatus.LOCKED:
        raise HTTPException(status_code=400, detail="Bài học đang bị khóa.")

    # Nếu bài học đã hoàn thành từ trước, trả về tiến độ hiện tại ngay
    if progress.status == LessonStatus.COMPLETED:
        return progress

    # 2. Lấy lộ trình các bài học từ Course Service
    ordered_lessons = await fetch_ordered_lessons(progress.course_id)

    # 3. Cập nhật trạng thái bài học thành COMPLETED và mở khóa bài tiếp theo
    updated_progress = crud_lesson_progress.complete_and_unlock_next_by_lesson(
        db=db,
        user_id=user_id,
        lesson_id=lesson_id,
        ordered_lessons=ordered_lessons
    )

    if not updated_progress:
        raise HTTPException(status_code=500, detail="Cập nhật tiến độ không thành công.")

    # 4. Tính toán tiến độ tổng thể của toàn khóa học
    total_lessons = await fetch_total_lessons(progress.course_id)
    completed_lessons = crud_lesson_progress.count_completed_lessons(db, user_id=user_id, course_id=progress.course_id)

    if total_lessons > 0:
        overall_progress = round((completed_lessons / total_lessons) * 100, 2)
        if overall_progress > 100.0:
            overall_progress = 100.0

        is_completed = (completed_lessons >= total_lessons) or (overall_progress == 100.0)

        enroll = crud_course_enrollment.get_by_user_and_course(db, user_id=user_id, course_id=progress.course_id)
        if enroll:
            crud_course_enrollment.update_overall_progress(
                db=db,
                db_obj=enroll,
                progress=overall_progress,
                is_completed=is_completed
            )

    return updated_progress
    