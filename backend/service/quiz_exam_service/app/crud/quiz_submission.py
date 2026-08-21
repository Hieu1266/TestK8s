from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any, List
import httpx
from sqlalchemy import case
from sqlmodel import Session, select, func
from fastapi import HTTPException, status

from app.crud.base import CRUDBase
from app.crud import peer_review as crud_peer_review
from app.models.enum import SubmissionStatus, QuestionType
from app.models.quiz_submission import QuizSubmission
from app.models.quiz import Quiz
from app.models.question import Question
from app.models.question_option import QuestionOption
from app.models.quiz_question import QuizQuestion
from app.models.submission_detail import SubmissionDetail
from app.schemas.quiz_submission import (
    QuizSubmissionCreate,
    QuizSubmissionUpdate,
    UserSubmissionItem,
    QuestionGradingInput
)
from app.core.security import settings


def _normalize_fill_in_blank_answer(text: Optional[str]) -> str:
    """Chuẩn hóa đáp án điền khuyết trước khi so sánh: bỏ khoảng trắng thừa đầu/cuối,
    thu gọn nhiều khoảng trắng liên tiếp, không phân biệt hoa/thường."""
    if not text:
        return ""
    return " ".join(text.strip().lower().split())


def _is_fill_in_blank_correct(student_answer: Optional[str], correct_option: Optional[QuestionOption]) -> bool:
    if not correct_option:
        return False
    student_norm = _normalize_fill_in_blank_answer(student_answer)
    correct_norm = _normalize_fill_in_blank_answer(correct_option.option_text)
    return bool(student_norm) and student_norm == correct_norm


