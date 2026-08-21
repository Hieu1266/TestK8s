import re
import traceback
from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from bs4 import BeautifulSoup
from underthesea import pos_tag, sent_tokenize
from app.api.v1.deps import SessionDep
from app.api.v1.routers.quiz import get_owner
from app.crud.question import crud_question
from app.crud.question_option import crud_question_option
from app.crud.quiz import crud_quiz
from app.core.security import get_current_user_role, call_check_instructor_service, RoleChecker, oauth2_scheme
from app.core.config import settings
import random
from app.schemas.question import QuestionCreate, QuestionType, QuestionItem, QuestionUpdate, GenerateFillInBlankConfig
from app.schemas.question_option import QuestionOptionCreate, QuestionOptionAutoCreate
from app.models.question import Question
from app.models.question_option import QuestionOption
from app.models.rubric_criteria import RubricCriteria
import httpx

router = APIRouter(prefix="/questions", tags=["questions"])


@router.get("/get-list/{subject_id}", response_model=List[QuestionItem])
def get_questions_list(
    db: SessionDep,
    subject_id: UUID,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = UUID(current_user["user_id"])
    
    is_instructor = call_check_instructor_service(instructor_id=user_id, subject_id=subject_id)
    if not is_instructor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không phải giảng viên phụ trách môn học này để xem ngân hàng câu hỏi."
        )

    questions = crud_question.get_multi_by_subject_id(db, subject_id=subject_id)
    return questions



@router.post("/")
def create_question(
    db: SessionDep,
    question: QuestionCreate,
    question_opts: Optional[List[QuestionOptionAutoCreate]] = None,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = current_user["user_id"]
    subject_id = question.subject_id
    is_instructor = call_check_instructor_service(instructor_id=user_id, subject_id=subject_id)
    
    if not is_instructor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không phải giảng viên phụ trách môn học này để tạo câu hỏi."
        )
        
    try:
        # 1. Tạo câu hỏi trong DB
        ques = crud_question.create(db, question)
        question_id = ques.question_id
        
        # 2. Tạo danh sách các lựa chọn (Options - Trắc nghiệm)
        if question_opts:
            for opt_in in question_opts:
                new_opt = QuestionOptionCreate(
                    question_id=question_id,
                    option_text=opt_in.option_text,
                    is_correct=opt_in.is_correct
                )
                crud_question_option.create(db, new_opt)

        # 3. Lưu tiêu chí Rubrics (ĐÃ SỬA CHUẨN TÊN TRƯỜNG percentage)
        if question.rubrics:
            for rub in question.rubrics:
                # Bóc tách percentage/percent an toàn
                pct_val = getattr(rub, "percentage", None)
                if pct_val is None:
                    pct_val = getattr(rub, "percent", 0.0)

                db_rubric = RubricCriteria(
                    question_id=question_id,
                    title=rub.title,
                    description=rub.description or "",
                    percentage=float(pct_val if pct_val is not None else 0.0)  # ✅ ĐÃ SỬA: percentage
                )
                db.add(db_rubric)

            db.commit()

        return {
            "status": "success",
            "message": "Tạo câu hỏi thành công!",
            "question_id": ques.question_id
        }
    except Exception as e:
        db.rollback()
        print(f"❌ [CREATE ERROR]:\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tạo câu hỏi: {str(e)}"
        )


@router.patch("/{question_id}")
def update_question(
    db: SessionDep,
    question_id: UUID,
    question: QuestionUpdate = Body(..., embed=True),
    current_user: dict = Depends(get_current_user_role)
):
    print(f"\n🔹 [UPDATE QUESTION] Received request for Question ID: {question_id}")
    print(f"🔹 Payload parsed: {question.model_dump()}")

    db_question = crud_question.get_by_id(db, question_id)
    if not db_question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy câu hỏi yêu cầu."
        )
        
    user_id = current_user["user_id"]
    subject_id = db_question.subject_id 
    
    is_instructor = call_check_instructor_service(instructor_id=user_id, subject_id=subject_id)
    if not is_instructor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không phải giảng viên phụ trách môn học này để chỉnh sửa câu hỏi."
        )
    
    try:
        update_dict = question.model_dump(exclude_unset=True, exclude={"rubrics"})
        for field, value in update_dict.items():
            setattr(db_question, field, value)
        
        db.add(db_question) # Lưu thay đổi vào session
        
        # 2. Cập nhật lại danh sách Rubrics (ĐÃ SỬA CHUẨN TÊN TRƯỜNG percentage)
        if question.rubrics is not None:
            del_count = db.query(RubricCriteria).filter(RubricCriteria.question_id == question_id).delete()
            print(f"   -> Deleted {del_count} old rubrics")
            
            for rub in question.rubrics:
                pct_val = getattr(rub, "percentage", None)
                if pct_val is None:
                    pct_val = getattr(rub, "percent", 0.0)

                db_rubric = RubricCriteria(
                    question_id=question_id,
                    title=rub.title,
                    description=rub.description or "",
                    percentage=float(pct_val if pct_val is not None else 0.0) 
                )
                db.add(db_rubric)
            
        db.commit() 

        print("✅ [UPDATE QUESTION SUCCESS]")
        return {
            "status": "success",
            "message": "Update thành công câu hỏi!"
        }
    except Exception as e:
        db.rollback()
        print(f"❌ [UPDATE ERROR]:\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi hệ thống khi cập nhật câu hỏi: {str(e)}"
        )


