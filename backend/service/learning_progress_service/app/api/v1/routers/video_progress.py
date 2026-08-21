from fastapi import APIRouter, HTTPException, Depends, status, Request
import asyncio
from typing import List
from uuid import UUID
from app.schemas.video_progress import VideoProgressUpdate, VideoProgressLookupIn, VideoProgressResponse, AddScoreRequest
from app.models.enum import LessonStatus
from app.api.v1.deps import SessionDep
from app.core.security import get_current_user_role
from app.crud.video_progress import crud_video_progress
from app.crud.lesson_progress import crud_lesson_progress
from app.api.v1.routers.lesson_progress import fetch_ordered_lessons

router = APIRouter(prefix="/video_progress", tags=["video_progress"])

@router.post("/get-or-create", response_model=VideoProgressResponse)
def get_or_create_video_progress(
    db: SessionDep,
    payload: VideoProgressLookupIn,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = UUID(current_user["user_id"])

    # Xác thực quyền học bài này, tránh tạo tiến độ video cho bài học chưa được mở khóa
    if crud_lesson_progress.get_by_lesson(db, user_id, payload.lesson_id) is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn chưa có quyền truy cập bài học này."
        )

    progress = crud_video_progress.get_or_create(
        db,
        user_id=user_id,
        lesson_id=payload.lesson_id,
        duration_seconds=payload.duration_seconds,
    )
    return progress

@router.patch("/{video_progress_id}")
async def update_video_progress(
    db: SessionDep,
    video_progress_id: UUID,
    obj_in: VideoProgressUpdate,
    current_user: dict = Depends(get_current_user_role)
):  
    user_id = UUID(current_user["user_id"])
    v_progress = crud_video_progress.get_by_id(db, video_progress_id)
    if v_progress is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không thể tìm thấy tiến độ video"
        )
    print(crud_lesson_progress.get_by_lesson(db, user_id, v_progress.lesson_id))
    if crud_lesson_progress.get_by_lesson(db, user_id, v_progress.lesson_id) is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền thay đổi tiến độ video trên"
        )
    new_progress = crud_video_progress.update(db, v_progress, obj_in)
    if new_progress.completion_percentage == 100 or new_progress.is_finished:
        progress = crud_lesson_progress.get_by_lesson(db, user_id, new_progress.lesson_id)
        
        # CHỈ MỞ KHÓA nếu bài học này chưa COMPLETED
        if progress and progress.status != LessonStatus.COMPLETED:
            ordered_lessons = await fetch_ordered_lessons(progress.course_id)
            crud_lesson_progress.complete_and_unlock_next_by_lesson(db, user_id, progress.lesson_id, ordered_lessons)
    return {
        "success": True,
        "message": "Đã cập nhật tiến độ thành công"
    }

@router.patch("/lesson/{lesson_id}")
async def update_video_progress_by_lesson(
    db: SessionDep,
    lesson_id: UUID,
    obj_in: VideoProgressUpdate,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = UUID(current_user["user_id"])
    
    # 1. Kiểm tra quyền truy cập bài học của người dùng
    lesson_progress = crud_lesson_progress.get_by_lesson(db, user_id, lesson_id)
    if lesson_progress is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền thay đổi tiến độ video trên bài học này"
        )
    
    # 2. Tìm tiến độ video theo user_id và lesson_id
    v_progress = crud_video_progress.get_by_user_and_lesson(db, user_id=user_id, lesson_id=lesson_id)
    
    if v_progress is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tiến độ video cho bài học này"
        )
        
    # 3. Cập nhật tiến độ video
    new_progress = crud_video_progress.update(db, v_progress, obj_in)
    
    # 4. CHỈ MỞ KHÓA nếu bài học đạt 100% hoặc đã hoàn thành, và trạng thái hiện tại chưa phải là COMPLETED
    if (new_progress.completion_percentage >= 100 or new_progress.is_finished) and lesson_progress.status != LessonStatus.COMPLETED:
        ordered_lessons = await fetch_ordered_lessons(lesson_progress.course_id)
        crud_lesson_progress.complete_and_unlock_next_by_lesson(
            db, user_id, lesson_progress.lesson_id, ordered_lessons
        )

    return {
        "success": True,
        "message": "Đã cập nhật tiến độ video thành công",
        "data": new_progress
    }


@router.patch("/lesson/{lesson_id}/add-score")
async def add_video_score(
    db: SessionDep,
    lesson_id: UUID,
    payload: AddScoreRequest,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = UUID(current_user["user_id"])
    adding_score = payload.adding_score

    # 1. Kiểm tra quyền truy cập bài học
    lesson_progress = crud_lesson_progress.get_by_lesson(db, user_id, lesson_id)
    if lesson_progress is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền tương tác với bài học này"
        )

    # 2. Tìm bản ghi tiến độ video theo user_id và lesson_id
    v_progress = crud_video_progress.get_by_user_and_lesson(db, user_id=user_id, lesson_id=lesson_id)
    if v_progress is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tiến độ video cho bài học này"
        )

    # 3. Tính toán số điểm mới (Cộng dồn điểm cũ + điểm thêm)
    new_points = (v_progress.current_points or 0.0) + adding_score

    # 4. Cập nhật điểm mới vào DB
    obj_in = VideoProgressUpdate(current_points=new_points)
    updated_progress = crud_video_progress.update(db, v_progress, obj_in)

    return {
        "success": True,
        "message": f"Đã cộng thêm {adding_score} điểm thành công",
        "current_points": updated_progress.current_points
    }
