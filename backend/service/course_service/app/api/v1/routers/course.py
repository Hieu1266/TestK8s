from uuid import UUID
import math
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status, Query
from typing import Optional, Any, Dict, List
from app.api.v1.deps import SessionDep
from app.schemas.course import CourseSearchPaginatedResponse
from app.schemas.enums import CourseType
from app.core.security import RoleChecker, get_current_user_role, oauth2_scheme
from app.crud.course import crud_course
from app.crud.course_media import crud_course_media
from app.schemas.subject import SubjectPreview
from app.schemas.module import ModulePreview
from app.schemas.lesson import LessonLearningStructure
from app.schemas.course import CourseCreate, CourseImageUploadResponse, CourseRead, CourseUpdate, CourseLessonsResponse, CoursePreview, CourseLearningStructure, LessonOrderInfo
from app.core.config import settings
import httpx
import asyncio


from app.schemas.course import CourseStatusUpdate
from app.schemas.enums import CourseStatus


router = APIRouter(prefix="/courses", tags=["courses"])

PROGRESS_SERVICE_URL = settings.BACKEND_LEARNING_PROGRESS_URL
USER_SERVICE_BASE_URL = settings.BACKEND_USER_URL

def format_course_response(course_obj: Any, enrollment_count: int = 0) -> Dict[str, Any]:
    """Helper format dữ liệu khóa học chuẩn định dạng cho Frontend Landing Page"""
    
    # Xử lý an toàn cho mảng tags
    tags_list = []
    if hasattr(course_obj, "tags") and course_obj.tags:
        tags_list = [
            tag.tag_name if hasattr(tag, "tag_name") else str(tag)
            for tag in course_obj.tags
        ]

    # Kiểm tra loại khóa học Dài hạn / Ngắn hạn
    course_type_str = str(getattr(course_obj, "course_type", "")).upper()
    is_long_term = (
        getattr(course_obj, "is_long_term", False)
        or "LONG" in course_type_str
    )

    return {
        "course_id": str(course_obj.course_id),
        "title": course_obj.title,
        "description": course_obj.description or "",
        "price": course_obj.price or 0,
        "course_type": course_obj.course_type,
        "is_long_term": is_long_term,
        "enrollment_count": enrollment_count,
        "tags": tags_list,
    }

def fetch_user_name_by_id(user_id: UUID) -> Optional[str]:
    """
    Hàm trợ lý gọi API sang User Service để lấy tên người dùng theo user_id.
    Target endpoint: GET /get-name/{user_id}
    """
    url = f"{USER_SERVICE_BASE_URL}/get-name/{user_id}"
    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.get(url)
            if response.status_code == 200:
                return response.json()  
            return None
    except httpx.RequestError as exc:
        print(f"Lỗi khi kết nối tới User Service: {exc}")
        return None

