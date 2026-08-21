from uuid import UUID
from fastapi import APIRouter, HTTPException, status
from app.api.v1.deps import SessionDep
from app.models.course_instructor_link import CourseInstructorLink
from app.models.course import Course
from pydantic import BaseModel
from sqlmodel import select  # Đảm bảo có select nếu bạn dùng SQLModel để truy vấn db.exec()

# Schema nhận dữ liệu từ Frontend gửi lên
class CourseInstructorLinkCreate(BaseModel):
    course_id: UUID
    instructor_id: UUID

router = APIRouter(prefix="/assignment", tags=["assignment"])

# --- 1. API GÁN MỚI GIẢNG VIÊN ---
@router.post("/course-instructor-link")
def upload_assignment(*, db: SessionDep, link_in: CourseInstructorLinkCreate):
    try:
        statement = select(CourseInstructorLink).where(
            CourseInstructorLink.course_id == link_in.course_id,
            CourseInstructorLink.instructor_id == link_in.instructor_id
        )
        existing_link = db.exec(statement).first()
        if existing_link:
            return {"success": True, "message": "Giảng viên đã được gán từ trước, hệ thống ghi nhận thành công!"}

        db_obj = CourseInstructorLink(
            course_id=link_in.course_id,
            instructor_id=link_in.instructor_id
        )
        db.add(db_obj)
        
        course = db.get(Course, link_in.course_id)
        if course:
            course.instructor_id = link_in.instructor_id 
            db.add(course)
            db.commit() 
            db.refresh(course)

        db.commit()
        return {"success": True, "message": "Phân công giảng viên thành công!"}
        
    except Exception as e:
        db.rollback()
        print("❌ LỖI HỆ THỐNG:", str(e))
        raise HTTPException(status_code=500, detail="Lỗi xử lý cơ sở dữ liệu")


# --- 2. API CẬP NHẬT / THAY ĐỔI GIẢNG VIÊN (ĐÃ SỬA LỖI) ---
@router.put("/course-instructor-link")
def update_course_assignment(*, db: SessionDep, link_in: CourseInstructorLinkCreate):
    try:
        # Bước 1: Tìm và cập nhật bảng liên kết trung gian (CourseInstructorLink)
        statement = select(CourseInstructorLink).where(
            CourseInstructorLink.course_id == link_in.course_id
        )
        existing_link = db.exec(statement).first()
        
        if existing_link:
            # Nếu đã tồn tại bản ghi phân công trước đó, thực hiện đổi giảng viên mới
            existing_link.instructor_id = link_in.instructor_id
            db.add(existing_link)
        else:
            # Nếu chưa có bản ghi trung gian (đề phòng dữ liệu cũ bị lệch), tạo mới luôn
            new_link = CourseInstructorLink(
                course_id=link_in.course_id,
                instructor_id=link_in.instructor_id
            )
            db.add(new_link)

        # Bước 2: Cập nhật trường instructor_id trực tiếp trong bảng Course
        course = db.get(Course, link_in.course_id)
        if not course:
            raise HTTPException(status_code=404, detail="Không tìm thấy khóa học này")
            
        course.instructor_id = link_in.instructor_id
        db.add(course)
        
        # Lưu thay đổi vào Database
        db.commit()
        
        return {"success": True, "message": "Cập nhật và thay đổi giảng viên thành công!"}
        
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        db.rollback()
        print("❌ LỖI HỆ THỐNG UPDATE:", str(e))
        raise HTTPException(status_code=500, detail="Lỗi xử lý cơ sở dữ liệu")