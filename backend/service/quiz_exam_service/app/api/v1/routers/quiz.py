from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.core.db import settings
from app.api.v1.deps import SessionDep
from app.core.security import get_current_user_role
from app.crud.quiz import crud_quiz
from app.crud.question_pool import crud_question_pool
from app.schemas.quiz import (
    QuizCreate, QuizUpdate, QuizItem, QuizDetail,
    QuizFixedQuestionItem, QuizPoolRuleItem, QuizQuestionReorderItem,
)
from app.models.enum import QuizType
from app.schemas.quiz_question import QuizQuestionCreate, QuizQuestionUpdate
from app.schemas.quiz_pool_rule import QuizPoolRuleCreate, QuizPoolRuleUpdate
from uuid import UUID
import httpx
from app.crud.quiz_question import crud_quiz_question
from app.crud.quiz_pool_rule import crud_quiz_pool_rule

router = APIRouter(prefix="/quizzes" ,tags=["quizzes"])

COURSE_SERVICE_URL = settings.BACKEND_COURSE_URL

async def get_owner(subject_id: UUID) -> UUID:
    async with httpx.AsyncClient() as client:
        try:
            url = f"{COURSE_SERVICE_URL}/subjects/get-owner/{subject_id}"
            response = await client.get(url, timeout=5.0)
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Không thể xác thực thông tin bài học do lỗi từ Course Service."
                )
            
            owner_id_str = response.json()
            
            if not owner_id_str:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Môn học không tồn tại"
                )
            
            return UUID(owner_id_str)
                
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Kết nối tới Course Service thất bại: {exc}"
            )


async def _get_quiz_or_404_and_check_owner(db: SessionDep, quiz_id: UUID, current_user: dict):
    db_quiz = crud_quiz.get_by_id(db, id=quiz_id)
    if not db_quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy đề thi.")
    owner_id = await get_owner(db_quiz.subject_id)
    if UUID(current_user["user_id"]) != owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền thao tác trên đề thi này"
        )
    return db_quiz


@router.get("/{lesson_id}/had-quiz")
def is_lesson_had_quiz(
    db: SessionDep,
    lesson_id: UUID
):
    return crud_quiz.is_lesson_had_quiz(db, lesson_id)

# 🆕 Sắp xếp lại thứ tự câu hỏi cố định (kéo thả / nút lên-xuống)
@router.patch("/{quiz_id}/questions/reorder")
async def reorder_fixed_questions(
    db: SessionDep,
    quiz_id: UUID,
    obj_in: list[QuizQuestionReorderItem],
    current_user: dict = Depends(get_current_user_role)
):
    await _get_quiz_or_404_and_check_owner(db, quiz_id, current_user)

    ordered_items = [(item.question_id, item.order_index) for item in obj_in]
    crud_quiz_question.reorder_questions(db, quiz_id=quiz_id, ordered_items=ordered_items)

    return {"status": "success", "message": "Đã cập nhật lại thứ tự câu hỏi."}



@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_initial_quiz(
    db: SessionDep, 
    obj_in: QuizCreate,
    current_user: dict = Depends(get_current_user_role)
):
    """
    API khởi tạo đề thi (Quiz) ban đầu.
    """
    owner_id = await get_owner(obj_in.subject_id)
    if UUID(current_user["user_id"]) != owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail ="Bạn không có quyền tạo câu hỏi cho môn học"
    )
    if obj_in.target_lesson_id:
        try:
            response = httpx.get(f"{COURSE_SERVICE_URL}/lessons/is-existed/{obj_in.target_lesson_id}", timeout=5.0)
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Không thể xác thực thông tin bài học do lỗi từ Course Service."
                )
                
            is_lesson_existed = response.json()
            
            if not is_lesson_existed:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Bài học với ID {obj_in.target_lesson_id} không tồn tại trên hệ thống."
                )
                
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Kết nối tới Course Service thất bại: {exc}"
            )

        if crud_quiz.is_lesson_had_quiz(db, lesson_id=obj_in.target_lesson_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Bài học với ID {obj_in.target_lesson_id} đã được cấu hình đề thi trước đó."
            )

    db_quiz = crud_quiz.create(db, obj_in=obj_in)

    return {
        "status": "success",
        "message": "Khởi tạo khung đề thi thành công!",
        "data": {
            "quiz_id": db_quiz.quiz_id,
            "title": db_quiz.title,
            "quiz_type": db_quiz.quiz_type,
            "created_at": db_quiz.created_at
        }
    }

@router.delete("/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quiz(
    db: SessionDep,
    quiz_id: UUID,
    current_user: dict = Depends(get_current_user_role)
):
    await _get_quiz_or_404_and_check_owner(db, quiz_id, current_user)
    crud_quiz.delete(db, id=quiz_id)
    return None