@router.get("/preview/{course_id}", response_model=CoursePreview)
def get_course_preview(
    db: SessionDep,
    course_id: UUID
):
    # 1. Query Course kèm Subjects, Syllabus, Modules, Tags
    course = crud_course.get_course_with_preview_data(db, course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    instructor_list: list[str] = []
    course_structure: list[SubjectPreview] = []

    # 2. Duyệt qua từng môn học
    for subject in course.subjects:
        modules_preview = [
            ModulePreview(title=mod.title) 
            for mod in subject.modules
        ]
        
        subject_instructor_name: Optional[str] = None
        
        # Lấy instructor_id từ Syllabus của subject (nếu có)
        if subject.syllabus and subject.syllabus.instructor_id:
            subject_instructor_name = fetch_user_name_by_id(subject.syllabus.instructor_id)
            
            # Thêm tên giảng viên vào danh sách tổng của khóa học (tránh trùng lặp)
            if subject_instructor_name and subject_instructor_name not in instructor_list:
                instructor_list.append(subject_instructor_name)

        course_structure.append(
            SubjectPreview(
                title=subject.title,
                instructor_name=subject_instructor_name,
                modules_preview=modules_preview
            )
        )

    # 3. Lấy danh sách tên Tag
    tag_list = [tag.tag_name for tag in course.tags]

    # 4. Trả về thông tin CoursePreview
    return CoursePreview(
        title=course.title,
        instructor_list=instructor_list,
        course_structure=course_structure,
        tag_list=tag_list
    )

@router.get("/featured")
async def get_featured_courses(db: SessionDep):
    top_enrolled: List[Dict[str, Any]] = []

    # 1. Gọi API nội bộ sang Progress/Enrollment Service
    async with httpx.AsyncClient(timeout=3.0) as client:
        try:
            url = f"{PROGRESS_SERVICE_URL}/course_enrollment/internal/top-enrolled-courses"
            response = await client.get(url)
            if response.status_code == 200:
                top_enrolled = response.json().get("data", [])
        except Exception as e:
            print(f"[WARNING] Cannot reach Enrollment Service: {e}")

    # Map lưu lượt đăng ký theo course_id
    enrollment_map = {item["course_id"]: item["enrollment_count"] for item in top_enrolled}
    course_ids = [UUID(cid) for cid in enrollment_map.keys() if cid]

    # 2. Lấy danh sách Course thực sự tồn tại trong DB theo IDs
    db_courses = crud_course.get_by_ids(db, course_ids=course_ids)
    courses_dict = {str(c.course_id): c for c in db_courses}

    result = []
    
    # 3. Ghép đúng khóa học tìm được với enrollment_count tương ứng
    for item in top_enrolled:
        cid = item["course_id"]
        if cid in courses_dict:
            c = courses_dict[cid]
            result.append(format_course_response(c, item["enrollment_count"]))

    # 4. BỔ SUNG FALLBACK: Nếu tìm không đủ 5 khóa học (do ID lệch giữa 2 DB hoặc chưa có nhiều đăng ký)
    if len(result) < 5:
        existing_ids = {UUID(c["course_id"]) for c in result}
        
        # Lấy thêm các khóa học chưa có trong result để bù cho đủ 5
        additional_courses = crud_course.get_featured_fallback_exclude(
            db, exclude_ids=list(existing_ids), limit=5 - len(result)
        )
        for c in additional_courses:
            result.append(format_course_response(c, 0))

    return {"success": True, "data": result}

@router.get(
    "/search",
    response_model=CourseSearchPaginatedResponse,
    status_code=status.HTTP_200_OK,
    summary="Tìm kiếm & Lọc danh sách khóa học"
)
def search_courses(
    db: SessionDep,
    q: Optional[str] = Query(None, description="Từ khóa tìm kiếm (Tiêu đề hoặc Mô tả)"),
    tag_id: Optional[UUID] = Query(None, description="Lọc theo ID của Tag"),
    course_type: Optional[CourseType] = Query(None, description="Lọc theo Loại khóa học"),
    max_price: Optional[int] = Query(None, ge=0, description="Lọc khóa học có giá nhỏ hơn hoặc bằng"),
    page: int = Query(1, ge=1, description="Trang hiện tại (Mặc định: 1)"),
    size: int = Query(10, ge=1, le=100, description="Số lượng mục trên 1 trang (Mặc định: 10)"),
):
    items, total = crud_course.search_courses(
        db=db,
        q=q,
        tag_id=tag_id,
        course_type=course_type,
        max_price=max_price,
        page=page,
        size=size
    )

    total_pages = math.ceil(total / size) if total > 0 else 0

    return CourseSearchPaginatedResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        total_pages=total_pages
    )

@router.post("/", response_model=CourseRead)
def create_course(
    db: SessionDep,
    course_in: CourseCreate,
    current_user: dict = Depends(RoleChecker(["Admin", "Instructor", "Manager"]))
):
    course_data = course_in.model_dump()
    course_data["instructor_id"] = current_user["user_id"]
    return crud_course.create(db, obj_in=course_data)

@router.get("/{course_id}", response_model=CourseRead)
def get_course(
    db: SessionDep,
    course_id: UUID,
    current_user: dict = Depends(RoleChecker(["Admin", "Instructor", "Student", "Manager"]))
):
    course = crud_course.get_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.get("/", response_model=list[CourseRead])
