from fastapi import APIRouter, HTTPException, Depends, status, Query
from uuid import UUID
from typing import List, Optional
from app.api.v1.deps import SessionDep
from app.core.security import RoleChecker, get_current_user_role
from app.schemas.enums import SubjectStatus
from app.models.subject import Subject
from app.schemas.subject import SubjectCreate, SubjectUpdate, SubjectRead, InstructorStatictisSubject, GeneralInfoInstructorSubject, SubjectInfoWithQuestions, SubjectInfoWithQuizzes
from app.crud.subject import crud_subject
from app.crud.module import crud_module
from app.crud.syllabus import crud_syllabus
from app.crud.course import crud_course
import asyncio
import httpx
from app.core.config import settings


router = APIRouter(prefix="/subjects", tags=["subjects"])

QUIZ_EXAM_URL = settings.BACKEND_QUIZ_EXAM_URL

@router.get("/instructor-general-info", response_model=List[GeneralInfoInstructorSubject])
def get_subject_general_info_instructor(
    db: SessionDep,
    search: Optional[str] = Query(None, description="Từ khóa tìm kiếm tên hoặc mô tả môn học"), 
    current_user: dict = Depends(get_current_user_role)
):
    instructor_id = current_user["user_id"]

    if current_user["role_name"] != "Instructor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không phải là giảng viên"
        )

    subjects = crud_subject.get_instructor_subject_list(db, instructor_id, search=search)
    
    response_data = []
    for subject in subjects:
        subject_dict = subject.model_dump() 
        subject_dict["total_modules"] = crud_module.get_total_module_by_subject(db, subject.subject_id)
        subject_dict["total_lessons"] = crud_subject.get_total_lessons(db, subject.subject_id)
        
        response_data.append(subject_dict)
        
    return response_data

@router.get("/instructor-subjects-questions", response_model=List[SubjectInfoWithQuestions])
async def get_instructor_subjects_with_questions(
    db: SessionDep,
    search: Optional[str] = Query(None, description="Từ khóa tìm kiếm tên hoặc mô tả môn học"), 
    current_user: dict = Depends(get_current_user_role)
):
    instructor_id = current_user["user_id"]

    if current_user["role_name"] != "Instructor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không phải là giảng viên"
        )

    # Lấy danh sách môn học của giảng viên
    subjects = crud_subject.get_instructor_subject_list(db, instructor_id, search=search)
    
    response_data = []
    
    # Sử dụng Asynchronous client để không block luồng khi gọi HTTP
    async with httpx.AsyncClient() as client:
        for subject in subjects:
            subject_dict = subject.model_dump() 
            
            # Chỉ lấy total_modules, bỏ qua total_lessons
            subject_dict["total_modules"] = crud_module.get_total_module_by_subject(db, subject.subject_id)
            
            # Gọi API sang service khác để lấy total_questions
            try:
                # Gọi tới endpoint lấy tổng số câu hỏi từ Question Service
                quiz_service_endpoint = f"{QUIZ_EXAM_URL}/questions/total-lessons/{subject.subject_id}"
                
                # Gọi HTTP GET
                response = await client.get(quiz_service_endpoint)
                
                if response.status_code == 200:
                    # Gán dữ liệu trả về
                    subject_dict["total_questions"] = response.json() 
                else:
                    subject_dict["total_questions"] = 0
            except httpx.RequestError:
                # Xử lý an toàn nếu service Question không phản hồi
                subject_dict["total_questions"] = 0
            
            response_data.append(subject_dict)
        
    return response_data

