import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.api.v1.deps import SessionDep
from app.core.security import RoleChecker, get_current_user_role
from app.schemas.lesson import LessonCreate, LessonUpdate, LessonManagementOut, LessonFilterType, LessonShortResponse
from app.models.lesson import Lesson
from typing import List, Optional
from app.crud.lesson import crud_lesson
from app.crud.module import crud_module
from app.crud.subject import crud_subject
from app.crud.presentation import crud_presentation_slide
from uuid import UUID
from app.core.config import settings
import asyncio
import httpx


QUIZ_SERVICE_BASE_URL = settings.BACKEND_QUIZ_EXAM_URL

async def filter_lessons_without_quiz(lesson_ids: List[UUID]) -> List[UUID]:
    """
    Gửi request kiểm tra song song sang Quiz Service.
    Trả về danh sách lesson_ids CHƯA ĐƯỢC GẮN QUIZ.
    """
    if not lesson_ids:
        return []

    async with httpx.AsyncClient(timeout=5.0) as client:
        # Hàm con gọi API từng lesson
        async def check_single_lesson(lesson_id: UUID) -> tuple[UUID, bool]:
            try:
                response = await client.get(f"{QUIZ_SERVICE_BASE_URL}/quizzes/{lesson_id}/had-quiz")
                if response.status_code == 200:
                    # Trả về (lesson_id, True/False)
                    return lesson_id, response.json()
            except Exception as e:
                # Ném log lỗi nếu không kết nối được Quiz Service
                print(f"Error checking quiz for lesson {lesson_id}: {str(e)}")
            
            # Nếu gặp lỗi API, mặc định coi như chưa có quiz (hoặc xử lý theo nghiệp vụ)
            return lesson_id, False

        # Chạy tất cả các request song song cùng lúc
        tasks = [check_single_lesson(lid) for lid in lesson_ids]
        results = await asyncio.gather(*tasks)

        # Lọc ra danh sách lesson_id có response là False (chưa có quiz)
        lessons_without_quiz = [
            lesson_id for lesson_id, had_quiz in results if not had_quiz
        ]
        
        return lessons_without_quiz

router = APIRouter(prefix="/lessons", tags=["lessons"])

# Phải khớp với BASE_STORAGE_DIR khai báo trong app/api/v1/endpoints/lesson_resource.py
LESSON_RESOURCES_DIR = Path("documents/lesson_resources")

@router.post("/", response_model=Lesson, status_code=status.HTTP_201_CREATED)
def create_lesson(
    db: SessionDep,
    new_lesson: LessonCreate,
    current_user: dict = Depends(get_current_user_role)
):
    """
    API tạo bài học mới.
    - Tự động tăng `total_lessons` của Course liên quan lên +1.
    - Quyền truy cập: Admin hoặc Giảng viên sở hữu khóa học đó.
    """
    # 1. Nếu người dùng là Giảng viên (không phải Admin), cần kiểm tra quyền sở hữu khóa học
    course_instructor = crud_module.get_course_owner(db, new_lesson.module_id)
    if course_instructor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module không tồn tại hoặc chương trình học chưa được gán giảng viên"
        )
        
    if str(current_user["user_id"]) != str(course_instructor):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không phải là giảng viên được phân công môn học chứa module này"
        )

    # 2. Gọi tầng CRUD đã override để thêm Lesson và kích hoạt +1 total_lessons
    return crud_lesson.create(db, obj_in=new_lesson)


@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson(
    db: SessionDep,
    lesson_id: UUID,
    current_user: dict = Depends(get_current_user_role)
):
    """
    API xóa bài học theo ID.
    - Tự động giảm `total_lessons` của Course liên quan đi -1.
    - Dọn luôn thư mục tài nguyên (file) đính kèm bài học trên đĩa.
    - Quyền truy cập: Admin hoặc Giảng viên sở hữu khóa học đó.
    """
    # 1. Kiểm tra xem bài học có tồn tại hay không trước khi xét quyền
    lesson = crud_lesson.get_by_id(db, id=lesson_id) # Dùng get_by_id từ CRUDBase của bạn
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bài học không tồn tại"
        )

    # 2. Nếu là Giảng viên, kiểm tra xem họ có quyền quản lý bài học này không
    course_instructor = crud_module.get_course_owner(db, lesson.module_id)
        
    if str(current_user["user_id"]) != str(course_instructor):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xóa bài học thuộc khóa học này"
        )

    # 3. Gọi tầng CRUD đã override để xóa Lesson và kích hoạt -1 total_lessons
    # (Việc xóa các bản ghi LessonResource trong DB nên được cấu hình cascade ở model/DB;
    #  nếu chưa có cascade, cần xóa thủ công các bản ghi LessonResource liên quan trước bước này)
    crud_lesson.delete(db, id=lesson_id)

    # 4. Dọn thư mục file vật lý documents/lesson_resources/{lesson_id} (nếu có)
    lesson_dir = LESSON_RESOURCES_DIR / str(lesson_id)
    if lesson_dir.exists():
        shutil.rmtree(lesson_dir, ignore_errors=True)
    
    # 204 NO CONTENT không trả về dữ liệu ở Body
    return None