def get_courses(
    db: SessionDep,
    current_user: dict = Depends(get_current_user_role)
):
    return crud_course.get_multi(
        db,
        skip=0,
        limit=None
    )

@router.put("/{course_id}", response_model=CourseRead)
def update_course(
    db: SessionDep,
    course_id: UUID,
    course_in: CourseUpdate,
    current_user: dict = Depends(RoleChecker(["Admin", "Instructor", "Manager"]))
):
    db_obj = crud_course.get_by_id(db, course_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Course not found")
    return crud_course.update(db, db_obj, course_in)


@router.delete("/{course_id}")
def delete_course(
    db: SessionDep,
    course_id: UUID,
    current_user: dict = Depends(RoleChecker(["Manager"]))
):
    db_obj = crud_course.delete(db, course_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Course not found")
    return {"msg": "Course deleted successfully"}


@router.get("/title/{course_id}", response_model=str)
def get_course_title(
    db: SessionDep,
    course_id: UUID
):
    if crud_course.exists(db, course_id): 
        return crud_course.get_title_by_id(db, course_id)
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khóa học không tồn tại"
        )


@router.get("/is-existed-course/{course_id}")
def check_existed_course(
    db: SessionDep,
    course_id: UUID
):
    return crud_course.exists(db, course_id)


@router.post("/course-image", response_model=CourseImageUploadResponse)
def upload_file_only(
    file: UploadFile = File(...), 
    current_user: dict = Depends(RoleChecker(["Admin", "Instructor", "Manager"]))
):
    url = crud_course_media.upload_image(file)
    return {"image_url": url}

# LẤY DANH SÁCH LESSON IDS THEO COURSE ID (Dùng khi học viên ấn Enroll khóa học)
@router.get("/{course_id}/lessons", response_model=CourseLessonsResponse)
def get_course_lessons(
    db: SessionDep, 
    course_id: UUID,
):
    """
    Trả về danh sách toàn bộ lesson_id của một khóa học, sắp xếp theo order_index.
    """
    # Kiểm tra xem khóa học có tồn tại hay không bằng hàm exists trong CRUD
    if not crud_course.exists(db, course_id=course_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khóa học không tồn tại trên hệ thống."
        )
        
    lessons_data = crud_course.get_lesson_ids_by_course(db, course_id=course_id)
    return CourseLessonsResponse(course_id=course_id, lessons=lessons_data)

@router.get("/{course_id}/total-lessons", response_model=int)
def get_course_total_lessons(db: SessionDep, course_id: UUID):
    """
    Endpoint trả về tổng số bài học (int) của một khóa học.
    """
    if not crud_course.exists(db, course_id=course_id):
        raise HTTPException(status_code=404, detail="Khóa học không tồn tại.")
    return crud_course.get_total_lessons(db, course_id=course_id)

LEARNING_PROGRESS_SERVICE = settings.BACKEND_LEARNING_PROGRESS_URL
EXAM_QUIZ_SERVICE = settings.BACKEND_QUIZ_EXAM_URL

@router.get("/get-learning-course/{course_id}", response_model=CourseLearningStructure)
async def get_learning_course(
    course_id: UUID,
    db: SessionDep,
    current_user: dict = Depends(get_current_user_role),
    token: str = Depends(oauth2_scheme) 
):
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Kiểm tra thông tin đăng ký (Enrollment Check)
        try:
            response = await client.get(
                f"{LEARNING_PROGRESS_SERVICE}/course_enrollment/is-enrolled/{course_id}",
                headers=headers,
                timeout=5.0
            )
            
            if response.status_code == 401:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Xác thực không thành công tại Enrollment Service (Token không hợp lệ hoặc hết hạn)"
                )
            elif response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Không thể xác thực thông tin đăng ký từ Enrollment Service"
                )
                
            is_enrolled = response.json()

        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Lỗi kết nối tới Enrollment Service: {exc}"
            )

        # 2. Nếu chưa đăng ký -> Từ chối quyền truy cập
        if not is_enrolled:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn chưa đăng ký khóa học này. Vui lòng đăng ký để truy cập bài học."
            )

        # 3. Truy vấn cây cấu trúc bài học từ Database
        course_orm = crud_course.get_learning_structure(db=db, course_id=course_id)
        
        if not course_orm:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Không tìm thấy khóa học"
            )

        # 4. Ép kiểu ORM Model thành Pydantic Schema
        course_data = CourseLearningStructure.model_validate(course_orm, from_attributes=True)

        # 5. Phân loại bài học
        # 5.1. Bài học là Quiz -> Cần lấy submit_status
        quiz_lessons = [
            lesson
            for subject in course_data.subjects
            for module in subject.modules
            for lesson in module.lessons
            if lesson.is_quiz is True
        ]

        # 5.2. Bài học KHÔNG PHẢI là Quiz -> Cần kiểm tra had_quiz
        non_quiz_lessons = [
            lesson
            for subject in course_data.subjects
            for module in subject.modules
            for lesson in module.lessons
            if lesson.is_quiz is False
        ]

        # 6. Các hàm gọi API bất đồng bộ
        async def fetch_lesson_status(lesson: LessonLearningStructure):
            try:
                res = await client.get(
                    f"{EXAM_QUIZ_SERVICE}/quiz-submissions/get-quiz-status/{lesson.lesson_id}",
                    headers=headers,
                    timeout=5.0
                )
                if res.status_code == 200:
                    data = res.json()
                    lesson.submit_status = data.get("submit_status")
                    lesson.is_peer_review = data.get("is_peer_review")
                else:
                    lesson.submit_status = None
                    lesson.is_peer_review = False
            except httpx.RequestError:
                lesson.submit_status = None
                lesson.is_peer_review = False


        async def fetch_lesson_had_quiz(lesson: LessonLearningStructure):
            try:
                res = await client.get(
                    f"{EXAM_QUIZ_SERVICE}/quizzes/{lesson.lesson_id}/had-quiz",
                    headers=headers,
                    timeout=5.0
                )
                if res.status_code == 200:
                    lesson.had_quiz = res.json()
                    
                    # Nếu bài học thường có đính kèm Quiz -> Lấy tiếp status & peer review
                    if lesson.had_quiz:
                        await fetch_lesson_status(lesson)
                else:
                    lesson.had_quiz = False
            except httpx.RequestError:
                lesson.had_quiz = False
        # 7. Gom tất cả request và gọi song song (Concurrent Async Calls)
        tasks = []
        if quiz_lessons:
            tasks.extend(fetch_lesson_status(lesson) for lesson in quiz_lessons)
        if non_quiz_lessons:
            tasks.extend(fetch_lesson_had_quiz(lesson) for lesson in non_quiz_lessons)

        if tasks:
            await asyncio.gather(*tasks)

        return course_data






@router.patch("/{course_id}/approve")
def approve_course(
    db: SessionDep,
    course_id: UUID,
    current_user: dict = Depends(
        RoleChecker(["Manager"])
    ),
):
    course = crud_course.get_by_id(db, course_id)

    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khóa học không tồn tại",
        )

    if course.status_id != CourseStatus.COURSE_DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ có thể duyệt khóa học đang ở trạng thái 'Đang tạo khóa học'",
        )

    updated_course = crud_course.update_status(
        db,
        course_id,
        CourseStatus.COURSE_REGISTRATION,
    )

    return {
        "status": "success",
        "message": f"Đã duyệt khóa học '{updated_course.title}', chuyển sang trạng thái Đang mở đăng ký",
    }













@router.get("/instructor/{instructor_id}", response_model=list[CourseRead])
def get_courses_by_instructor(
    db: SessionDep,
    instructor_id: UUID,
    current_user: dict = Depends(RoleChecker(["Admin", "Instructor"]))
):

    return crud_course.get_by_instructor_id(db, instructor_id=instructor_id)
 
