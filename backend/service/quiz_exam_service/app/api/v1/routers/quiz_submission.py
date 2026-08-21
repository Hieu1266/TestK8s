from uuid import UUID
import httpx
from fastapi import HTTPException, status
from fastapi import APIRouter, Depends, Header, Request
from app.schemas.quiz_submission import QuizSubmissionCreate, QuizSubmissionStatusResponse, QuizSubmissionSummaryResponse, QuizUserSummaryResponse, UserSubmissionItem, GradeSubmissionRequest, QuizSubmissionStatus
from app.schemas.quiz import QuizTakeResponse
from app.schemas.submission_detail import SubmissionDetailCreate, QuizSubmissionDetailResponse
from app.api.v1.deps import SessionDep
from app.models.enum import QuizType, SubmissionStatus, QuizPlacementType
from app.crud.quiz import crud_quiz
from app.crud.question import crud_question
from app.crud.quiz_submission import crud_quiz_submission
from app.crud.submission_detail import crud_submission_detail
from app.crud.quiz import crud_quiz
from app.core.security import get_current_user_role, oauth2_scheme, RoleChecker
from app.core.config import settings
from typing import List, Optional

router = APIRouter(prefix="/quiz-submissions", tags=["Quiz Submissions"])

# URL sang Course Service, dùng để kiểm tra Tester (cộng tác viên) có được Giảng viên
# phân công (giao) môn học hay không trước khi cho phép truy cập các API chấm điểm.
COURSE_SERVICE = getattr(settings, "BACKEND_COURSE_URL", "http://localhost:8002/api/v1")


async def _verify_tester_subject_access(
    subject_id: UUID,
    current_user: dict,
    token: str,
) -> None:
    """
    Kiểm tra quyền truy cập môn học đối với các API chấm điểm (grading APIs).
    - Instructor / Admin: không bị chặn bởi hàm này (giữ nguyên hành vi hiện tại).
    - Tester (cộng tác viên): BẮT BUỘC phải được Giảng viên giao (phân công) đúng
      subject_id này (bảng CourseCollaboratorLink bên Course Service), nếu không sẽ
      bị từ chối truy cập (403), kể cả khi role hợp lệ.
    """
    if current_user.get("role") != "Tester":
        return

    tester_id = current_user.get("user_id")
    if not tester_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Không tìm thấy thông tin xác thực người dùng."
        )

    url = f"{COURSE_SERVICE}/course-collab-link/check-assignment/{subject_id}/{tester_id}"
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, timeout=5.0)
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Không thể xác thực quyền truy cập môn học (Course Service không phản hồi): {exc}",
        )

    if response.status_code != status.HTTP_200_OK or response.json() is not True:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn (Tester) chưa được Giảng viên phân công môn học này, không có quyền chấm điểm.",
        )


def _get_subject_id_for_quiz(db: SessionDep, quiz_id: UUID) -> UUID:
    subject_id = crud_quiz.get_subject_id(db, quiz_id)
    if not subject_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy môn học tương ứng với bài thi này."
        )
    return subject_id


def _get_subject_id_for_submission(db: SessionDep, submission_id: UUID) -> UUID:
    submission = crud_quiz_submission.get_by_id(db, submission_id)
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bài nộp"
        )
    return _get_subject_id_for_quiz(db, submission.quiz_id)