class CRUDQuizSubmission(CRUDBase[QuizSubmission, QuizSubmissionCreate, QuizSubmissionUpdate, UUID]):

    # Ghi đè hàm create để tự tính attempt_number
    def create(self, db: Session, obj_in: QuizSubmissionCreate) -> QuizSubmission:
        # 1. Đếm số lần nộp bài (submission) hiện có của user đối với quiz này
        statement = select(func.count(self.model.submission_id)).where(
            self.model.quiz_id == obj_in.quiz_id,
            self.model.user_id == obj_in.user_id
        )
        current_attempts = db.exec(statement).one()
        
        # 2. Tự động điều chỉnh attempt_number cho lần làm bài mới nhất
        obj_in.attempt_number = current_attempts + 1
        
        # 3. Gọi lại hàm create nguyên bản của CRUDBase để lưu vào Database
        return super().create(db=db, obj_in=obj_in)

    # Tìm submission đang làm dở (IN_PROGRESS) của user cho 1 quiz cụ thể
    def get_in_progress_by_quiz_and_user(
        self, db: Session, quiz_id: UUID, user_id: UUID
    ) -> Optional[QuizSubmission]:
        statement = select(QuizSubmission).where(
            QuizSubmission.quiz_id == quiz_id,
            QuizSubmission.user_id == user_id,
            QuizSubmission.status == SubmissionStatus.IN_PROGRESS,
        ).order_by(QuizSubmission.attempt_number.desc())
        return db.exec(statement).first()

    def submit_and_evaluate(self, db: Session, submission_id: UUID) -> QuizSubmission:
        # 1. Lấy thông tin submission cùng các relationships
        submission = self.get_by_id(db, submission_id)
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Không tìm thấy bài nộp"
            )

        if submission.status != SubmissionStatus.IN_PROGRESS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Bài thi này đã được nộp trước đó"
            )

        # 2. Kiểm tra xem trong đề thi có ít nhất 1 câu tự luận hay không
        has_essay = any(
            detail.question.question_type == QuestionType.ESSAY 
            for detail in submission.details
        )

        total_earned_score = 0.0
        total_quiz_max_score = 0.0

        # 3. Chấm điểm tự động cho các câu trắc nghiệm / đúng sai
        for detail in submission.details:
            q = detail.question
            max_p = q.max_points or 0.0
            total_quiz_max_score += max_p

            if q.question_type in (QuestionType.MULTIPLE_CHOICE, QuestionType.TRUE_FALSE):
                correct_option = next((opt for opt in q.options if opt.is_correct), None)
                
                if correct_option and detail.selected_option_id == correct_option.option_id:
                    detail.score_earned = max_p
                    total_earned_score += max_p
                else:
                    detail.score_earned = 0.0

                db.add(detail)

            elif q.question_type == QuestionType.FILL_IN_BLANK:
                # Câu điền khuyết: đáp án của thí sinh được lưu trong essay_answer_text,
                # so sánh (không phân biệt hoa/thường, bỏ khoảng trắng thừa) với option_text
                # của lựa chọn có is_correct = True.
                correct_option = next((opt for opt in q.options if opt.is_correct), None)

                if _is_fill_in_blank_correct(detail.essay_answer_text, correct_option):
                    detail.score_earned = max_p
                    total_earned_score += max_p
                else:
                    detail.score_earned = 0.0

                db.add(detail)

        # 4. Cập nhật trạng thái bài thi & thuộc tính is_passed
        submission.submitted_at = datetime.utcnow()

        if has_essay:
            submission.status = SubmissionStatus.SUBMITTED
            submission.total_score = None  # Chưa có điểm tổng chính thức
            submission.is_passed = False
        else:
            submission.status = SubmissionStatus.GRADED
            submission.total_score = total_earned_score
            
            passing_percentage = (
                submission.quiz.passing_percentage 
                if (submission.quiz and submission.quiz.passing_percentage is not None) 
                else 0.0
            )
            
            passing_score = (passing_percentage / 100.0) * total_quiz_max_score
            submission.is_passed = total_earned_score >= passing_score

        db.add(submission)
        db.commit()
        db.refresh(submission)

        # 5. Nếu bài nộp có tham gia chấm chéo và vừa chuyển sang SUBMITTED (chờ chấm),
        # kiểm tra xem đã đủ điều kiện (>= 3 người tham gia) để bắt đầu phân công chấm chéo chưa.
        if has_essay and submission.is_peer_review and submission.status == SubmissionStatus.SUBMITTED:
            crud_peer_review.try_create_assignments_for_quiz(db, submission.quiz_id)

        return submission

    def grade_essay_submission(self, db: Session, submission_id: UUID) -> QuizSubmission:
        """Hàm dùng khi Giảng viên chấm xong các câu tự luận"""
        submission = self.get_by_id(db, submission_id)
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Không tìm thấy bài nộp"
            )

        total_earned_score = 0.0
        total_quiz_max_score = 0.0
        has_ungraded_essay = False

        for detail in submission.details:
            q = detail.question
            max_p = q.max_points or 0.0
            total_quiz_max_score += max_p

            if q.question_type == QuestionType.ESSAY:
                if detail.score_earned is None:
                    has_ungraded_essay = True
                else:
                    total_earned_score += detail.score_earned
            else:
                total_earned_score += (detail.score_earned or 0.0)

        if not has_ungraded_essay:
            submission.status = SubmissionStatus.GRADED
            submission.total_score = total_earned_score

            passing_percentage = (
                submission.quiz.passing_percentage 
                if (submission.quiz and submission.quiz.passing_percentage is not None) 
                else 0.0
            )
            passing_score = (passing_percentage / 100.0) * total_quiz_max_score
            submission.is_passed = total_earned_score >= passing_score

            db.add(submission)
            db.commit()
            db.refresh(submission)

        return submission

    def get_by_quiz_and_user(self, db: Session, quiz_id: UUID, user_id: UUID) -> List[QuizSubmission]:
        statement = select(QuizSubmission).where(
            QuizSubmission.quiz_id == quiz_id,
            QuizSubmission.user_id == user_id
        )
        return db.exec(statement).all()

    def get_last_attemp_submitted(self, db: Session, quiz_id: UUID, user_id: UUID) -> Optional[QuizSubmission]:
        statement = select(QuizSubmission).where(
            QuizSubmission.quiz_id == quiz_id,
            QuizSubmission.user_id == user_id
        ).order_by(QuizSubmission.attempt_number.desc())
        return db.exec(statement).first()

    def submit_and_evaluate_detail(
        self,
        db: Session,
        detail_id: UUID,
        selected_option_id: Optional[UUID] = None,
        essay_answer_text: Optional[str] = None,
        graph_json_data: Optional[str] = None,
        graph_image_url: Optional[str] = None
    ) -> Optional[bool]:
        statement = select(SubmissionDetail).where(SubmissionDetail.detail_id == detail_id)
        detail = db.exec(statement).first()

        if not detail:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Không tìm thấy chi tiết bài nộp"
            )

        question = detail.question
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Không tìm thấy thông tin câu hỏi"
            )

        # 1. Cập nhật dữ liệu bài làm của sinh viên vào SubmissionDetail
        if selected_option_id is not None:
            detail.selected_option_id = selected_option_id
        if essay_answer_text is not None:
            detail.essay_answer_text = essay_answer_text
        if graph_json_data is not None:
            detail.graph_json_data = graph_json_data
        if graph_image_url is not None:
            detail.graph_image_url = graph_image_url

        is_correct: Optional[bool] = None

        # 2. Kiểm tra đáp án tự động dựa trên QuestionType
        if question.question_type in (QuestionType.MULTIPLE_CHOICE, QuestionType.TRUE_FALSE):
            correct_option = next((opt for opt in question.options if opt.is_correct), None)
            
            if correct_option and detail.selected_option_id == correct_option.option_id:
                is_correct = True
                detail.score_earned = question.max_points or 0.0
            else:
                is_correct = False
                detail.score_earned = 0.0

        elif question.question_type == QuestionType.FILL_IN_BLANK:
            correct_option = next((opt for opt in question.options if opt.is_correct), None)

            if _is_fill_in_blank_correct(detail.essay_answer_text, correct_option):
                is_correct = True
                detail.score_earned = question.max_points or 0.0
            else:
                is_correct = False
                detail.score_earned = 0.0

        elif question.question_type == QuestionType.ESSAY:
            is_correct = None
            detail.score_earned = None

        db.add(detail)

        # 3. Cập nhật total_score và is_passed của bài thi cha (QuizSubmission)
        submission = detail.submission
        if submission:
            total_earned_score = 0.0
            total_quiz_max_score = 0.0
            has_ungraded_essay = False

            for d in submission.details:
                d_score = detail.score_earned if d.detail_id == detail.detail_id else d.score_earned
                q = d.question
                max_p = q.max_points or 0.0
                total_quiz_max_score += max_p

                if q.question_type == QuestionType.ESSAY:
                    if d_score is None:
                        has_ungraded_essay = True
                    else:
                        total_earned_score += d_score
                else:
                    total_earned_score += (d_score or 0.0)

            if submission.status == SubmissionStatus.GRADED or not has_ungraded_essay:
                passing_percentage = (
                    submission.quiz.passing_percentage 
                    if (submission.quiz and submission.quiz.passing_percentage is not None) 
                    else 0.0
                )
                passing_score = (passing_percentage / 100.0) * total_quiz_max_score
                submission.is_passed = total_earned_score >= passing_score

                if submission.status == SubmissionStatus.GRADED:
                    submission.total_score = total_earned_score

                db.add(submission)

        db.commit()
        db.refresh(detail)
        return is_correct

    def get_quizzes_summary_by_subject(
        self, db: Session, subject_id: UUID
    ) -> List[Dict[str, Any]]:
        pending_case = case((QuizSubmission.status == SubmissionStatus.SUBMITTED, 1), else_=0)
        graded_case = case((QuizSubmission.status == SubmissionStatus.GRADED, 1), else_=0)

        statement = (
            select(
                Quiz,
                func.count(QuizSubmission.submission_id).label("total_submissions"),
                func.coalesce(func.sum(pending_case), 0).label("pending_gradings"),
                func.coalesce(func.sum(graded_case), 0).label("graded_count"),
            )
            .outerjoin(QuizSubmission, Quiz.quiz_id == QuizSubmission.quiz_id)
            .where(Quiz.subject_id == subject_id)
            .group_by(Quiz.quiz_id)
        )

        results = db.exec(statement).all()

        response_data = []
        for quiz, total_sub, pending, graded in results:
            response_data.append({
                "quiz_id": quiz.quiz_id,
                "subject_id": quiz.subject_id,
                "title": quiz.title,
                "description": quiz.description,
                "duration_minutes": quiz.duration_minutes,
                "quiz_type": quiz.quiz_type,
                "is_active": quiz.is_active,
                "total_submissions": total_sub,
                "pending_gradings": pending,
                "graded_count": graded,
            })

        return response_data

    def get_users_summary_by_quiz(
        self, db: Session, quiz_id: UUID, token: str
    ) -> List[Dict[str, Any]]:
        pending_case = case((QuizSubmission.status == SubmissionStatus.SUBMITTED, 1), else_=0)

        statement = (
            select(
                QuizSubmission.user_id,
                func.count(QuizSubmission.submission_id).label("total_submissions"),
                func.coalesce(func.sum(pending_case), 0).label("pending_gradings"),
                func.max(QuizSubmission.submitted_at).label("latest_submitted_at"),
            )
            .where(QuizSubmission.quiz_id == quiz_id)
            .group_by(QuizSubmission.user_id)
        )

        results = db.exec(statement).all()
        if not results:
            return []

        user_ids = {r[0] for r in results}
        user_map: Dict[str, Dict[str, str]] = {}
        user_service_url = getattr(settings, "BACKEND_USER_URL", "http://localhost:8000/api/v1")
        headers = {"Authorization": f"Bearer {token}"}

        with httpx.Client(timeout=5.0) as client:
            for uid in user_ids:
                try:
                    res = client.get(f"{user_service_url}/get-user/{uid}", headers=headers)
                    if res.status_code == 200:
                        data = res.json()
                        user_map[str(uid)] = {
                            "username": data.get("username", "N/A"),
                            "email": data.get("email", "N/A"),
                        }
                    else:
                        user_map[str(uid)] = {"username": "Unknown User", "email": "unknown@domain.com"}
                except Exception:
                    user_map[str(uid)] = {"username": "Error Fetching User", "email": "error@domain.com"}

        response_data = []
        for uid, total_sub, pending, latest_at in results:
            u_info = user_map.get(str(uid), {"username": "N/A", "email": "N/A"})
            response_data.append({
                "user_id": uid,
                "username": u_info["username"],
                "email": u_info["email"],
                "total_submissions": total_sub,
                "pending_gradings": pending,
                "latest_submitted_at": latest_at,
            })

        return response_data

    def get_submission_detail(
        self, db: Session, submission_id: UUID, token: str
    ) -> Optional[Dict[str, Any]]:
        # 1. Lấy thông tin lượt nộp bài
        submission = db.get(QuizSubmission, submission_id)
        if not submission:
            return None

        # 2. Lấy thông tin Bài thi
        quiz = db.get(Quiz, submission.quiz_id)
        quiz_title = quiz.title if quiz else "Bài thi"

        # 3. Lấy thông tin Sinh viên từ User Service
        user_info = {"username": "N/A", "email": "N/A"}
        user_service_url = getattr(settings, "BACKEND_USER_URL", "http://localhost:8000/api/v1")
        headers = {"Authorization": f"Bearer {token}"} if token else {}

        try:
            with httpx.Client(timeout=5.0) as client:
                res = client.get(f"{user_service_url}/get-user/{submission.user_id}", headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    user_info = {
                        "username": data.get("username", "N/A"),
                        "email": data.get("email", "N/A"),
                    }
        except Exception:
            pass

        # 4. Lấy danh sách câu trả lời
        details = submission.details if submission.details else db.exec(
            select(SubmissionDetail).where(SubmissionDetail.submission_id == submission_id)
        ).all()

        answers_detail = []
        max_possible_score = 0.0

        for dt in details:
            question = db.get(Question, dt.question_id)
            if not question:
                continue

            q_max_score = (
                getattr(question, "max_points", None) or 
                getattr(question, "score", None) or 
                getattr(question, "points", None) or 
                1.0
            )
            max_possible_score += float(q_max_score)

            q_text = (
                getattr(question, "question_title", None) or 
                getattr(question, "question_text", None) or 
                getattr(question, "body_content", None) or 
                "Câu hỏi"
            )
            # 🆕 body_content lưu nội dung câu có chỗ trống (đối với FILL_IN_BLANK) hoặc
            # phần mô tả/đề bài chi tiết cho các loại câu hỏi khác — cần trả riêng vì
            # q_text ở trên ưu tiên lấy question_title (thường chỉ là nhãn chung).
            q_body_content = getattr(question, "body_content", None)

            options = db.exec(
                select(QuestionOption).where(QuestionOption.question_id == question.question_id)
            ).all()

            options_detail = [
                {
                    "option_id": opt.option_id,
                    "option_text": opt.option_text,
                    "is_correct": getattr(opt, "is_correct", False),
                }
                for opt in options
            ]

            answers_detail.append({
                "detail_id": dt.detail_id,
                "question_id": question.question_id,
                "question_text": q_text,
                "body_content": q_body_content,  # 🆕
                "question_type": getattr(question, "question_type", "SINGLE_CHOICE"),
                "max_score": float(q_max_score),
                "score_earned": dt.score_earned,
                "selected_option_id": dt.selected_option_id,
                "essay_answer_text": dt.essay_answer_text,
                "graph_json_data": dt.graph_json_data,
                "graph_image_url": dt.graph_image_url,
                "teacher_feedback": dt.teacher_feedback,
                "options": options_detail,
            })

        return {
            "submission_id": submission.submission_id,
            "quiz_id": submission.quiz_id,
            "quiz_title": quiz_title,
            "user_id": submission.user_id,
            "username": user_info["username"],
            "email": user_info["email"],
            "score": getattr(submission, "total_score", getattr(submission, "score", None)),
            "max_possible_score": max_possible_score,
            "status": submission.status,
            "started_at": submission.started_at,
            "submitted_at": submission.submitted_at,
            "answers": answers_detail,
        }

    def get_submissions_by_user_and_quiz(
        self, db: Session, quiz_id: UUID, user_id: UUID
    ) -> List[UserSubmissionItem]:
        """Lấy danh sách các lượt nộp bài của một user cụ thể trong một quiz kèm max_score"""
        
        # 1. Tính tổng điểm tối đa (max_score) của Bài thi từ các câu hỏi tương ứng
        max_score_stmt = (
            select(func.coalesce(func.sum(Question.max_points), 0.0))
            .select_from(QuizQuestion)
            .join(Question, QuizQuestion.question_id == Question.question_id)
            .where(QuizQuestion.quiz_id == quiz_id)
        )
        max_score = float(db.exec(max_score_stmt).one() or 0.0)

        # 2. Lấy danh sách lượt nộp bài của sinh viên
        statement = (
            select(QuizSubmission)
            .where(QuizSubmission.quiz_id == quiz_id)
            .where(QuizSubmission.user_id == user_id)
            .order_by(QuizSubmission.started_at.desc())
        )
        submissions = db.exec(statement).all()

        # 3. Map dữ liệu sang schema UserSubmissionItem kèm max_score
        return [
            UserSubmissionItem(
                submission_id=sub.submission_id,
                quiz_id=sub.quiz_id,
                user_id=sub.user_id,
                total_score=sub.total_score,
                max_score=max_score,
                status=sub.status,
                started_at=sub.started_at,
                submitted_at=sub.submitted_at,
            )
            for sub in submissions
        ]
    def update_teacher_grading(
        self,
        db: Session,
        submission_id: UUID,
        gradings: List[QuestionGradingInput]
    ) -> QuizSubmission:
        # 1. Lấy thông tin bài nộp
        submission = self.get_by_id(db, submission_id)
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy bài nộp"
            )

        # Map danh sách chấm điểm theo detail_id để truy xuất nhanh O(1)
        grading_map = {g.detail_id: g for g in gradings}

        total_earned_score = 0.0
        total_quiz_max_score = 0.0

        # 2. Duyệt qua từng câu hỏi để cập nhật điểm & feedback của Giảng viên
        for detail in submission.details:
            q = detail.question
            max_p = (q.max_points or 0.0) if q else 0.0
            total_quiz_max_score += max_p

            # Cập nhật nếu câu trả lời này nằm trong danh sách chấm của Giảng viên
            if detail.detail_id in grading_map:
                item_grading = grading_map[detail.detail_id]
                detail.score_earned = item_grading.score_earned
                if hasattr(item_grading, "teacher_feedback") and item_grading.teacher_feedback is not None:
                    detail.teacher_feedback = item_grading.teacher_feedback
                db.add(detail)

            total_earned_score += (detail.score_earned or 0.0)

        # 3. Cập nhật kết quả tổng quan bài thi
        submission.total_score = total_earned_score
        submission.status = SubmissionStatus.GRADED

        passing_percentage = (
            submission.quiz.passing_percentage
            if (submission.quiz and submission.quiz.passing_percentage is not None)
            else 0.0
        )
        passing_score = (passing_percentage / 100.0) * total_quiz_max_score
        submission.is_passed = total_earned_score >= passing_score

        # 4. Gỡ cờ bất đồng điểm (is_discrepant) nếu đây là bài nộp chấm chéo
        if submission.is_peer_review and submission.is_discrepant:
            submission.is_discrepant = False

        # 5. Lưu toàn bộ thay đổi vào Database
        db.add(submission)
        db.commit()
        db.refresh(submission)

        return submission

crud_quiz_submission = CRUDQuizSubmission(QuizSubmission)