@router.put("/{lesson_id}", response_model=Lesson)
def update_lesson(
    db: SessionDep,
    lesson_id: UUID,
    lesson_in: LessonUpdate,
    current_user: dict = Depends(get_current_user_role)
):
    """
    API cập nhật thông tin bài học.
    - Tự động sắp xếp lại `order_index` (khi kéo thả / đổi thứ tự).
    - Hỗ trợ đổi bài học sang Module khác (nếu schema hỗ trợ module_id).
    - Quyền truy cập: Admin/Manager hoặc Giảng viên sở hữu khóa học chứa bài học này.
    - Lưu ý: LessonUpdate không có field `is_quiz` -> không thể đổi 1 bài học đã tạo
      thành/khỏi trạng thái "bài thi" qua API này (đúng theo nghiệp vụ yêu cầu).
    """
    # 1. Kiểm tra bài học có tồn tại hay không
    lesson = crud_lesson.get_by_id(db, id=lesson_id)
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bài học không tồn tại"
        )

    # 2. Kiểm tra quyền sở hữu đối với Giảng viên
    # Kiểm tra quyền trên Module hiện tại
    current_owner = crud_module.get_course_owner(db, lesson.module_id)
    if current_owner is None or str(current_user["user_id"]) != str(current_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền chỉnh sửa bài học thuộc khóa học này"
        )

    # Nếu người dùng muốn chuyển Lesson sang Module mới, kiểm tra quyền trên Module mới
    new_module_id = getattr(lesson_in, "module_id", None)
    if new_module_id and new_module_id != lesson.module_id:
        new_owner = crud_module.get_course_owner(db, new_module_id)
        if new_owner is None or str(current_user["user_id"]) != str(new_owner):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền chuyển bài học sang Module thuộc sở hữu của giảng viên khác"
            )

    # 3. Gọi tầng CRUD đã xử lý logic tự động reorder & cập nhật database
    return crud_lesson.update(db, db_obj=lesson, obj_in=lesson_in)

@router.get("/get-lesson-list/{module_id}", response_model=list[LessonManagementOut])
def get_lesson_list(
    db: SessionDep,
    module_id: UUID,
    current_user: dict = Depends(get_current_user_role)
):
    """
    Lấy danh sách bài học của 1 module, kèm theo danh sách tài nguyên (resources) đính kèm mỗi bài.
    Dùng cho trang Quản lý bài học của Giảng viên.
    """
    user_id = UUID(current_user["user_id"])
    if not crud_module.get_by_id(db, module_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module không tồn tại"
        )
    if crud_module.get_course_owner(db, module_id) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền lấy danh sách bài học của module"
        )
    lessons = crud_lesson.get_multi_by_module(db, module_id)
    return lessons

@router.get(
    "/subject/{subject_id}",
    response_model=List[LessonShortResponse],
    status_code=status.HTTP_200_OK,
    summary="Lấy danh sách Lesson trong Subject (đã loại bỏ bài có Quiz)"
)
async def get_lessons_by_subject(
    db: SessionDep,
    subject_id: UUID,
    filter_type: Optional[LessonFilterType] = Query(
        default=None,
        description="Bộ lọc bài học: 'IN_VIDEO', 'STANDALONE_LESSON', 'INSIDE_LESSON'."
    )
):
    # 1. Lấy danh sách lesson từ DB theo bộ lọc cơ bản
    lessons = crud_lesson.get_lessons_by_subject(
        db=db,
        subject_id=subject_id,
        filter_type=filter_type
    )

    if not lessons:
        return []

    # 2. Trích xuất danh sách lesson_id
    lesson_ids = [lesson.lesson_id for lesson in lessons]

    # 3. Call API Quiz Service để lấy danh sách các lesson_id CHƯA GẮN QUIZ
    valid_lesson_ids = await filter_lessons_without_quiz(lesson_ids)

    # 4. Filter lại danh sách lesson ban đầu
    valid_lessons = [
        lesson for lesson in lessons if lesson.lesson_id in valid_lesson_ids
    ]

    return valid_lessons

@router.get("/get-content/{lesson_id}")
def get_body_content(
    db: SessionDep,
    lesson_id: UUID,
    current_user: dict = Depends(RoleChecker(["Instructor"]))
):
    content = ''
    lesson = crud_lesson.get_by_id(db, lesson_id)
    if lesson is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bài học"
        )
    if lesson.is_slide_presentation:
        slides = crud_presentation_slide.get_by_slide_content_by_lesson(db, lesson_id)
        for slide in slides:
            content += "\n" + slide
    else:
        content = crud_lesson.get_content_body(db, lesson_id)
    subject_id = crud_lesson.get_subject_id_lesson(db, lesson_id)
    return {
        "content_body": content,
        "subject_id": subject_id
    }
    

@router.get("/is-existed/{lesson_id}")
def is_existed(
    db: SessionDep,
    lesson_id: UUID
):
    return crud_lesson.get_by_id(db, lesson_id) is not None

@router.get("/lesson-list/{subject_id}", response_model=List[LessonShortResponse])
def get_lesson_list_by_subject(
    db: SessionDep,
    subject_id: UUID,
    current_user: dict = Depends(RoleChecker(["Instructor"]))
):
    subject = crud_subject.get_by_id(db, subject_id)
    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Môn học không tồn tại"
        )
    lessons = crud_lesson.get_multi_by_subject(db, subject_id)
    return lessons