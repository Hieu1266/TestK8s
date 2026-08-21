from uuid import UUID
from fastapi import APIRouter, HTTPException, Depends, status, Request

from app.api.v1.deps import SessionDep
from app.models.enum import SubmissionStatus
from app.models.submission_detail import SubmissionDetail
from app.schemas.submission_detail import SubmissionDetailUpdate
from app.crud.submission_detail import crud_submission_detail
from app.crud.quiz_submission import crud_quiz_submission
from app.core.security import settings
from app.core.security import get_current_user_role
import httpx

router = APIRouter(prefix="/submission-details", tags=["Submission Details"])

@router.patch("/{detail_id}")
def update_submission_detail(
    detail_id: UUID,
    answer_in: SubmissionDetailUpdate,
    db: SessionDep,
    current_user: dict = Depends(get_current_user_role)
):
    """
    API cho sinh viên chọn đáp án trắc nghiệm hoặc nhập câu trả lời tự luận.
    """
    # 1. Kiểm tra bản ghi SubmissionDetail có tồn tại không
    detail_obj = crud_submission_detail.get_by_id(db=db, id=detail_id)
    if not detail_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Không tìm thấy chi tiết bài làm"
        )

    # 2. Lấy bài nộp tổng (QuizSubmission) để kiểm tra trạng thái và quyền sở hữu
    submission_obj = crud_quiz_submission.get_by_id(db=db, id=detail_obj.submission_id)
    if not submission_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Không tìm thấy bài nộp tương ứng"
        )

    # Kiểm tra chính chủ (User chỉ được sửa bài làm của mình)
    user_id_str = current_user.get("user_id")
    if str(submission_obj.user_id) != user_id_str:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Bạn không có quyền chỉnh sửa bài làm này"
        )

    # 3. Kiểm tra trạng thái bài thi (Chỉ cho phép sửa khi bài đang làm)
    if submission_obj.status != SubmissionStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Bài thi đã nộp hoặc đã kết thúc, không thể thay đổi đáp án"
        )

    # 4. Tiến hành cập nhật thông qua CRUD
    updated_detail = crud_submission_detail.update_answer(
        db=db, 
        db_obj=detail_obj, 
        obj_in=answer_in
    )

    return {
        "message": "Đã lưu câu trả lời thành công",
        "detail_id": updated_detail.detail_id,
        "selected_option_id": updated_detail.selected_option_id,
        "essay_answer_text": updated_detail.essay_answer_text
    }

VIDEO_SERVICE_BASE_URL = settings.BACKEND_LEARNING_PROGRESS_URL
@router.post("/submit-question/{detail_id}")
async def submit_question(
    db: SessionDep,
    detail_id: UUID,
    request: Request, # Lấy Request để forward Header Authorization sang Service khác
    current_user: dict = Depends(get_current_user_role)
):
    # 0. Kiểm tra chính chủ + trạng thái bài thi trước khi cho chấm câu hỏi
    #    (bổ sung vì hàm gốc chưa kiểm tra, dễ bị chấm hộ bài người khác hoặc chấm bài đã nộp)
    detail_check = db.get(SubmissionDetail, detail_id)
    if not detail_check:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy chi tiết bài làm"
        )
    submission_check = crud_quiz_submission.get_by_id(db=db, id=detail_check.submission_id)
    if not submission_check:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bài nộp tương ứng"
        )
    user_id_str = current_user.get("user_id")
    if str(submission_check.user_id) != user_id_str:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền thao tác trên bài làm này"
        )
    if submission_check.status != SubmissionStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bài thi đã nộp hoặc đã kết thúc, không thể chấm lại câu hỏi"
        )

    # 1. Chấm điểm câu hỏi
    is_correct = crud_quiz_submission.submit_and_evaluate_detail(db, detail_id=detail_id)

    if is_correct:
        # 2. Truy vấn detail để lấy lesson_id và score_earned
        detail = db.get(SubmissionDetail, detail_id)
        if not detail:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Không tìm thấy dữ liệu lượt nộp bài"
            )

        # 🆕 SỬA LỖI: QuizSubmission không có cột lesson_id (chỉ có quiz_id).
        # Lesson gắn với quiz nằm ở Quiz.target_lesson_id, lấy qua submission.quiz.
        lesson_id = (
            detail.submission.quiz.target_lesson_id
            if detail.submission and detail.submission.quiz
            else None
        )
        adding_score = detail.score_earned or 0.0

        # 3. Gọi HTTP Request sang Video Progress Service nếu đủ điều kiện
        if lesson_id and adding_score > 0:
            auth_header = request.headers.get("Authorization")
            headers = {"Authorization": auth_header} if auth_header else {}

            async with httpx.AsyncClient() as client:
                try:
                    response = await client.patch(
                        f"{VIDEO_SERVICE_BASE_URL}/lesson/{lesson_id}/add-score",
                        json={"adding_score": adding_score},
                        headers=headers,
                        timeout=5.0 # Timeout tránh treo request
                    )
                    response.raise_for_status()
                except httpx.HTTPStatusError as exc:
                    # Log lỗi nếu Service bên kia trả về mã 4xx hoặc 5xx
                    print(f"Lỗi phản hồi từ Video Service: {exc.response.status_code} - {exc.response.text}")
                except httpx.RequestError as exc:
                    # Log lỗi nếu không kết nối được tới Service
                    print(f"Không thể kết nối tới Video Service: {exc}")

    return {
        "success": True,
        "is_correct": is_correct
    }