from app.crud.base import CRUDBase
from app.models.course_tag_link import CourseTagLink
from app.schemas.course_tag_link import (
    CourseTagLinkCreate,
    CourseTagLinkUpdate,
)
from uuid import UUID
from typing import List, Optional

from app.models.tag import Tag
from app.models.course import Course
from app.schemas.course import GeneralCourseInfo

from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from app.schemas.enums import CourseStatus

class CRUDCourseTagLink(
    CRUDBase[
        CourseTagLink,
        CourseTagLinkCreate,
        CourseTagLinkUpdate,
        UUID,
    ]
):
    def get_by_id(
        self,
        db: Session,
        course_id: UUID,
        tag_id: UUID,
    ) -> CourseTagLink | None:
        statement = select(CourseTagLink).where(
            CourseTagLink.course_id == course_id,
            CourseTagLink.tag_id == tag_id,
        )

        return db.exec(statement).first()

    def delete(
        self,
        db: Session,
        course_id: UUID,
        tag_id: UUID,
    ) -> bool:
        statement = select(CourseTagLink).where(
            CourseTagLink.course_id == course_id,
            CourseTagLink.tag_id == tag_id,
        )

        obj = db.exec(statement).first()

        if obj is None:
            return False

        db.delete(obj)
        db.commit()

        return True

    def get_multi_by_course_id(
        self,
        db: Session,
        course_id: UUID,
    ) -> list[Tag]:
        statement = (
            select(Tag)
            .join(
                CourseTagLink,
                Tag.tag_id == CourseTagLink.tag_id,
            )
            .where(
                CourseTagLink.course_id == course_id
            )
        )

        return list(db.exec(statement).all())

    def get_multi_by_tag_id(
        self,
        db: Session,
        tag_id: Optional[UUID] = None,
        status_id: Optional[CourseStatus] = None,
    ):
        query = select(Course)

        if tag_id:
            query = query.join(
                CourseTagLink,
                CourseTagLink.course_id == Course.course_id,
            ).where(
                CourseTagLink.tag_id == tag_id
            )

        if status_id:
            query = query.where(
                Course.status_id == status_id
            )

        query = query.distinct()

        return db.exec(query).all()
        
    def replace_course_tags(
        self,
        db: Session,
        course_id: UUID,
        tag_ids: list[UUID],
    ) -> dict[str, int]:
        """
        Đồng bộ toàn bộ Tag của một khóa học.

        - Tag không còn được chọn sẽ bị xóa.
        - Tag mới được chọn sẽ được thêm.
        - Tag đã tồn tại sẽ được giữ nguyên.
        """

        statement = select(CourseTagLink).where(
            CourseTagLink.course_id == course_id
        )

        current_links = list(
            db.exec(statement).all()
        )

        current_tag_ids = {
            link.tag_id
            for link in current_links
        }

        # set giúp tự loại UUID bị gửi lặp.
        new_tag_ids = set(tag_ids)

        removed_count = 0
        added_count = 0

        # Xóa các liên kết không còn được chọn.
        for link in current_links:
            if link.tag_id not in new_tag_ids:
                db.delete(link)
                removed_count += 1

        # Thêm các liên kết mới.
        tag_ids_to_add = (
            new_tag_ids - current_tag_ids
        )

        for tag_id in tag_ids_to_add:
            db.add(
                CourseTagLink(
                    course_id=course_id,
                    tag_id=tag_id,
                )
            )
            added_count += 1

        db.commit()

        return {
            "added_count": added_count,
            "removed_count": removed_count,
        }


crud_course_tag_link = CRUDCourseTagLink(
    CourseTagLink
)