@router.post("/start/{lesson_id}", response_model=QuizTakeResponse)
def start_quiz_submission(
    lesson_id: UUID,
    is_peer_review: bool = False,
    db: SessionDep = None,
    current_user: dict = Depends(get_current_user_role)
):
    quiz = crud_quiz.get_quiz_by_lesson(db, lesson_id)
    user_id_str = current_user.get("user_id")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Không tìm thấy ID người dùng trong token"
        )
    
    user_id = UUID(user_id_str)

    # 1. Lấy thông tin bài thi và kiểm tra trạng thái
    quiz = crud_quiz.get_by_id(db, quiz.quiz_id)
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy bài thi")
    
    if not quiz.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bài thi hiện đang bị khóa")

    # 🆕 Câu hỏi chèn giữa video (IN_VIDEO) chỉ hỗ trợ đề thi dạng câu hỏi cố định,
    # vì cần video_trigger_seconds gắn cứng theo từng câu (pool bốc ngẫu nhiên không có mốc giây).
    if quiz.placement_type == QuizPlacementType.IN_VIDEO and quiz.quiz_type != QuizType.FIXED_QUESTION:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đề thi chèn giữa video phải là dạng câu hỏi cố định (FIXED_QUESTION)."
        )

    # 🆕 2. RESUME: Nếu user đã có 1 lượt làm bài đang dang dở (IN_PROGRESS) cho quiz này,
    # trả lại đúng lượt đó (kèm đáp án đã lưu) thay vì luôn tạo attempt mới.
    # Quan trọng với quiz IN_VIDEO: tránh việc reload trang / rời bài học giữa chừng bị mất tiến trình
    # hoặc bị tính thành 1 lượt làm bài mới.
    existing_in_progress = crud_quiz_submission.get_in_progress_by_quiz_and_user(
        db, quiz_id=quiz.quiz_id, user_id=user_id
    )
    if existing_in_progress:
        return _build_take_response(existing_in_progress)

    selected_questions = []
    # question_id -> video_trigger_seconds (chỉ có giá trị với FIXED_QUESTION, lấy từ QuizQuestion)
    trigger_seconds_map: dict = {}

    # 3. Xử lý bốc câu hỏi thông qua CRUD
    if quiz.quiz_type == QuizType.FIXED_QUESTION:
        sorted_links = sorted(quiz.quiz_questions, key=lambda x: x.order_index)
        selected_questions = [link.question for link in sorted_links]
        # 🆕 Giữ lại mốc giây kích hoạt riêng của từng câu hỏi trong đề thi này
        trigger_seconds_map = {
            link.question_id: link.video_trigger_seconds for link in sorted_links
        }

    elif quiz.quiz_type == QuizType.RANDOM_QUESTION:
        for rule in quiz.pool_rules:
            # Gọi hàm CRUD thay vì viết câu truy vấn SQL trực tiếp tại đây
            questions_from_pool = crud_question.get_random_by_pool(
                db=db, 
                pool_id=rule.pool_id, 
                limit=rule.quantity
            )
            selected_questions.extend(questions_from_pool)

    if not selected_questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Đề thi chưa có câu hỏi nào được cấu hình."
        )

    # 4. Tạo mới QuizSubmission
    submission_in = QuizSubmissionCreate(
        quiz_id=quiz.quiz_id,
        user_id=user_id,
        is_peer_review=is_peer_review
    )
    new_submission = crud_quiz_submission.create(db=db, obj_in=submission_in)

    # 5. Tạo các bản ghi SubmissionDetail rỗng và build Response
    questions_response = []
    
    for question in selected_questions:
        detail_in = SubmissionDetailCreate(
            submission_id=new_submission.submission_id,
            question_id=question.question_id,
            # 🆕 Gán mốc giây kích hoạt (None nếu không phải quiz IN_VIDEO / RANDOM_QUESTION)
            video_trigger_seconds=trigger_seconds_map.get(question.question_id)
        )
        new_detail = crud_submission_detail.create(db=db, obj_in=detail_in)
        
        options_res = [
            {"option_id": opt.option_id, "option_text": opt.option_text} 
            for opt in question.options
        ]
        
        questions_response.append({
            "detail_id": new_detail.detail_id,
            "question_id": question.question_id,
            "question_title": question.question_title,
            "question_type": question.question_type,
            "body_content": question.body_content,
            "max_points": question.max_points,
            "options": options_res,
            "video_trigger_seconds": new_detail.video_trigger_seconds,  # 🆕
            "selected_option_id": None,  # 🆕 mới tạo, chưa trả lời gì
            "is_answered_correct": None,  # 🆕
        })

    return {
        "submission_id": new_submission.submission_id,
        "quiz_id": quiz.quiz_id,
        "title": quiz.title,
        "quiz_type": quiz.quiz_type,
        "attempt_number": new_submission.attempt_number,
        "questions": questions_response
    }