# 🆕 Cập nhật thông tin cơ bản của đề thi
@router.put("/{quiz_id}", response_model=QuizItem)
async def update_quiz(
    db: SessionDep,
    quiz_id: UUID,
    obj_in: QuizUpdate,
    current_user: dict = Depends(get_current_user_role)
):
    print(f"DEBUG: Payload nhận được (Pydantic model): {obj_in.model_dump()}")
    db_quiz = await _get_quiz_or_404_and_check_owner(db, quiz_id, current_user)

    if obj_in.target_lesson_id and obj_in.target_lesson_id != db_quiz.target_lesson_id:
        try:
            response = httpx.get(f"{COURSE_SERVICE_URL}/lessons/is-existed/{obj_in.target_lesson_id}", timeout=5.0)
            if response.status_code != 200 or not response.json():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Bài học với ID {obj_in.target_lesson_id} không tồn tại trên hệ thống."
                )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Kết nối tới Course Service thất bại: {exc}"
            )
        if crud_quiz.is_lesson_had_quiz(db, lesson_id=obj_in.target_lesson_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Bài học với ID {obj_in.target_lesson_id} đã được cấu hình đề thi khác."
            )

    updated = crud_quiz.update(db, db_obj=db_quiz, obj_in=obj_in)
    return updated

# 🆕 Lấy chi tiết 1 quiz - dùng cho trang cấu hình đề thi (câu hỏi cố định / luật pool ngẫu nhiên)
@router.get("/{quiz_id}", response_model=QuizDetail)
async def get_quiz_detail(
    db: SessionDep,
    quiz_id: UUID,
    current_user: dict = Depends(get_current_user_role)
):
    db_quiz = await _get_quiz_or_404_and_check_owner(db, quiz_id, current_user)

    fixed_questions = []
    pool_rules = []

    if db_quiz.quiz_type == QuizType.FIXED_QUESTION:
        quiz_questions = crud_quiz_question.get_multi_by_quiz(db, quiz_id)
        fixed_questions = [
            QuizFixedQuestionItem(
                question_id=qq.question_id,
                order_index=qq.order_index,
                video_trigger_seconds=qq.video_trigger_seconds,
                question=qq.question,
            )
            for qq in quiz_questions
        ]
    else:
        rules = crud_quiz_pool_rule.get_multi_by_quiz(db, quiz_id)
        pool_rules = [
            QuizPoolRuleItem(
                rule_id=r.rule_id,
                pool_id=r.pool_id,
                quantity=r.quantity,
                pool_title=r.pool.title if r.pool else "",
                pool_total_questions=crud_question_pool.count_questions(db, r.pool_id),
            )
            for r in rules
        ]

    return QuizDetail(
        quiz_id=db_quiz.quiz_id,
        subject_id=db_quiz.subject_id,
        title=db_quiz.title,
        description=db_quiz.description or "",
        duration_minutes=db_quiz.duration_minutes,
        passing_percentage=db_quiz.passing_percentage,
        max_attempts=db_quiz.max_attempts,
        quiz_type=db_quiz.quiz_type,
        placement_type=db_quiz.placement_type,
        target_lesson_id=db_quiz.target_lesson_id,
        is_active=db_quiz.is_active,
        created_at=db_quiz.created_at,
        is_peer_review=db_quiz.is_peer_review,
        fixed_questions=fixed_questions,
        pool_rules=pool_rules,
    )


@router.post("/{quiz_id}/questions", status_code=status.HTTP_200_OK)
async def add_fixed_questions(
    db: SessionDep, 
    quiz_id: UUID, 
    obj_in: list[QuizQuestionCreate],
    current_user: dict = Depends(get_current_user_role)
):
    """
    API bổ sung câu hỏi cố định vào đề thi (Dành cho FIXED_QUESTION).
    """
    db_quiz = await _get_quiz_or_404_and_check_owner(db, quiz_id, current_user)
    
    if db_quiz.quiz_type != QuizType.FIXED_QUESTION:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Đề thi này được cấu hình ở dạng RANDOM_QUESTION, không thể thêm câu hỏi cố định."
        )

    crud_quiz_question.add_questions_to_quiz(db, quiz_id=quiz_id, questions_in=obj_in)
    db.commit()
    
    return {"status": "success", "message": "Đã thêm danh sách câu hỏi và tự động sắp xếp thứ tự hiển thị thành công."}

# 🆕 Cập nhật video_trigger_seconds (mốc giây kích hoạt trong video) riêng cho 1 câu hỏi đã có trong đề thi
@router.patch("/{quiz_id}/questions/{question_id}")
async def update_fixed_question(
    db: SessionDep,
    quiz_id: UUID,
    question_id: UUID,
    obj_in: QuizQuestionUpdate,
    current_user: dict = Depends(get_current_user_role)
):
    db_quiz = await _get_quiz_or_404_and_check_owner(db, quiz_id, current_user)

    if db_quiz.placement_type != "IN_VIDEO" and obj_in.video_trigger_seconds is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ đề thi có placement_type = IN_VIDEO mới cấu hình được mốc giây kích hoạt."
        )

    quiz_question = crud_quiz_question.get_by_quiz_and_question(db, quiz_id=quiz_id, question_id=question_id)
    if not quiz_question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Câu hỏi không nằm trong đề thi này.")

    updated = crud_quiz_question.update(db, db_obj=quiz_question, obj_in=obj_in)
    return {
        "status": "success",
        "data": {"question_id": updated.question_id, "video_trigger_seconds": updated.video_trigger_seconds},
    }

