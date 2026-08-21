from app.crud.base import CRUDBase
from app.models.course import Course
from app.models.lesson import Lesson
from app.models.subject import Subject
from app.models.module import Module
from app.models.course_tag_link import CourseTagLink
from app.schemas.enums import CourseType, CourseStatus
from typing import Optional, List, Tuple
from app.schemas.course import GeneralCourseInfo
from app.schemas.course import CourseCreate, CourseUpdate, LessonOrderInfo
from uuid import UUID
from sqlmodel import Session, select, func, or_
from sqlalchemy.orm import selectinload

class CRUDCourse(CRUDBase[Course, CourseCreate, CourseUpdate, UUID]):
    def get_by_instructor(self, db: Session, instructor_id: UUID) -> list[Course]:
        statement = select(Course).where(Course.instructor_id == instructor_id)
        return db.exec(statement).all()

    def get_by_status(self, db: Session, status_id: str) -> list[Course]:
        statement = select(Course).where(Course.status_id == status_id)
        return db.exec(statement).all()
    
    def exists(self, db: Session, course_id: UUID) -> bool:
        statement = select(Course.course_id).where(Course.course_id == course_id)
        result = db.exec(statement).first()
        return result is not None
    
    def get_title_by_id(self, db: Session, course_id: UUID) -> str:
        statement = select(Course.title).where(
            Course.course_id == course_id
        )
        return db.exec(statement).first()
    
    def get_total_lessons(self, db: Session, course_id: UUID) -> int:
        statement = select(Course.total_lessons).where(
            Course.course_id == course_id
        )
        return db.exec(statement).first()
    
    def get_lesson_ids_by_course(self, db: Session, course_id: UUID) -> list[LessonOrderInfo]:
        """
        Lấy danh sách thông tin bài học sắp xếp theo lộ trình tuyến tính:
        Subject.order_index ASC -> Module.order_index ASC -> Lesson.order_index ASC
        """
        statement = (
            select(
                Lesson.lesson_id, 
                Lesson.is_optional, 
                Lesson.is_quiz, 
                Lesson.duration_seconds,
                Subject.subject_id  # Lấy thêm subject_id để phân biệt các môn học
            )
            .join(Module, Lesson.module_id == Module.module_id)
            .join(Subject, Module.subject_id == Subject.subject_id)
            .where(Subject.course_id == course_id)
            .order_by(
                Subject.order_index.asc(),
                Module.order_index.asc(),
                Lesson.order_index.asc()
            )
        )
        
        results = db.exec(statement).all()
        
        seen_subjects = set()
        lesson_list = []

        for r in results:
            lesson_id, is_optional, is_quiz, duration_seconds, subject_id = r
            
            # Nếu subject_id chưa xuất hiện -> đây là lesson đầu tiên của subject này
            is_first = subject_id not in seen_subjects
            if is_first:
                seen_subjects.add(subject_id)

            lesson_list.append(
                LessonOrderInfo(
                    lesson_id=lesson_id,
                    is_optional=is_optional,
                    is_quiz=is_quiz,
                    duration_seconds=duration_seconds,
                    first_subject_lesson=is_first
                )
            )
            
        return lesson_list
    def get_course_name(self, db: Session, course_id: UUID) -> str:
        statement = select(Course.title).where(
            Course.course_id == course_id
        )
        return db.exec(statement).first()
    def search_courses(
        self,
        db: Session,
        q: Optional[str] = None,
        tag_id: Optional[UUID] = None,
        course_type: Optional[CourseType] = None,
        max_price: Optional[int] = None,
        page: int = 1,
        size: int = 10,
    ) -> Tuple[List[GeneralCourseInfo], int]:
        """
        Tìm kiếm khóa học theo nhiều tiêu chí & phân trang.
        Trả về Tuple: (Danh sách khóa học đã format, Tổng số kết quả)
        """
        # 1. Câu truy vấn cơ sở
        statement = select(Course).options(selectinload(Course.tags))
        
        # 2. Xây dựng danh sách điều kiện lọc (Filters)
        filters = []

        # Lọc theo Từ khóa (Tìm kiếm trong tiêu đề hoặc mô tả)
        if q:
            search_pattern = f"%{q.strip()}%"
            filters.append(
                or_(
                    Course.title.ilike(search_pattern),
                    Course.description.ilike(search_pattern)
                )
            )

        # Lọc theo Tag ID
        if tag_id:
            statement = statement.join(
                CourseTagLink, Course.course_id == CourseTagLink.course_id
            )
            filters.append(CourseTagLink.tag_id == tag_id)

        # Lọc theo Loại khóa học (Ngắn hạn / Dài hạn)
        if course_type:
            filters.append(Course.course_type == course_type)

        # Lọc theo Giá tối đa
        if max_price is not None:
            filters.append(Course.price <= max_price)

        # Áp dụng các điều kiện lọc nếu có
        if filters:
            statement = statement.where(*filters)

        # 3. Đếm tổng số kết quả phù hợp (Trục đếm Total)
        count_statement = select(func.count()).select_from(statement.subquery())
        total = db.exec(count_statement).one()

        # 4. Áp dụng Phân trang (Pagination)
        offset = (page - 1) * size
        statement = statement.offset(offset).limit(size)

        # 5. Thực thi Query & Map kết quả
        courses = db.exec(statement).all()

        items = [
            GeneralCourseInfo(
                course_id=course.course_id,
                title=course.title,
                description=course.description,
                price=course.price,
                course_type=course.course_type,
                tags=[tag.tag_name for tag in course.tags]
            )
            for course in courses
        ]

        return items, total
    def get_by_ids(self, db: Session, course_ids: List[UUID]) -> List[Course]:
        if not course_ids:
            return []
            
        statement = (
            select(Course)
            .where(
                Course.course_id.in_(course_ids),
                Course.status_id == CourseStatus.COURSE_ONGOING
            )
            # Eager load mối quan hệ tags để tránh N+1 Query
            .options(selectinload(Course.tags))
        )
        return db.exec(statement).all()

    def get_featured_fallback(self, db: Session, limit: int = 5) -> List[Course]:
        statement = (
            select(Course)
            .where(Course.status_id == CourseStatus.COURSE_ONGOING)
            .options(selectinload(Course.tags))
            .limit(limit)
        )
        return db.exec(statement).all()

    def get_featured_fallback_exclude(self, db: Session, exclude_ids: List[UUID], limit: int = 5) -> List[Course]:
        statement = (
            select(Course)
            .where(
                Course.status_id == CourseStatus.COURSE_ONGOING,
                Course.course_id.not_in(exclude_ids)
            )
            .options(selectinload(Course.tags))
            .limit(limit)
        )
        return db.exec(statement).all()
    
    def get_course_with_preview_data(self, db: Session, course_id: UUID) -> Optional[Course]:
        """
        Lấy thông tin Course cùng với Subjects, Syllabus (chứa instructor_id), 
        Modules và Tags bằng eager loading.
        """
        statement = (
            select(Course)
            .where(Course.course_id == course_id)
            .options(
                selectinload(Course.subjects).options(
                    selectinload(Subject.modules),
                    selectinload(Subject.syllabus)  # Eager load Syllabus để lấy instructor_id
                ),
                selectinload(Course.tags)
            )
        )
        return db.exec(statement).first()
    def get_learning_structure(self, db: Session, course_id: UUID) -> Optional[Course]:
        """
        Truy vấn cây cấu trúc học tập của Khóa học (Course -> Subject -> Module -> Lesson).
        Tối ưu hóa bằng Eager Loading (selectinload) để tránh N+1 Query Problem.
        Lưu ý: Các danh sách quan hệ con sẽ tự động được sắp xếp nếu ở Models đã định nghĩa order_by trong Relationship.
        """
        statement = (
            select(Course)
            .where(Course.course_id == course_id)
            .options(
                selectinload(Course.subjects)
                .selectinload(Subject.modules)  
                .selectinload(Module.lessons)
            )
        )
        return db.exec(statement).first()


    def get_by_instructor_id(self, db: Session, instructor_id: UUID, skip: int = 0, limit: int = 100):
        return (
            db.query(Course)
            .filter(Course.instructor_id == instructor_id)
            .offset(skip)
            .limit(limit)
            .all()
    )



    def update_status(
        self,
        db: Session,
        course_id: UUID,
        status_id: CourseStatus,
    ):
        course = self.get_by_id(db, course_id)

        if course is None:
            return None

        course.status_id = status_id
        db.add(course)
        db.commit()
        db.refresh(course)

        return course

crud_course = CRUDCourse(Course)