# 🆕 Dựng lại QuizTakeResponse từ 1 submission IN_PROGRESS đã tồn tại (dùng cho resume).
def _build_take_response(submission) -> dict:
    questions_response = []

    # Nếu là quiz FIXED_QUESTION thì sắp xếp lại đúng thứ tự order_index đã cấu hình
    order_map = {}
    if submission.quiz and submission.quiz.quiz_type == QuizType.FIXED_QUESTION:
        order_map = {
            qq.question_id: qq.order_index for qq in submission.quiz.quiz_questions
        }
    sorted_details = sorted(
        submission.details,
        key=lambda d: order_map.get(d.question_id, 999)
    )

    for detail in sorted_details:
        question = detail.question

        # Xác định đã trả lời đúng/sai hay chưa trả lời, KHÔNG lộ đáp án đúng ra response
        is_answered_correct = None
        if detail.selected_option_id is not None:
            correct_option = next((opt for opt in question.options if opt.is_correct), None)
            is_answered_correct = bool(
                correct_option and detail.selected_option_id == correct_option.option_id
            )

        options_res = [
            {"option_id": opt.option_id, "option_text": opt.option_text}
            for opt in question.options
        ]

        questions_response.append({
            "detail_id": detail.detail_id,
            "question_id": question.question_id,
            "question_title": question.question_title,
            "question_type": question.question_type,
            "body_content": question.body_content,
            "max_points": question.max_points,
            "options": options_res,
            "video_trigger_seconds": detail.video_trigger_seconds,
            "selected_option_id": detail.selected_option_id,
            "is_answered_correct": is_answered_correct,
        })

    return {
        "submission_id": submission.submission_id,
        "quiz_id": submission.quiz_id,
        "title": submission.quiz.title if submission.quiz else "",
        "quiz_type": submission.quiz.quiz_type if submission.quiz else None,
        "attempt_number": submission.attempt_number,
        "questions": questions_response,
    }


@router.post("/{submission_id}/submit")
async def submit_quiz(
    submission_id: UUID,
    db: SessionDep,
    token: str = Depends(oauth2_scheme),               # Lấy raw JWT Token để forward sang Progress Service
    current_user: dict = Depends(get_current_user_role)
):
    # 1. Tiến hành chấm điểm bài thi dưới DB
    submitted_quiz = crud_quiz_submission.submit_and_evaluate(
        db=db, 
        submission_id=submission_id
    )
    
    # 2. Xử lý gọi API sang Progress Service dựa theo trạng thái
    next_unlocked = False
    
    if submitted_quiz.quiz and submitted_quiz.quiz.target_lesson_id:
        lesson_id = submitted_quiz.quiz.target_lesson_id
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        endpoint_path = None

        # TH 1: Đợi chấm điểm (SUBMITTED) -> CHỈ MỞ KHÓA bài học tiếp theo
        if submitted_quiz.status == SubmissionStatus.SUBMITTED:
            endpoint_path = f"/lesson_progress/lesson/{lesson_id}/unlock-next"

        # TH 2: Đã chấm (GRADED) VÀ ĐẠT (is_passed == True) -> HOÀN THÀNH bài học và MỞ KHÓA bài tiếp theo
        elif submitted_quiz.status == SubmissionStatus.GRADED and submitted_quiz.is_passed:
            endpoint_path = f"/lesson_progress/lesson/{lesson_id}/complete"

        # Thực hiện gọi request nếu thỏa mãn 1 trong 2 điều kiện trên
        if endpoint_path:
            progress_url = f"{settings.BACKEND_LEARNING_PROGRESS_URL}{endpoint_path}"
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.put(progress_url, headers=headers, timeout=5.0)
                    if response.status_code == 200:
                        next_unlocked = True
                    else:
                        print(f"Progress Service phản hồi lỗi ({response.status_code}): {response.text}")
            except httpx.RequestError as exc:
                print(f"Lỗi kết nối tới Progress Service: {exc}")

    # 3. Trả về kết quả cho Client
    return {
        "message": "Nộp bài thành công",
        "submission_id": submitted_quiz.submission_id,
        "status": submitted_quiz.status,
        "is_passed": submitted_quiz.is_passed,
        "total_score": submitted_quiz.total_score,
        "next_lesson_unlocked": next_unlocked
    }

