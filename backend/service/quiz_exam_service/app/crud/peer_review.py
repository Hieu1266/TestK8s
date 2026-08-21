import random
import httpx
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.enum import QuestionType, ReviewStatus, SubmissionStatus
from app.models.peer_review_assignments import PeerReviewAssignment
from app.models.peer_review_evaluations import PeerReviewEvaluation
from app.models.question import Question
from app.models.quiz import Quiz
from app.models.quiz_submission import QuizSubmission
from app.models.rubric_criteria import RubricCriteria
from app.models.submission_detail import SubmissionDetail
from app.core.config import settings

# Ngưỡng lệch điểm (max - min) giữa các reviewer để coi là "lệch điểm nghiêm trọng".
DISCREPANCY_THRESHOLD = 5.0

# Số người tham gia chấm chéo tối thiểu để bắt đầu phân công (mở khóa tính năng chấm chéo)
MIN_PARTICIPANTS_FOR_PEER_REVIEW = 3


# ---------------------------------------------------------------------------
# Helper: Kiểm tra điều kiện & Gọi API sang Progress Service
# ---------------------------------------------------------------------------
async def check_and_trigger_peer_review_completion(
    db: Session,
    user_id: UUID,
    quiz_id: UUID
) -> Dict[str, Any]:
    """
    Kiểm tra điều kiện và kích hoạt hoàn thành bài học chấm chéo:
    1. Học viên phải hoàn thành TẤT CẢ bài chấm chéo được giao (PeerReviewAssignment.status == COMPLETED).
    2. Bài nộp của chính học viên đó phải ĐẠT (QuizSubmission.is_passed == True).
    
    Nếu đủ điều kiện -> Gọi API sang Progress Service.
    """
    # 0. Lấy thông tin Quiz để lấy target_lesson_id
    quiz = db.get(Quiz, quiz_id)
    if not quiz or not quiz.target_lesson_id:
        return {
            "completed": False, 
            "reason": "Không tìm thấy bài học tương ứng (target_lesson_id) của bài thi này."
        }

    # 1. Điều kiện 1: Kiểm tra xem người dùng đã chấm xong HẾT tất cả bài được phân công chưa
    assignment_stmt = select(PeerReviewAssignment).where(
        PeerReviewAssignment.reviewer_id == user_id,
        PeerReviewAssignment.quiz_id == quiz_id
    )
    my_assignments = list(db.exec(assignment_stmt).all())

    if not my_assignments:
        return {
            "completed": False, 
            "reason": "Học viên chưa được phân công bài chấm chéo nào."
        }

    has_pending = any(a.status != ReviewStatus.COMPLETED for a in my_assignments)
    if has_pending:
        return {
            "completed": False, 
            "reason": "Học viên chưa hoàn thành tất cả các lượt chấm chéo được giao."
        }

    # 2. Điều kiện 2: Kiểm tra bài nộp của học viên đã ĐẠT (is_passed == True) chưa
    submission_stmt = select(QuizSubmission).where(
        QuizSubmission.user_id == user_id,
        QuizSubmission.quiz_id == quiz_id
    ).order_by(QuizSubmission.attempt_number.desc())
    
    latest_submission = db.exec(submission_stmt).first()

    if not latest_submission:
        return {
            "completed": False, 
            "reason": "Chưa tìm thấy bài nộp của học viên."
        }

    if latest_submission.is_passed is not True:
        return {
            "completed": False, 
            "reason": "Bài nộp của học viên chưa đạt yêu cầu (is_passed chưa bằng True)."
        }

    # 3. ĐỦ ĐIỀU KIỆN -> Gọi API sang Progress Service
    progress_url = f"{settings.BACKEND_LEARNING_PROGRESS_URL}/lesson_progress/complete-peer-review-submission/{quiz.target_lesson_id}"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.put(
                progress_url,
                params={"user_id": str(user_id)},
                timeout=5.0
            )
            if response.status_code == status.HTTP_200_OK:
                return {
                    "completed": True,
                    "message": "Đã gọi Progress Service cập nhật tiến độ hoàn thành thành công.",
                    "progress_data": response.json()
                }
            else:
                return {
                    "completed": False,
                    "reason": f"Progress Service trả về lỗi HTTP {response.status_code}",
                    "detail": response.text
                }
        except httpx.RequestError as e:
            return {
                "completed": False,
                "reason": f"Lỗi kết nối tới Progress Service: {str(e)}"
            }