@router.delete("/{question_id}")
def delete_question(
    db: SessionDep,
    question_id: UUID,
    current_user: dict = Depends(get_current_user_role)
):
    print(f"\n🔻 [DELETE QUESTION] Request to delete Question ID: {question_id}")
    
    db_question = crud_question.get_by_id(db, question_id)
    if not db_question:
        print("  ❌ Question ID not found in database.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy câu hỏi để xóa."
        )

    user_id = current_user["user_id"]
    is_instructor = call_check_instructor_service(instructor_id=user_id, subject_id=db_question.subject_id)
    if not is_instructor:
        print("  ❌ Permission denied: User is not instructor.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xóa câu hỏi này."
        )

    try:
        del_rubrics = db.query(RubricCriteria).filter(RubricCriteria.question_id == question_id).delete(synchronize_session=False)
        del_options = db.query(QuestionOption).filter(QuestionOption.question_id == question_id).delete(synchronize_session=False)
        del_question = db.query(Question).filter(Question.question_id == question_id).delete(synchronize_session=False)
        db.commit()
        print(f"✅ [DELETE SUCCESS] Deleted {del_question} question, {del_rubrics} rubrics, {del_options} options.")
        return {
            "status": "success",
            "message": "Xóa câu hỏi thành công!"
        }
    except Exception as e:
        db.rollback()
        print(f"❌ [DELETE ERROR TRACEBACK]:\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi xóa câu hỏi: {str(e)}"
        )


@router.get("/total-lessons/{subject_id}")
def total_lessons_in_subject(
    db: SessionDep,
    subject_id: UUID
):
    return crud_question.total_questions_in_subject(db, subject_id)


NOUN_STOPWORDS = {
    "sự", "việc", "loại", "cái", "chiếc", "cuộc", "người", "khi",
    "mức", "tính", "ngày", "tháng", "năm", "khoảng","khái niệm", 
    "phần", "bản", "dạng", "kết quả", "bước", "điều", "thứ", 
    "tập", "khối", "trang", "số", "chiếu", "bên", "đám", 
}

def clean_and_extract_sentences(html_content: str) -> list[str]:
    """
    Làm sạch HTML, loại bỏ hoàn toàn các thẻ tiêu đề (h1-h6),
    xóa bullet points, &nbsp; và tách thành các câu hoàn chỉnh.
    """
    soup = BeautifulSoup(html_content, "html.parser")
    
    # 1. Xóa các thẻ tiêu đề
    for heading in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
        heading.decompose()

    text = soup.get_text(separator="\n")

    # 2. Làm sạch ký tự rác
    text = text.replace("\xa0", " ")
    text = re.sub(r"[·•\-\*]", "", text)
    
    cleaned_sentences = []
    
    # 3. CHỈ tách câu theo xuống dòng (\n) và dấu kết thúc câu (. ! ?), KHÔNG tách theo dấu ':'
    raw_lines = re.split(r'[\n.!?]+', text)
    
    for line in raw_lines:
        line = re.sub(r"\s+", " ", line).strip()
        
        # 4. LỌC BỎ câu kết thúc bằng dấu ':' (câu dẫn liệt kê)
        if line.endswith(':'):
            continue
            
        # 5. Chỉ nhận câu có đủ độ dài (từ 6 từ trở lên)
        if len(line.split()) >= 6:
            cleaned_sentences.append(line)
            
    return cleaned_sentences