GRADED_STATUSES = SubmissionStatus.GRADED

def _build_status_response(submission_obj) -> dict:
    """Hàm dùng chung để build response trạng thái bài làm."""
    is_graded = submission_obj.status in GRADED_STATUSES

    order_map = {}
    if submission_obj.quiz and submission_obj.quiz.quiz_type == QuizType.FIXED_QUESTION:
        order_map = {
            qq.question_id: qq.order_index
            for qq in submission_obj.quiz.quiz_questions
        }
    sorted_details = sorted(
        submission_obj.details,
        key=lambda d: order_map.get(d.question_id, 999)
    )

    questions_response = []
    for detail in sorted_details:
        question = detail.question

        options_res = []
        for opt in question.options:
            option_data = {"option_id": opt.option_id, "option_text": opt.option_text}
            if is_graded:
                option_data["is_correct"] = opt.is_correct
            options_res.append(option_data)

        item = {
            "detail_id": detail.detail_id,
            "question_id": question.question_id,
            "question_title": question.question_title,
            "question_type": question.question_type,
            "video_trigger_seconds": detail.video_trigger_seconds,  # 🆕 dùng cho tab "Bài thi" xem lại
            "body_content": question.body_content,
            "max_points": question.max_points,
            "options": options_res,
            "selected_option_id": detail.selected_option_id,
            "essay_answer_text": detail.essay_answer_text,
            "graph_json_data": detail.graph_json_data,
            "graph_image_url": detail.graph_image_url,
        }
        if is_graded:
            item["score_earned"] = detail.score_earned
            item["teacher_feedback"] = detail.teacher_feedback

        questions_response.append(item)

    return {
        "submission_id": submission_obj.submission_id,
        "quiz_id": submission_obj.quiz_id,
        "status": submission_obj.status,
        "attempt_number": submission_obj.attempt_number,
        "started_at": submission_obj.started_at,
        "total_score": submission_obj.total_score if is_graded else None,
        "is_passed": submission_obj.is_passed if is_graded else None,
        "is_peer_review": submission_obj.is_peer_review,
        "questions": questions_response
    }


@router.get("/lesson/{lesson_id}", response_model=QuizSubmissionStatusResponse)
def get_submission_status_by_lesson(
    lesson_id: UUID,
    db: SessionDep,
    current_user: dict = Depends(get_current_user_role)
):
    """
    Tìm lượt làm bài để hiển thị cho một lesson_id, theo quy tắc:
    - Nếu có lượt nào ĐẠT (is_passed == True) -> lấy lượt ĐẠT gần nhất (attempt_number lớn nhất).
    - Nếu chưa từng đạt -> lấy lượt gần nhất bất kể trạng thái (kể cả đang làm dở / trượt).
    """
    # 1. Tìm quiz gắn với lesson
    quiz = crud_quiz.get_quiz_by_lesson(db, lesson_id)
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bài thi cho bài học này"
        )

    user_id_str = current_user.get("user_id")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Không tìm thấy ID người dùng trong token"
        )
    user_id = UUID(user_id_str)

    # 2. Lấy tất cả lượt làm bài của user cho quiz này
    submissions = crud_quiz_submission.get_by_quiz_and_user(db, quiz_id=quiz.quiz_id, user_id=user_id)
    if not submissions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bạn chưa làm bài thi này lần nào"
        )

    # 3. Chọn lượt để hiển thị theo quy tắc
    passed_submissions = [s for s in submissions if s.is_passed]
    if passed_submissions:
        target_submission = max(passed_submissions, key=lambda s: s.attempt_number)
    else:
        target_submission = max(submissions, key=lambda s: s.attempt_number)

    # 4. Build response
    return _build_status_response(target_submission)

