from uuid import UUID
from typing import List, Dict, Any, Optional
from sqlmodel import Session, select, delete
from app.crud.base import CRUDBase
from app.schemas.video_progress import VideoProgressCreate, VideoProgressUpdate
from app.models.video_progress import VideoProgress
from app.models.lesson_progress import LessonProgress

class CRUDVideoProgress(CRUDBase[VideoProgress, VideoProgressCreate, VideoProgressUpdate, UUID]):
    def init_video_progress(self, db: Session, user_id: UUID, lessons: List[Dict[str, Any]], is_tested: bool):
        """
        Khởi tạo tiến độ video hàng loạt cho học viên khi đăng ký khóa học
        """
        # 1. Lấy danh sách lesson_id đã tồn tại bản ghi tiến độ video của user này (tránh tạo trùng)
        existing_lesson_ids = set(
            db.exec(
                select(VideoProgress.lesson_id).where(VideoProgress.user_id == user_id)
            ).all()
        )

        # 2. Lọc và chuẩn bị danh sách object mới
        new_progress_list = []
        for lesson in lessons:
            lesson_id = UUID(str(lesson["lesson_id"]))
            duration = lesson.get("duration_seconds", 0)

            # Chỉ tạo tiến độ cho bài học có video (duration > 0) và chưa tồn tại
            if lesson_id not in existing_lesson_ids and duration > 0:
                if not is_tested:
                    video_progress = VideoProgress(
                        user_id=user_id,
                        lesson_id=lesson_id,
                        duration_seconds=duration,
                        last_watched_second=0,
                        max_watched_second=0,
                        completion_percentage=0.0,
                        is_finished=False,
                        current_points=0.0
                    )
                else:
                    video_progress = VideoProgress(
                        user_id=user_id,
                        lesson_id=lesson_id,
                        duration_seconds=duration,
                        last_watched_second=0,
                        max_watched_second=duration,
                        completion_percentage=100,
                        is_finished=True,
                        current_points=10
                    )
                new_progress_list.append(video_progress)

        # 3. Lưu hàng loạt vào DB bằng add_all để tối ưu hiệu năng
        if new_progress_list:
            db.add_all(new_progress_list)
            db.commit()

    def remove_by_course(self, db: Session, user_id: UUID, course_id: UUID):
            """
            Xóa toàn bộ tiến độ video của người dùng trong một khóa học cụ thể
            """
            # 1. Trích xuất danh sách lesson_id của user thuộc course_id từ LessonProgress
            statement_lessons = select(LessonProgress.lesson_id).where(
                LessonProgress.user_id == user_id,
                LessonProgress.course_id == course_id
            )
            lesson_ids = db.exec(statement_lessons).all()

            # 2. Xóa các bản ghi VideoProgress tương ứng với danh sách lesson_id
            if lesson_ids:
                statement_delete = delete(VideoProgress).where(
                    VideoProgress.user_id == user_id,
                    VideoProgress.lesson_id.in_(lesson_ids)
                )
                db.exec(statement_delete)
                db.commit()

    def get_by_lesson_and_user(
        self, db: Session, user_id: UUID, lesson_id: UUID
    ) -> Optional[VideoProgress]:
        """
        🆕 Tìm bản ghi tiến độ video của 1 user cho 1 bài học cụ thể.
        Dùng để FE lấy đúng video_progress_id thật thay vì hard-code lesson_id.
        """
        statement = select(VideoProgress).where(
            VideoProgress.user_id == user_id,
            VideoProgress.lesson_id == lesson_id,
        )
        return db.exec(statement).first()

    def get_or_create(
        self, db: Session, user_id: UUID, lesson_id: UUID, duration_seconds: int
    ) -> VideoProgress:
        """
        🆕 Lấy bản ghi tiến độ video nếu đã tồn tại, ngược lại tự khởi tạo mới.
        Xử lý các trường hợp video_progress chưa được khởi tạo sẵn qua init_video_progress
        (ví dụ: bài học được thêm video sau khi học viên đã đăng ký khóa học).
        """
        existing = self.get_by_lesson_and_user(db, user_id, lesson_id)
        if existing:
            return existing

        new_progress = VideoProgress(
            user_id=user_id,
            lesson_id=lesson_id,
            duration_seconds=duration_seconds,
            last_watched_second=0,
            max_watched_second=0,
            completion_percentage=0.0,
            is_finished=False,
            current_points=0.0,
        )
        db.add(new_progress)
        db.commit()
        db.refresh(new_progress)
        return new_progress

    def update(self, db: Session, db_obj: VideoProgress, obj_in: VideoProgressUpdate) -> VideoProgress:
        # Lấy dữ liệu update từ client (chỉ lấy các trường đã được gửi lên)
        update_data = obj_in.model_dump(exclude_unset=True)

        # 1. Xử lý logic max_watched_second (không thể giảm)
        if "max_watched_second" in update_data:
            new_max = update_data["max_watched_second"]
            # Chỉ cập nhật nếu giá trị mới lớn hơn giá trị cũ
            db_obj.max_watched_second = max(db_obj.max_watched_second, new_max)
            # Loại bỏ khỏi update_data để vòng lặp bên dưới không gán đè lại giá trị cũ
            del update_data["max_watched_second"]

        # 2. Cập nhật các trường dữ liệu còn lại
        for field, value in update_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)

        # 3. Tính toán lại phần trăm hoàn thành
        if db_obj.duration_seconds > 0:
            percentage = (db_obj.max_watched_second / db_obj.duration_seconds) * 100
            # Đảm bảo không vượt quá 100%
            db_obj.completion_percentage = min(percentage, 100.0)
        else:
            db_obj.completion_percentage = 0.0

        # 4. Tự động chuyển is_finished = True nếu xem hết video
        if db_obj.max_watched_second >= db_obj.duration_seconds or db_obj.completion_percentage >= 100:
            db_obj.is_finished = True

        # Lưu thay đổi vào Database
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def get_by_user_and_lesson(
        self, db: Session, user_id: UUID, lesson_id: UUID
    ) -> Optional[VideoProgress]:
        """Lấy tiến độ video dựa trên user_id và lesson_id"""
        statement = select(VideoProgress).where(
            VideoProgress.user_id == user_id,
            VideoProgress.lesson_id == lesson_id
        )
        return db.exec(statement).first()

crud_video_progress = CRUDVideoProgress(VideoProgress)