# 🆕 Xóa 1 câu hỏi cố định khỏi đề thi (tự động dồn lại order_index)
@router.delete("/{quiz_id}/questions/{question_id}")
async def remove_fixed_question(
    db: SessionDep,
    quiz_id: UUID,
    question_id: UUID,
    current_user: dict = Depends(get_current_user_role)
):
    await _get_quiz_or_404_and_check_owner(db, quiz_id, current_user)

    removed = crud_quiz_question.delete_question_and_reorder(db, quiz_id=quiz_id, question_id=question_id)
    if not removed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Câu hỏi không nằm trong đề thi này.")

    return {"status": "success", "message": "Đã xóa câu hỏi khỏi đề thi."}


@router.post("/{quiz_id}/pool-rules", status_code=status.HTTP_200_OK)
async def add_pool_rules(
    db: SessionDep, 
    quiz_id: UUID, 
    obj_in: list[QuizPoolRuleCreate],
    current_user: dict = Depends(get_current_user_role)
):
    """
    API bổ sung luật bốc ngân hàng câu hỏi (Dành cho RANDOM_QUESTION).
    """
    db_quiz = await _get_quiz_or_404_and_check_owner(db, quiz_id, current_user)
    
    if db_quiz.quiz_type != QuizType.RANDOM_QUESTION:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Đề thi này được cấu hình ở dạng FIXED_QUESTION, không thể thiết lập luật bốc pool ngẫu nhiên."
        )

    # 🆕 Validate: quantity không được vượt quá tổng số câu hỏi thực tế đang có trong pool
    for rule in obj_in:
        total = crud_question_pool.count_questions(db, rule.pool_id)
        if rule.quantity > total:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Pool {rule.pool_id} chỉ có {total} câu hỏi, không đủ để bốc {rule.quantity} câu."
            )

    crud_quiz_pool_rule.add_rules_to_quiz(db, quiz_id=quiz_id, rules_in=obj_in)
    db.commit()
    
    return {"status": "success", "message": "Đã thiết lập cấu hình luật bốc câu hỏi từ ngân hàng câu hỏi"}

# 🆕 Cập nhật số lượng câu hỏi bốc ngẫu nhiên của 1 rule
@router.patch("/{quiz_id}/pool-rules/{rule_id}")
async def update_pool_rule(
    db: SessionDep,
    quiz_id: UUID,
    rule_id: UUID,
    obj_in: QuizPoolRuleUpdate,
    current_user: dict = Depends(get_current_user_role)
):
    await _get_quiz_or_404_and_check_owner(db, quiz_id, current_user)

    rule = crud_quiz_pool_rule.get_by_id_and_quiz(db, rule_id, quiz_id)
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy luật cấu hình này trong đề thi.")

    total = crud_question_pool.count_questions(db, rule.pool_id)
    if obj_in.quantity > total:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Pool này chỉ có {total} câu hỏi, không đủ để bốc {obj_in.quantity} câu."
        )

    updated = crud_quiz_pool_rule.update(db, db_obj=rule, obj_in=obj_in)
    return {"status": "success", "data": {"rule_id": updated.rule_id, "quantity": updated.quantity}}

# 🆕 Xóa 1 luật bốc pool khỏi đề thi
@router.delete("/{quiz_id}/pool-rules/{rule_id}")
async def delete_pool_rule(
    db: SessionDep,
    quiz_id: UUID,
    rule_id: UUID,
    current_user: dict = Depends(get_current_user_role)
):
    await _get_quiz_or_404_and_check_owner(db, quiz_id, current_user)

    rule = crud_quiz_pool_rule.get_by_id_and_quiz(db, rule_id, quiz_id)
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy luật cấu hình này trong đề thi.")

    crud_quiz_pool_rule.delete(db, id=rule_id)
    return {"status": "success", "message": "Đã xóa luật cấu hình pool khỏi đề thi."}

@router.get("/get-total-quizzes/{subject_id}")
def get_total_quizzes(
    db: SessionDep,
    subject_id: UUID
):
    return crud_quiz.get_total_quiz_by_subject(db, subject_id)

@router.get("/get-quizzes-list/{subject_id}", response_model=list[QuizItem])
async def get_quizzes_list(
    db: SessionDep,
    subject_id: UUID,
    search: str | None = Query(None, description="Từ khóa tìm kiếm theo tiêu đề bài thi"),
    current_user: dict = Depends(get_current_user_role)
):
    owner_id = await get_owner(subject_id)
    if UUID(current_user["user_id"]) != owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xem danh sách bài thi của môn học này"
        )  

    result = crud_quiz.get_multi_by_subject(db, subject_id, search=search)
    return result