@router.get("/get-quiz-status/{lesson_id}", response_model=QuizSubmissionStatus)
def get_status(
    db: SessionDep,
    lesson_id: UUID,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = UUID(current_user["user_id"])
    quiz = crud_quiz.get_quiz_by_lesson(db, lesson_id)
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Không tìm thấy quiz cho bài học này"
        )
    submmit = crud_quiz_submission.get_last_attemp_submitted(db, quiz.quiz_id, user_id)
    
    return QuizSubmissionStatus(
        submit_status=submmit.status if submmit else None,
        is_peer_review=quiz.is_peer_review
    )

@router.get(
    "/courses/{course_id}/in-progress-count",
    response_model=int,
    summary="Số lượng thành viên đang trong quá trình học khóa học (dùng để gate tham gia chấm chéo)"
)
async def get_course_in_progress_count(
    course_id: UUID,
    token: str = Depends(oauth2_scheme),  # Forward sang Learning Progress Service
    current_user: dict = Depends(get_current_user_role)
):
    """Proxy sang Learning Progress Service. FE gọi API này trước khi cho phép học viên
    chọn 'Tham gia chấm chéo' — chỉ bật lựa chọn khi kết quả trả về >= 3."""
    url = f"{settings.BACKEND_LEARNING_PROGRESS_URL}/course_enrollment/get-users-in-progress/{course_id}"
    headers = {"Authorization": f"Bearer {token}"}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, timeout=5.0)
            if response.status_code == 200:
                return response.json()

            # 🆕 Log rõ status code + body trả về từ Learning Progress Service để debug
            # (vd: 404 = course_id không tồn tại bên đó, 401/403 = lỗi xác thực, 422 = sai kiểu tham số...)
            print(
                f"[peer-review] Learning Progress Service trả về lỗi khi lấy in-progress-count "
                f"cho course_id={course_id}: status={response.status_code}, body={response.text}"
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=(
                    f"Không lấy được số lượng học viên đang học khóa học "
                    f"(Learning Progress Service trả về {response.status_code}: {response.text})"
                ),
            )
    except httpx.RequestError as exc:
        print(f"[peer-review] Lỗi kết nối tới Learning Progress Service ({url}): {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Hệ thống theo dõi tiến độ học tập đang bận, vui lòng thử lại sau.",
        )


@router.get(
    "/subjects/{subject_id}/quizzes",
    response_model=List[QuizSubmissionSummaryResponse],
    summary="Lấy danh sách bài thi thuộc môn học kèm thống kê bài nộp"
)
async def get_quizzes_by_subject(
    subject_id: UUID,
    db: SessionDep,
    token: str = Depends(oauth2_scheme),
    current_user: dict = Depends(RoleChecker(["Instructor", "Tester"]))
):
    """
    API dành cho Giảng viên và Tester (nếu được giao môn học) lấy danh sách bài thi
    thuộc môn học cụ thể:
    - Báo cáo số lượng bài nộp đã hoàn thành và bài nộp chờ chấm.
    """
    user_id_str = current_user.get("user_id")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Không tìm thấy thông tin xác thực người dùng."
        )

    # Tester chỉ được xem môn học đã được Giảng viên giao (phân công)
    await _verify_tester_subject_access(subject_id, current_user, token)

    # Lấy dữ liệu bài thi kèm thống kê bài nộp từ DB
    quizzes_summary = crud_quiz_submission.get_quizzes_summary_by_subject(db=db, subject_id=subject_id)
    
    return quizzes_summary
@router.get(
    "/quizzes/{quiz_id}/users",
    response_model=List[QuizUserSummaryResponse],
    summary="Lấy danh sách sinh viên đã nộp đề thi"
)
async def get_quiz_users_summary(
    quiz_id: UUID,
    db: SessionDep,
    authorization: str = Header(...),
    current_user: dict = Depends(RoleChecker(["Instructor", "Admin", "Tester"]))
):
    token = authorization.replace("Bearer ", "").strip() if authorization else ""

    # Tester chỉ được xem học viên của môn học đã được Giảng viên giao
    subject_id = _get_subject_id_for_quiz(db, quiz_id)
    await _verify_tester_subject_access(subject_id, current_user, token)

    return crud_quiz_submission.get_users_summary_by_quiz(db=db, quiz_id=quiz_id, token=token)


