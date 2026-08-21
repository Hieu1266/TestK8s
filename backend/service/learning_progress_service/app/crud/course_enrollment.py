from app.crud.base import CRUDBase
from uuid import UUID
from typing import Dict, List, Any
from sqlmodel import Session, select, func
from app.models.course_enrollment import CourseEnrollment
from app.models.certificate import Certificate
from app.schemas.certificate import CertificateCreate
from app.schemas.course_enrollment import CourseEnrollmentCreate, CourseEnrollmentUpdate
from app.crud.certificate import crud_certificate
from datetime import datetime, timezone
import httpx
from app.core.config import settings
from app.models.lesson_progress import LessonProgress

class CRUDCourseEnrollment(CRUDBase[CourseEnrollment, CourseEnrollmentCreate, CourseEnrollmentUpdate, UUID]):
    # Kiểm tra người dùng đã đăng ký khóa học chưa
    def check_already_enrolled(self, db: Session, user_id: UUID, course_id: UUID) -> bool:
        statement = select(CourseEnrollment).where(
            CourseEnrollment.user_id == user_id,
            CourseEnrollment.course_id == course_id
        )
        result = db.exec(statement).first()
        return result is not None
    
    def get_by_user_and_course(self, db: Session, user_id: UUID, course_id: UUID) -> CourseEnrollment | None:
        # Ép kiểu UUID an toàn để tránh truy vấn trả về None do sai kiểu dữ liệu
        if isinstance(user_id, str):
            user_id = UUID(user_id)
        if isinstance(course_id, str):
            course_id = UUID(course_id)

        statement = select(CourseEnrollment).where(
            CourseEnrollment.user_id == user_id, 
            CourseEnrollment.course_id == course_id
        )
        return db.exec(statement).first()
    
    def get_multi_by_user_id(self, db: Session, user_id: UUID):
        statement = select(CourseEnrollment).where(
            CourseEnrollment.user_id== user_id
        )
        return db.exec(statement).all()
    def get_by_user_in_progress(self, db: Session, user_id: UUID) -> list[CourseEnrollment]:
        statement = select(CourseEnrollment.course_id).where(
            CourseEnrollment.user_id == user_id,
            CourseEnrollment.is_completed == False
        )
        return db.exec(statement).all()
    
    def get_by_user_completed(self, db: Session, user_id: UUID) -> list[CourseEnrollment]:
        statement = select(CourseEnrollment.course_id).where(
            CourseEnrollment.user_id == user_id,
            CourseEnrollment.is_completed == True,
            CourseEnrollment.current_overall_progress == 100
        )
        return db.exec(statement).all()
    
    def get_overrall_progress(self, db: Session, user_id: UUID, course_id: UUID) -> float:
        statement = select(CourseEnrollment.current_overall_progress).where(
            CourseEnrollment.user_id == user_id,
            CourseEnrollment.course_id == course_id
        )
        return db.exec(statement).first()
    
    def get_overrall_progress_by_enroll(self, db: Session, enrollment_id: UUID) -> float:
        statement = select(CourseEnrollment.current_overall_progress).where(
            CourseEnrollment.enrollment_id == enrollment_id
        )
        return db.exec(statement).first()
    
    def get_course_id(self, db: Session, enrollment_id: UUID) -> UUID:
        statement = select(CourseEnrollment.course_id).where(
            CourseEnrollment.enrollment_id == enrollment_id
        )
        return db.exec(statement).first()

    def get_history_by_user(self, db: Session, user_id: UUID, is_completed: bool):
        statement = select(CourseEnrollment).where(
            CourseEnrollment.user_id == user_id,
            CourseEnrollment.is_completed == is_completed
        )
        return db.exec(statement).all()
    
    def update_progress(self, db: Session, db_obj: CourseEnrollment, progress: float) -> CourseEnrollment:
        db_obj.current_overall_progress = min(max(progress, 0.0), 100.0) # Đảm bảo tiến độ từ 0 - 100
        
        if db_obj.current_overall_progress >= 100.0 and not db_obj.is_completed:
            db_obj.is_completed = True
            db_obj.completed_at = datetime.now(timezone.utc)
            
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def update_overall_progress(
        self, db: Session, db_obj: CourseEnrollment, progress: float, is_completed: bool
    ) -> CourseEnrollment:
        # 1. Cập nhật tiến độ học tập và cờ hoàn thành
        db_obj.current_overall_progress = min(max(progress, 0.0), 100.0)
        db_obj.is_completed = is_completed
        
        # Nếu đạt 100% hoặc cờ hoàn thành bật, cập nhật thời gian hoàn thành
        if is_completed or db_obj.current_overall_progress >= 100.0:
            db_obj.is_completed = True
            if not db_obj.completed_at:
                db_obj.completed_at = datetime.now(timezone.utc)

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        
        # 2. Tự động cấp chứng chỉ nếu đã hoàn thành khóa học
        if db_obj.is_completed:
            try:
                from app.crud.certificate import crud_certificate 
                from app.schemas.certificate import CertificateCreate 
                
                enrollment_id = db_obj.enrollment_id 
                user_id = db_obj.user_id
                course_id = db_obj.course_id

                existing_cert = crud_certificate.get_by_enrollment_id(db, enrollment_id=enrollment_id)
                
                if not existing_cert:
                    full_name = "Thành viên hệ thống"
                    course_name = "Khóa học trực tuyến"

                    with httpx.Client(timeout=5.0) as client:
                        # Lấy tên người dùng
                        try:
                            user_api_url = f"{settings.BACKEND_USER_URL.rstrip('/')}/get-name/{user_id}"
                            user_response = client.get(user_api_url)
                            if user_response.status_code == 200:
                                res_json = user_response.json()
                                full_name = res_json if isinstance(res_json, str) else res_json.get("name", full_name)
                        except Exception as e_user:
                            print(f"[CẢNH BÁO] Không lấy được tên user: {str(e_user)}")

                        # Lấy tên khóa học
                        try:
                            course_api_url = f"{settings.BACKEND_COURSE_URL.rstrip('/')}/courses/title/{course_id}"
                            course_response = client.get(course_api_url)
                            if course_response.status_code == 200:
                                res_json = course_response.json()
                                course_name = res_json if isinstance(res_json, str) else res_json.get("course_title", course_name)
                        except Exception as e_course:
                            print(f"[CẢNH BÁO] Không lấy được tên khóa học: {str(e_course)}")

                    # Lưu chứng chỉ mới
                    new_cert_data = CertificateCreate(
                        enrollment_id=enrollment_id,
                        user_id=user_id,
                        full_name=full_name,
                        course_name=course_name
                    )
                    crud_certificate.create(db, new_cert_data)
                    print(f"--- Tự động cấp chứng chỉ thành công cho User {user_id} ---")
                    
            except Exception as e:
                print(f"Lỗi hệ thống khi tự động cấp chứng chỉ: {str(e)}")

        return db_obj
    def get_general_statistics(self, db: Session, user_id: UUID) -> dict:
        """
        Tính toán các thông số thống kê khóa học và chứng chỉ của user
        """
        # 1. Đếm số khóa học đang học (is_completed = False)
        inprogress_stmt = (
            select(func.count(CourseEnrollment.enrollment_id))
            .where(CourseEnrollment.user_id == user_id)
            .where(CourseEnrollment.is_completed == False)
        )
        inprogress_courses = db.exec(inprogress_stmt).one()

        # 2. Đếm số khóa học đã hoàn thành (is_completed = True)
        completed_stmt = (
            select(func.count(CourseEnrollment.enrollment_id))
            .where(CourseEnrollment.user_id == user_id)
            .where(CourseEnrollment.is_completed == True)
        )
        completed_courses = db.exec(completed_stmt).one()

        # 3. Đếm số lượng chứng chỉ mà user đang sở hữu thông qua quan hệ Join 1-1
        certificate_stmt = (
            select(func.count(Certificate.certificate_id))
            .join(CourseEnrollment, CourseEnrollment.enrollment_id == Certificate.enrollment_id)
            .where(CourseEnrollment.user_id == user_id)
        )
        
        try:
            certificate_count = db.exec(certificate_stmt).one()
        except Exception:
            # Dự phòng nếu DB của bạn chưa đồng nhất cấu trúc, lấy tạm số lượng đã hoàn thành làm số chứng chỉ
            certificate_count = completed_courses

        return {
            "inprogress_courses": inprogress_courses,
            "completed_courses": completed_courses,
            "certificate": certificate_count
        }

    def get_top_5_course_ids(self, db: Session) -> List[Dict[str, Any]]:
        # Query gom nhóm theo course_id và đếm số lượng enrollment
        statement = (
            select(
                CourseEnrollment.course_id,
                func.count(CourseEnrollment.enrollment_id).label("enrollment_count")
            )
            .group_by(CourseEnrollment.course_id)
            .order_by(func.count(CourseEnrollment.enrollment_id).desc())
            .limit(5)
        )
        
        results = db.exec(statement).all()
        
        # Trả về danh sách dict dạng [{"course_id": UUID, "enrollment_count": int}]
        return [
            {"course_id": str(row.course_id), "enrollment_count": row.enrollment_count}
            for row in results
        ]

    def get_users_in_progress(self, db: Session, course_id: UUID) -> int:
        statement = select(func.count(CourseEnrollment.enrollment_id)).where(
            CourseEnrollment.course_id == course_id,
            CourseEnrollment.is_completed == False
        )
        return db.exec(statement).first() or 0

    def update_testing_status(self, db: Session, db_obj: CourseEnrollment, status: str) -> CourseEnrollment:
        db_obj.testing_course_status = status
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    
    def check_enrolled_by_lesson(self, db: Session, user_id: UUID, lesson_id: UUID) -> bool:
        # 1. Tìm course_id tương ứng với lesson này, qua bản ghi lesson_progress của chính user đó
        statement = select(LessonProgress.course_id).where(
            LessonProgress.user_id == user_id,
            LessonProgress.lesson_id == lesson_id,
        )
        course_id = db.exec(statement).first()
        if not course_id:
            return False

        # 2. Kiểm tra user có enrollment hợp lệ cho course_id đó không
        return self.get_by_user_and_course(db, user_id=user_id, course_id=course_id) is not None

    
crud_course_enrollment = CRUDCourseEnrollment(CourseEnrollment)