@router.get("/instructor-subjects-quizzes", response_model=List[SubjectInfoWithQuizzes])
async def get_instructor_subjects_with_quizzes(
    db: SessionDep,
    search: Optional[str] = Query(None, description="Từ khóa tìm kiếm tên hoặc mô tả môn học"), 
    current_user: dict = Depends(get_current_user_role)
):
    instructor_id = current_user["user_id"]

    if current_user["role_name"] != "Instructor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không phải là giảng viên"
        )

    # Lấy danh sách môn học của giảng viên
    subjects = crud_subject.get_instructor_subject_list(db, instructor_id, search=search)
    
    response_data = []
    
    # Sử dụng Asynchronous client để không block luồng khi gọi HTTP
    async with httpx.AsyncClient() as client:
        for subject in subjects:
            subject_dict = subject.model_dump() 
            
            
            # Gọi API sang service khác để lấy total_questions
            try:
                # Gọi tới endpoint lấy tổng số câu hỏi từ Question Service
                quiz_service_endpoint = f"{QUIZ_EXAM_URL}/quizzes/get-total-quizzes/{subject.subject_id}"
                
                # Gọi HTTP GET
                response = await client.get(quiz_service_endpoint)
                
                if response.status_code == 200:
                    # Gán dữ liệu trả về
                    subject_dict["total_quizzes"] = response.json() 
                else:
                    subject_dict["total_quizzes"] = 0
            except httpx.RequestError:
                # Xử lý an toàn nếu service Question không phản hồi
                subject_dict["total_quizzes"] = 0
            
            response_data.append(subject_dict)
        
    return response_data

@router.get("/collaborator-subjects-quizzes", response_model=List[SubjectInfoWithQuizzes])
async def get_collaborator_subjects_with_quizzes(
    db: SessionDep,
    search: Optional[str] = Query(None, description="Từ khóa tìm kiếm tên hoặc mô tả môn học"), 
    current_user: dict = Depends(RoleChecker(["Tester"]))
):
    collaborator_id = UUID(current_user["user_id"])

    # Lấy danh sách các môn học mà cộng tác viên này được phân công
    subjects = crud_subject.get_collaborator_subject_list(
        db=db, 
        collaborator_id=collaborator_id, 
        search=search
    )
    
    response_data = []
    
    # Gọi Asynchronous HTTP client lấy thông tin total_quizzes từ Quiz Service
    async with httpx.AsyncClient() as client:
        for subject in subjects:
            subject_dict = subject.model_dump() 
            
            try:
                # Endpoint lấy tổng số bài thi thuộc môn học
                quiz_service_endpoint = f"{QUIZ_EXAM_URL}/quizzes/get-total-quizzes/{subject.subject_id}"
                
                response = await client.get(quiz_service_endpoint, timeout=5.0)
                
                if response.status_code == 200:
                    subject_dict["total_quizzes"] = response.json() 
                else:
                    subject_dict["total_quizzes"] = 0
            except httpx.RequestError:
                # Xử lý dự phòng nếu Quiz Service gặp lỗi/kết nối không thành công
                subject_dict["total_quizzes"] = 0
            
            response_data.append(subject_dict)
        
    return response_data
   
# 🟢 Tạo Subject (Manager)
@router.post("/", response_model=SubjectRead)
def create_subject(
    db: SessionDep,
    subject_in: SubjectCreate,
    current_user: dict = Depends(RoleChecker(["Manager"]))
):
    course = crud_course.get_by_id(db, subject_in.course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy khóa học với ID: {subject_in.course_id}"
        )

    subject_dict = subject_in.model_dump()

    # 🟢 Khởi tạo db_subject đúng cú pháp Python
    db_subject = Subject(
        course_id=subject_in.course_id,
        title=subject_dict["title"],
        description=subject_dict["description"],
        order_index=subject_dict["order_index"],
        status_id=SubjectStatus.SUBJECT_DEVELOPING.value
    )

    return crud_subject.create(db, db_subject)