# ---------------------------------------------------------------------------
# Truy vấn danh sách / chi tiết assignment của reviewer
# ---------------------------------------------------------------------------
def get_my_assignments(
    db: Session,
    reviewer_id: UUID,
    status_filter: Optional[ReviewStatus] = None,
    quiz_id: Optional[UUID] = None,
) -> List[PeerReviewAssignment]:
    stmt = select(PeerReviewAssignment).where(PeerReviewAssignment.reviewer_id == reviewer_id)
    if status_filter is not None:
        stmt = stmt.where(PeerReviewAssignment.status == status_filter)
    if quiz_id is not None:
        stmt = stmt.where(PeerReviewAssignment.quiz_id == quiz_id)
    stmt = stmt.order_by(PeerReviewAssignment.assigned_at.desc())
    return list(db.exec(stmt).all())


def get_assignment_for_reviewer(
    db: Session, assignment_id: UUID, reviewer_id: UUID
) -> PeerReviewAssignment:
    assignment = db.get(PeerReviewAssignment, assignment_id)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy lượt phân công chấm chéo",
        )
    if assignment.reviewer_id != reviewer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập lượt chấm chéo này",
        )
    return assignment


def get_essay_answers_with_rubric(db: Session, submission_id: UUID) -> List[dict]:
    """Lấy các câu trả lời tự luận (ESSAY) của bài nộp, kèm rubric của từng câu."""
    stmt = (
        select(SubmissionDetail, Question)
        .join(Question, SubmissionDetail.question_id == Question.question_id)
        .where(SubmissionDetail.submission_id == submission_id)
        .where(Question.question_type == QuestionType.ESSAY)
    )
    rows = db.exec(stmt).all()

    results: List[dict] = []
    for detail, question in rows:
        criteria_stmt = select(RubricCriteria).where(
            RubricCriteria.question_id == question.question_id
        )
        criterias = list(db.exec(criteria_stmt).all())
        results.append(
            {
                "question_id": question.question_id,
                "question_title": question.question_title,
                "body_content": question.body_content,
                "max_points": question.max_points,
                "essay_answer_text": detail.essay_answer_text,
                "graph_image_url": detail.graph_image_url,
                "graph_json_data": detail.graph_json_data,
                "video_trigger_seconds": detail.video_trigger_seconds,
                "rubric_criterias": criterias,
            }
        )
    return results


# ---------------------------------------------------------------------------
# Phân công chấm chéo
# ---------------------------------------------------------------------------
def try_create_assignments_for_quiz(db: Session, quiz_id: UUID) -> None:
    participants_stmt = select(QuizSubmission).where(
        QuizSubmission.quiz_id == quiz_id,
        QuizSubmission.is_peer_review == True,  # noqa: E712
        QuizSubmission.status == SubmissionStatus.SUBMITTED,
    )
    participant_submissions = list(db.exec(participants_stmt).all())

    latest_submission_by_user: dict[UUID, QuizSubmission] = {}
    for submission in participant_submissions:
        current = latest_submission_by_user.get(submission.user_id)
        if not current or submission.attempt_number > current.attempt_number:
            latest_submission_by_user[submission.user_id] = submission

    participant_count = len(latest_submission_by_user)
    if participant_count < MIN_PARTICIPANTS_FOR_PEER_REVIEW:
        return

    reviewers_per_submission = participant_count // 2 + 1
    all_user_ids = list(latest_submission_by_user.keys())

    existing_stmt = select(PeerReviewAssignment.submission_id).where(
        PeerReviewAssignment.quiz_id == quiz_id
    )
    already_distributed = set(db.exec(existing_stmt).all())

    pending_submissions = [
        submission
        for submission in latest_submission_by_user.values()
        if submission.submission_id not in already_distributed
    ]
    if not pending_submissions:
        return

    for submission in pending_submissions:
        candidate_reviewer_ids = [uid for uid in all_user_ids if uid != submission.user_id]
        chosen_reviewer_ids = random.sample(
            candidate_reviewer_ids,
            k=min(reviewers_per_submission, len(candidate_reviewer_ids)),
        )
        for reviewer_id in chosen_reviewer_ids:
            db.add(
                PeerReviewAssignment(
                    quiz_id=quiz_id,
                    reviewer_id=reviewer_id,
                    submission_id=submission.submission_id,
                )
            )

    db.commit()