def generate_fill_in_blank_questions(
    db: SessionDep,
    text: str, 
    subject_id: UUID, 
    num_questions: int = 5, 
    max_points: float = 1.0
) -> list[Question]:
    
    # 1. TRUY VẤN DB: Lấy danh sách các câu đã có sẵn trong CSDL
    existing_contents = crud_question.get_existing_fill_in_blank(db, subject_id)

    # 2. Trích xuất các câu sạch từ văn bản
    sentences = clean_and_extract_sentences(text)
    candidate_questions: list[Question] = []

    # 3. Tạo danh sách ứng viên câu hỏi
    for sentence in sentences:
        tokens = pos_tag(sentence)
        candidate_words = [
            word for word, tag in tokens 
            if tag.startswith('N') and len(word) >= 2 and word.isalnum()
            and word.lower() not in NOUN_STOPWORDS
        ]

        if not candidate_words:
            continue

        for target_word in set(candidate_words):
            pattern = re.compile(re.escape(target_word), re.IGNORECASE)
            blanked_sentence, count = pattern.subn("_____", sentence, count=1)

            if count == 0:
                continue

            if blanked_sentence in existing_contents:
                continue

            question = Question(
                subject_id=subject_id,
                question_title="Điền từ còn thiếu vào chỗ trống",
                question_type=QuestionType.FILL_IN_BLANK,
                body_content=blanked_sentence,
                max_points=max_points,
                options=[
                    QuestionOption(
                        option_text=target_word,
                        is_correct=True
                    )
                ]
            )
            candidate_questions.append(question)

    if not candidate_questions:
        return []

    # 4. Trộn ngẫu nhiên danh sách câu hỏi hợp lệ (không trùng DB)
    random.shuffle(candidate_questions)

    # 5. Lấy đủ số lượng yêu cầu (num_questions)
    selected_questions = candidate_questions[:num_questions]

    return selected_questions

COURSE_SERVICE_URL = settings.BACKEND_COURSE_URL

@router.post(
    "/generate-from-lesson/{lesson_id}", 
    response_model=List[QuestionItem], 
    status_code=status.HTTP_201_CREATED
)
async def generate_questions_from_lesson(
    lesson_id: UUID,
    payload: GenerateFillInBlankConfig,
    db: SessionDep,
    token: str = Depends(oauth2_scheme),  # Lấy token trực tiếp từ Depends
    current_user: dict = Depends(RoleChecker(["Instructor", "Admin"]))
):
    headers = {"Authorization": f"Bearer {token}"}

    # --- Bước 1: Gọi Course Service lấy nội dung bài học ---
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(
                f"{COURSE_SERVICE_URL}/lessons/get-content/{lesson_id}",
                headers=headers
            )
            
            if response.status_code == status.HTTP_404_NOT_FOUND:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Không tìm thấy bài học ở Course Service"
                )
            
            response.raise_for_status()
            course_data = response.json()  # Dict: {"content_body": ..., "subject_id": ...}
            
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Không thể kết nối tới Course Service: {str(exc)}"
            )

    body_content = course_data.get("content_body")
    subject_id_raw = course_data.get("subject_id")

    if not body_content or not str(body_content).strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bài học không có nội dung văn bản để sinh câu hỏi"
        )
        
    if not subject_id_raw:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Course Service không trả về subject_id"
        )

    subject_id = UUID(str(subject_id_raw))

    # --- Bước 2: Kiểm tra quyền sở hữu của Giảng viên ---
    user_role = current_user.get("role_name")
    instructor_id = UUID(str(current_user["user_id"]))

    if user_role != "Admin":
        owner_id = await get_owner(subject_id=subject_id)
        
        if owner_id != instructor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền tạo câu hỏi cho môn học/bài học này"
            )

    # --- Bước 3: Sinh câu hỏi điền khuyết ---
    generated_questions = generate_fill_in_blank_questions(
        db=db,  
        text=body_content,
        subject_id=subject_id,
        num_questions=payload.num_questions,
        max_points=payload.max_points
    )

    if not generated_questions:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Tất cả các câu hỏi tạo từ bài học này đã tồn tại trong CSDL hoặc không đủ điều kiện!"
        )

    # --- Bước 4: Lưu vào CSDL ---
    for question in generated_questions:
        db.add(question)
    
    db.commit()

    for question in generated_questions:
        db.refresh(question)

    return generated_questions