# 🔵 Lấy Subject theo ID (mọi role đều có thể xem)
@router.get("/{subject_id}", response_model=SubjectRead)
def get_subject(
    db: SessionDep,
    subject_id: UUID,
    current_user: dict = Depends(RoleChecker(["Instructor", "Student", "Manager"]))
):
    subject = crud_subject.get_by_id(db, subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject

# 🟡 Lấy danh sách Subject (Admin, Instructor)
@router.get("/", response_model=list[SubjectRead])
def get_subjects(
    db: SessionDep,
    skip: int = 0,
    limit: int = 10,
    current_user: dict = Depends(RoleChecker(["Manager"]))
):
    return crud_subject.get_multi(db, skip=skip, limit=limit)

# 🟠 Cập nhật Subject (Admin, Instructor)
@router.put("/{subject_id}", response_model=SubjectRead)
def update_subject(
    db: SessionDep,
    subject_id: UUID,
    subject_in: SubjectUpdate,
    current_user: dict = Depends(RoleChecker(["Admin", "Instructor", "Manager"]))
):
    db_obj = crud_subject.get_by_id(db, subject_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Subject not found")
    return crud_subject.update(db, db_obj, subject_in)

# 🔴 Xóa Subject (Manager)
@router.delete("/{subject_id}")
def delete_subject(
    db: SessionDep,
    subject_id: UUID,
    current_user: dict = Depends(RoleChecker(["Manager"]))
):
    existing_modules = crud_module.get_by_subject(db, subject_id)  # cần có hàm này trong crud_module
    if existing_modules:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể xóa môn học vì còn {len(existing_modules)} chương/module liên quan. Vui lòng xóa các module trước."
        )

    db_obj = crud_subject.delete(db, subject_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Subject not found")
    return {"msg": "Subject deleted successfully"}


@router.get("/instructor/statistic", response_model=InstructorStatictisSubject)
def instructor_statistic(
    db: SessionDep,
    current_user: dict = Depends(get_current_user_role)
):
    if current_user["role_name"] != "Instructor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không phải là giảng viên"
        )
        
    instructor_id = current_user["user_id"]
    total_subjects = crud_subject.total_subject_by_instructor(db, instructor_id)
    total_active_subject = crud_subject.get_total_instructor_subject_by_status(db, instructor_id, SubjectStatus.SUBJECT_ACTIVE)
    total_developing_subject = crud_subject.get_total_instructor_subject_by_status(db, instructor_id, SubjectStatus.SUBJECT_DEVELOPING)
    total_modules = crud_module.get_total_module_by_instructor(db, instructor_id)

    statictis = InstructorStatictisSubject(
        total_subjects=total_subjects,
        total_modules=total_modules,
        total_active_subject=total_active_subject,
        total_developing_subject=total_developing_subject
    )
    return statictis

@router.get("/course/{course_id}", response_model=List[SubjectRead])
def get_subjects_by_course(
    course_id: UUID,
    db: SessionDep,
    current_user: dict = Depends(RoleChecker(["Manager", "Instructor", "Student"]))
):
    return crud_subject.get_by_course(db, course_id=course_id)

@router.get("/get-owner/{subject_id}", response_model=UUID)
def get_subject_owner(
    db: SessionDep,
    subject_id: UUID
):
    return crud_subject.get_owner(db, subject_id)


@router.get("/admin/instructor/{instructor_id}", response_model=List[GeneralInfoInstructorSubject])
def get_subject_general_info_by_instructor_admin(
    db: SessionDep,
    instructor_id: UUID,
    search: Optional[str] = Query(None, description="Từ khóa tìm kiếm tên hoặc mô tả môn học"),
    current_user: dict = Depends(RoleChecker(["Admin"]))
):
    """
    API dành cho ADMIN: lấy danh sách môn học được phân công cho
    MỘT giảng viên bất kỳ, dựa theo instructor_id truyền vào path
    (không phải người đang đăng nhập).
    """
    subjects = crud_subject.get_instructor_subject_list(db, instructor_id, search=search)
 
    response_data = []
    for subject in subjects:
        subject_dict = subject.model_dump()
        subject_dict["total_modules"] = crud_module.get_total_module_by_subject(db, subject.subject_id)
        subject_dict["total_lessons"] = crud_subject.get_total_lessons(db, subject.subject_id)
        response_data.append(subject_dict)
 
    return response_data