def _get_valid_criteria_ids(db: Session, submission_id: UUID) -> set[UUID]:
    stmt = (
        select(RubricCriteria.criteria_id)
        .join(Question, RubricCriteria.question_id == Question.question_id)
        .join(SubmissionDetail, SubmissionDetail.question_id == Question.question_id)
        .where(SubmissionDetail.submission_id == submission_id)
        .where(Question.question_type == QuestionType.ESSAY)
    )
    return set(db.exec(stmt).all())


# ---------------------------------------------------------------------------
# Nộp kết quả chấm chéo (Chuyển thành async để await gọi Progress Service)
# ---------------------------------------------------------------------------
async def submit_evaluation(
    db: Session,
    assignment: PeerReviewAssignment,
    evaluations_in: list,
    general_comment: Optional[str],
) -> tuple[PeerReviewAssignment, List[PeerReviewEvaluation], dict]:
    if assignment.status == ReviewStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lượt chấm chéo này đã được hoàn thành trước đó",
        )
    if assignment.status == ReviewStatus.SKIPPED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lượt chấm chéo này đã bị bỏ qua, không thể nộp đánh giá",
        )

    valid_criteria_ids = _get_valid_criteria_ids(db, assignment.submission_id)
    if not valid_criteria_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bài nộp này không có tiêu chí chấm (rubric) nào để đánh giá",
        )

    submitted_ids = set()
    for item in evaluations_in:
        if item.criteria_id not in valid_criteria_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tiêu chí {item.criteria_id} không thuộc bài nộp này",
            )
        if item.criteria_id in submitted_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tiêu chí {item.criteria_id} bị chấm trùng lặp",
            )
        submitted_ids.add(item.criteria_id)

    if submitted_ids != valid_criteria_ids:
        missing = valid_criteria_ids - submitted_ids
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cần chấm đầy đủ tất cả tiêu chí của bài nộp. Còn thiếu: {missing}",
        )

    criteria_rows = db.exec(
        select(RubricCriteria, Question.max_points)
        .join(Question, RubricCriteria.question_id == Question.question_id)
        .where(RubricCriteria.criteria_id.in_(valid_criteria_ids))
    ).all()
    criteria_map = {
        criteria.criteria_id: (criteria, round((question_max_points or 0.0) * (criteria.percentage / 100), 2))
        for criteria, question_max_points in criteria_rows
    }

    for item in evaluations_in:
        _, max_allowed = criteria_map[item.criteria_id]
        if item.score > max_allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Điểm cho tiêu chí {item.criteria_id} vượt quá mức tối đa cho phép "
                    f"({max_allowed} = điểm tối đa câu hỏi x tỉ trọng tiêu chí)"
                ),
            )

    final_score = 0.0
    evaluation_objs: List[PeerReviewEvaluation] = []
    for item in evaluations_in:
        final_score += item.score

        eval_obj = PeerReviewEvaluation(
            assignment_id=assignment.assignment_id,
            criteria_id=item.criteria_id,
            score=item.score,
            feedback=item.feedback,
        )
        db.add(eval_obj)
        evaluation_objs.append(eval_obj)

    assignment.final_score_given = round(final_score, 2)
    assignment.general_comment = general_comment
    assignment.status = ReviewStatus.COMPLETED
    assignment.completed_at = datetime.utcnow()
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    for eval_obj in evaluation_objs:
        db.refresh(eval_obj)

    # 1. Chốt điểm bài nộp (nếu tất cả lượt chấm chéo cho bài nộp này đã xong)
    submission_result = _try_finalize_submission(db, assignment.submission_id)

    # 2. KIỂM TRA & KÍCH HOẠT HOÀN THÀNH BÀI HỌC CHO 2 ĐỐI TƯỢNG:
    
    # A. Người đi chấm (Reviewer): Họ vừa chấm xong 1 bài, kiểm tra xem đã hết danh sách được giao & bài cá nhân đạt chưa
    await check_and_trigger_peer_review_completion(
        db=db,
        user_id=assignment.reviewer_id,
        quiz_id=assignment.quiz_id
    )

    # B. Tác giả bài nộp (Author): Bài nộp của họ vừa được người này chấm xong, nếu bài này vừa chốt điểm & đạt
    submission = db.get(QuizSubmission, assignment.submission_id)
    if submission:
        await check_and_trigger_peer_review_completion(
            db=db,
            user_id=submission.user_id,
            quiz_id=assignment.quiz_id
        )

    return assignment, evaluation_objs, submission_result