@router.get(
    "/quizzes/{quiz_id}/users/{user_id}",
    response_model=List[UserSubmissionItem],
    summary="Lấy các lượt nộp của 1 sinh viên trong 1 đề thi"
)
async def get_user_submissions_for_quiz(
    quiz_id: UUID,
    user_id: UUID,
    db: SessionDep,
    token: str = Depends(oauth2_scheme),
    current_user: dict = Depends(RoleChecker(["Instructor", "Admin", "Tester"]))
):
    # Tester chỉ được xem lượt nộp của học viên thuộc môn học đã được Giảng viên giao
    subject_id = _get_subject_id_for_quiz(db, quiz_id)
    await _verify_tester_subject_access(subject_id, current_user, token)

    return crud_quiz_submission.get_submissions_by_user_and_quiz(db, quiz_id, user_id)

@router.get(
    "/{submission_id}/detail",
    response_model=QuizSubmissionDetailResponse,
    summary="Xem chi tiết nội dung bài làm"
)
async def get_submission_detail(
    submission_id: UUID,
    db: SessionDep,
    request: Request,
    current_user: dict = Depends(RoleChecker(["Instructor", "Admin", "Tester"]))
):
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip()

    # Tester chỉ được xem chi tiết bài làm thuộc môn học đã được Giảng viên giao
    subject_id = _get_subject_id_for_submission(db, submission_id)
    await _verify_tester_subject_access(subject_id, current_user, token)

    detail = crud_quiz_submission.get_submission_detail(
        db=db, submission_id=submission_id, token=token
    )
    
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy chi tiết bài làm"
        )
    return detail

@router.put("/{submission_id}/grade")
async def grade_submission(
    submission_id: UUID,
    payload: GradeSubmissionRequest,
    db: SessionDep,
    token: str = Depends(oauth2_scheme),               
    current_user = Depends(RoleChecker(["Instructor", "Tester"])), 
):
    # Tester chỉ được chấm điểm bài nộp thuộc môn học đã được Giảng viên giao
    subject_id = _get_subject_id_for_submission(db, submission_id)
    await _verify_tester_subject_access(subject_id, current_user, token)

    # 1. Cập nhật điểm, trạng thái, is_passed và gỡ cờ is_discrepant trực tiếp trong CRUD
    updated_submission = crud_quiz_submission.update_teacher_grading(
        db=db, submission_id=submission_id, gradings=payload.gradings
    )

    next_unlocked = False

    # 2. Nếu bài nộp đạt (is_passed = True) và bài thi gắn liền với lesson (target_lesson_id)
    if (
        updated_submission.status == SubmissionStatus.GRADED
        and updated_submission.is_passed
        and updated_submission.quiz
        and updated_submission.quiz.target_lesson_id
    ):
        lesson_id = updated_submission.quiz.target_lesson_id
        student_user_id = updated_submission.user_id

        progress_url = f"{settings.BACKEND_LEARNING_PROGRESS_URL}/lesson_progress/teacher/lesson/{lesson_id}/grade-complete"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        params = {
            "user_id": str(student_user_id)
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.put(
                    progress_url, 
                    headers=headers, 
                    params=params, 
                    timeout=5.0
                )
                if response.status_code == 200:
                    next_unlocked = True
                else:
                    print(f"Progress Service phản hồi lỗi ({response.status_code}): {response.text}")
        except httpx.RequestError as exc:
            print(f"Lỗi kết nối tới Progress Service: {exc}")

    # 3. Trả về kết quả phản hồi
    return {
        "message": "Cập nhật điểm thành công",
        "status": updated_submission.status,
        "is_passed": updated_submission.is_passed,
        "next_lesson_unlocked": next_unlocked,
    }