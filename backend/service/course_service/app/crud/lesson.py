from typing import Optional, Union, Dict, Any
from uuid import UUID
from sqlmodel import Session, select, func, or_
from app.crud.base import CRUDBase
from app.models.lesson import Lesson
from app.models.module import Module
from app.models.subject import Subject
from app.models.course import Course
from app.schemas.lesson import LessonCreate, LessonUpdate, LessonFilterType
from typing import List


class CRUDLesson(CRUDBase[Lesson, LessonCreate, LessonUpdate, UUID]):

    def create(self, db: Session, obj_in: LessonCreate) -> Lesson:
        db_obj = self.model.model_validate(obj_in)

        # 1. Logic nghiệp vụ Quiz
        if db_obj.is_quiz:
            db_obj.is_optional = False
            db_obj.is_slide_presentation = False

        # 2. Xử lý order_index khi thêm mới
        max_order = db.scalar(
            select(func.max(Lesson.order_index))
            .where(Lesson.module_id == db_obj.module_id)
        ) or 0

        # Nếu không chọn vị trí hoặc vị trí truyền vào lớn hơn max + 1 => Xếp vào cuối
        if not db_obj.order_index or db_obj.order_index > max_order + 1:
            db_obj.order_index = max_order + 1
        else:
            # Nếu chèn vào giữa, đẩy các bài học đứng phía sau lên +1 vị trí
            existing_lessons = db.exec(
                select(Lesson)
                .where(Lesson.module_id == db_obj.module_id)
                .where(Lesson.order_index >= db_obj.order_index)
            ).all()
            for lesson in existing_lessons:
                lesson.order_index += 1
                db.add(lesson)

        db.add(db_obj)
        db.flush()

        # 3. Tăng total_lessons của Course tương ứng lên 1
        course_id = db.scalar(
            select(Subject.course_id)
            .join(Module, Subject.subject_id == Module.subject_id)
            .where(Module.module_id == db_obj.module_id)
        )

        if course_id:
            course = db.get(Course, course_id)
            if course:
                course.total_lessons += 1
                db.add(course)

        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self,
        db: Session,
        *,
        db_obj: Lesson,
        obj_in: Union[LessonUpdate, Dict[str, Any]]
    ) -> Lesson:
        old_module_id = db_obj.module_id
        old_order_index = db_obj.order_index

        # Parse dữ liệu đầu vào
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)

        # Cập nhật giá trị vào object
        for field in update_data:
            setattr(db_obj, field, update_data[field])

        # Logic nghiệp vụ Quiz
        if db_obj.is_quiz:
            db_obj.is_optional = False
            db_obj.is_slide_presentation = False

        new_module_id = db_obj.module_id
        new_order_index = db_obj.order_index

        # TRƯỜNG HỢP 1: Di chuyển Lesson sang Module khác
        if old_module_id != new_module_id:
            # 1.1 Dồn các bài ở Module cũ lên để dọn chỗ trống
            old_module_lessons = db.exec(
                select(Lesson)
                .where(Lesson.module_id == old_module_id)
                .where(Lesson.order_index > old_order_index)
            ).all()
            for lesson in old_module_lessons:
                lesson.order_index -= 1
                db.add(lesson)

            # 1.2 Đẩy các bài ở Module mới ra sau để lấy chỗ chèn
            max_new_order = db.scalar(
                select(func.max(Lesson.order_index))
                .where(Lesson.module_id == new_module_id)
            ) or 0

            if not new_order_index or new_order_index > max_new_order + 1:
                db_obj.order_index = max_new_order + 1
            else:
                new_module_lessons = db.exec(
                    select(Lesson)
                    .where(Lesson.module_id == new_module_id)
                    .where(Lesson.order_index >= new_order_index)
                ).all()
                for lesson in new_module_lessons:
                    lesson.order_index += 1
                    db.add(lesson)

            # 1.3 Cập nhật total_lessons nếu Module mới thuộc về Khóa học (Course) khác
            old_course_id = db.scalar(
                select(Subject.course_id)
                .join(Module, Subject.subject_id == Module.subject_id)
                .where(Module.module_id == old_module_id)
            )
            new_course_id = db.scalar(
                select(Subject.course_id)
                .join(Module, Subject.subject_id == Module.subject_id)
                .where(Module.module_id == new_module_id)
            )

            if old_course_id != new_course_id:
                if old_course_id:
                    old_course = db.get(Course, old_course_id)
                    if old_course and old_course.total_lessons > 0:
                        old_course.total_lessons -= 1
                        db.add(old_course)
                if new_course_id:
                    new_course = db.get(Course, new_course_id)
                    if new_course:
                        new_course.total_lessons += 1
                        db.add(new_course)

        # TRƯỜNG HỢP 2: Cùng Module nhưng thay đổi vị trí order_index (Drag & Drop Reorder)
        elif old_order_index != new_order_index:
            if new_order_index > old_order_index:
                # Kéo xuống dưới: Giảm order_index các bài ở khoảng trung gian (old, new] đi 1
                shift_lessons = db.exec(
                    select(Lesson)
                    .where(Lesson.module_id == old_module_id)
                    .where(Lesson.lesson_id != db_obj.lesson_id)
                    .where(Lesson.order_index > old_order_index)
                    .where(Lesson.order_index <= new_order_index)
                ).all()
                for lesson in shift_lessons:
                    lesson.order_index -= 1
                    db.add(lesson)
            else:
                # Kéo lên trên: Tăng order_index các bài ở khoảng trung gian [new, old) lên 1
                shift_lessons = db.exec(
                    select(Lesson)
                    .where(Lesson.module_id == old_module_id)
                    .where(Lesson.lesson_id != db_obj.lesson_id)
                    .where(Lesson.order_index >= new_order_index)
                    .where(Lesson.order_index < old_order_index)
                ).all()
                for lesson in shift_lessons:
                    lesson.order_index += 1
                    db.add(lesson)

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, id: UUID) -> Lesson | None:
        db_obj = db.get(self.model, id)
        if not db_obj:
            return None

        deleted_module_id = db_obj.module_id
        deleted_order_index = db_obj.order_index

        # 1. Lấy course_id phục vụ cập nhật thống kê
        course_id = db.scalar(
            select(Subject.course_id)
            .join(Module, Subject.subject_id == Module.subject_id)
            .where(Module.module_id == deleted_module_id)
        )

        # 2. Xóa bài học
        db.delete(db_obj)
        db.flush()

        # 3. Dồn vị trí order_index của các bài học nằm đằng sau lên 1 đơn vị
        remaining_lessons = db.exec(
            select(Lesson)
            .where(Lesson.module_id == deleted_module_id)
            .where(Lesson.order_index > deleted_order_index)
        ).all()
        for lesson in remaining_lessons:
            lesson.order_index -= 1
            db.add(lesson)

        # 4. Giảm total_lessons của Course đi 1
        if course_id:
            course = db.get(Course, course_id)
            if course and course.total_lessons > 0:
                course.total_lessons -= 1
                db.add(course)

        db.commit()
        return db_obj

    def get_multi_by_module(self, db: Session, module_id: UUID) -> list[Lesson]:
        statement = select(Lesson).where(
            Lesson.module_id == module_id
        ).order_by(Lesson.order_index)
        return db.exec(statement).all()

    def get_lessons_by_subject(
        self,
        db: Session,
        subject_id: UUID,
        filter_type: Optional[LessonFilterType] = None
    ) -> List[Lesson]:
        # Query cơ bản JOIN Module và LỌC BỎ các bài tự chọn (is_optional == True)
        statement = (
            select(Lesson)
            .join(Module, Lesson.module_id == Module.module_id)
            .where(Module.subject_id == subject_id)
            .where(Lesson.is_optional == False)
        )

        # Xử lý theo giá trị Enum mới
        if filter_type == LessonFilterType.IN_VIDEO:
            # 1. Bài học có video
            statement = statement.where(
                Lesson.video_url.isnot(None),
                Lesson.video_url != ""
            )
        elif filter_type == LessonFilterType.STANDALONE_LESSON:
            # 2. Bài học là Bài thi độc lập
            statement = statement.where(Lesson.is_quiz == True)
        elif filter_type == LessonFilterType.INSIDE_LESSON:
            # 3. Các bài đọc/văn bản còn lại (Không phải Quiz và Không có Video)
            statement = statement.where(
                Lesson.is_quiz == False,
                or_(Lesson.video_url.is_(None), Lesson.video_url == "")
            )

        statement = statement.order_by(Module.order_index, Lesson.order_index)
        return db.exec(statement).all()
    def get_ids_by_module_ids(self, db: Session, module_ids: list[UUID]) -> list[UUID]:
        if not module_ids:
            return []
        statement = select(Lesson.lesson_id).where(Lesson.module_id.in_(module_ids))
        return db.exec(statement).all()
    
    def get_content_body(self, db: Session, lesson_id: UUID) -> str:
        statement = (
            select(Lesson.content_body)
            .where(Lesson.lesson_id == lesson_id)
        )
        
        result = db.exec(statement).first()
        if not result:
            return None
        return result

    def get_multi_by_subject(self, db: Session, subject_id: UUID):
        statement = select(Lesson.lesson_id, Lesson.title).join(
            Module, Module.module_id == Lesson.module_id
        ).where(Module.subject_id == subject_id)

        results = db.exec(statement).all()
        
        # Chuyển đổi danh sách Row (tuple) thành danh sách Dictionary
        return [{"lesson_id": lesson_id, "title": title} for lesson_id, title in results]

    def get_subject_id_lesson(self, db: Session, lesson_id: UUID) -> UUID:
        statement = select(Module.subject_id).join(
            Lesson, Module.module_id == Lesson.module_id
        ).where(Lesson.lesson_id == lesson_id)

        return db.exec(statement).first()
crud_lesson = CRUDLesson(Lesson)