# ---------------------------------------------------------------------------
# [Giảng viên] Danh sách bài nộp theo cờ is_peer_review
# ---------------------------------------------------------------------------
def get_submissions_by_quiz(
    db: Session, quiz_id: UUID, is_peer_review: Optional[bool] = None
) -> List[QuizSubmission]:
    """Danh sách bài nộp của 1 đề thi, có thể lọc theo is_peer_review:
    - False -> mục 'Bài nộp thường' (không chọn chấm chéo).
    - True  -> mục 'Chấm chéo' (gồm cả bài đã tự động chốt điểm lẫn bài lệch điểm)."""
    stmt = select(QuizSubmission).where(QuizSubmission.quiz_id == quiz_id)
    if is_peer_review is not None:
        stmt = stmt.where(QuizSubmission.is_peer_review == is_peer_review)
    stmt = stmt.order_by(QuizSubmission.started_at.desc())
    return list(db.exec(stmt).all())


def _try_finalize_submission(db: Session, submission_id: UUID) -> dict:
    submission = db.get(QuizSubmission, submission_id)
    if not submission:
        return {"fully_reviewed": False, "peer_avg_score": None, "is_discrepant": False}

    all_assignments = list(
        db.exec(
            select(PeerReviewAssignment).where(
                PeerReviewAssignment.submission_id == submission_id
            )
        ).all()
    )
    completed = [a for a in all_assignments if a.status == ReviewStatus.COMPLETED]

    submission.completed_review_count = len(completed)

    fully_reviewed = len(all_assignments) > 0 and len(completed) == len(all_assignments)

    if fully_reviewed:
        scores = [a.final_score_given for a in completed if a.final_score_given is not None]
        if scores:
            peer_avg = round(sum(scores) / len(scores), 2)
            is_discrepant = (max(scores) - min(scores)) >= DISCREPANCY_THRESHOLD if len(scores) > 1 else False

            submission.peer_avg_score = peer_avg
            submission.is_discrepant = is_discrepant

            # KHÔNG LỆCH ĐIỂM -> Tự động chốt điểm & tính hoàn thành (is_passed)
            if not is_discrepant:
                submission.total_score = peer_avg
                submission.graded_at = datetime.utcnow()
                submission.status = SubmissionStatus.GRADED

                # Tính cờ hoàn thành (is_passed) dựa trên passing_percentage của Quiz
                # (Quiz KHÔNG có trường "passing_score" - trường đúng là "passing_percentage",
                # tính theo % trên tổng điểm tối đa của đề thi, giống logic ở quiz_submission.py)
                max_points_stmt = (
                    select(Question.max_points)
                    .join(SubmissionDetail, SubmissionDetail.question_id == Question.question_id)
                    .where(SubmissionDetail.submission_id == submission.submission_id)
                )
                total_quiz_max_score = sum(
                    (mp or 0.0) for mp in db.exec(max_points_stmt).all()
                )

                passing_percentage = (
                    submission.quiz.passing_percentage
                    if (submission.quiz and submission.quiz.passing_percentage is not None)
                    else 0.0
                )
                passing_score = (passing_percentage / 100.0) * total_quiz_max_score
                submission.is_passed = submission.total_score >= passing_score

    db.add(submission)
    db.commit()
    db.refresh(submission)

    return {
        "fully_reviewed": fully_reviewed,
        "peer_avg_score": submission.peer_avg_score,
        "is_discrepant": submission.is_discrepant,
    }