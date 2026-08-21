from typing import Iterable
from uuid import UUID

from sqlmodel import Session, select

from app.crud.base import CRUDBase
from app.models.lesson import Lesson
from app.models.presentation import Presentation
from app.models.presentation_slide import PresentationSlide
from app.schemas.presentation import (
    PresentationCreate,
    PresentationSlideCreate,
    PresentationSlideUpdate,
    PresentationUpdate,
)


class CRUDPresentation(
    CRUDBase[Presentation, PresentationCreate, PresentationUpdate, UUID]
):
    def get_by_lesson_id(
        self, db: Session, lesson_id: UUID
    ) -> Presentation | None:
        statement = select(Presentation).where(
            Presentation.lesson_id == lesson_id
        )
        return db.exec(statement).first()

    def create_for_lesson(
        self,
        db: Session,
        *,
        lesson: Lesson,
        obj_in: PresentationCreate,
    ) -> Presentation:
        presentation = Presentation(
            lesson_id=lesson.lesson_id,
            title=obj_in.title,
        )
        lesson.is_slide_presentation = True

        db.add(lesson)
        db.add(presentation)
        db.commit()
        db.refresh(presentation)
        return presentation

    def update_presentation(
        self,
        db: Session,
        *,
        presentation: Presentation,
        obj_in: PresentationUpdate,
    ) -> Presentation:
        if "title" in obj_in.model_fields_set:
            presentation.title = obj_in.title

        db.add(presentation)
        db.commit()
        db.refresh(presentation)
        return presentation

    def delete_presentation(
        self,
        db: Session,
        *,
        presentation: Presentation,
        lesson: Lesson,
    ) -> None:
        lesson.is_slide_presentation = False
        db.add(lesson)
        db.delete(presentation)
        db.commit()


class CRUDPresentationSlide(
    CRUDBase[
        PresentationSlide,
        PresentationSlideCreate,
        PresentationSlideUpdate,
        UUID,
    ]
):
    def get_by_presentation(
        self, db: Session, presentation_id: UUID
    ) -> list[PresentationSlide]:
        statement = (
            select(PresentationSlide)
            .where(PresentationSlide.presentation_id == presentation_id)
            .order_by(PresentationSlide.slide_order)
        )
        return list(db.exec(statement).all())

    @staticmethod
    def _rewrite_orders(
        db: Session, slides: Iterable[PresentationSlide]
    ) -> None:
        ordered_slides = list(slides)
        if not ordered_slides:
            return

        # Đưa tất cả slide sang một vùng số tạm thời để không đụng ràng buộc
        # UNIQUE(presentation_id, slide_order) khi đổi nhiều vị trí cùng lúc.
        temporary_start = len(ordered_slides) * 2 + 1000
        for index, slide in enumerate(ordered_slides, start=1):
            slide.slide_order = temporary_start + index
            db.add(slide)
        db.flush()

        for index, slide in enumerate(ordered_slides, start=1):
            slide.slide_order = index
            db.add(slide)
        db.flush()

    def create_for_presentation(
        self,
        db: Session,
        *,
        presentation_id: UUID,
        obj_in: PresentationSlideCreate,
    ) -> PresentationSlide:
        slides = self.get_by_presentation(db, presentation_id)
        requested_order = obj_in.slide_order or len(slides) + 1
        insert_index = min(requested_order - 1, len(slides))

        # Giá trị tạm chưa trùng thứ tự hiện tại, sau đó toàn bộ danh sách
        # được chuẩn hóa liên tục từ 1.
        new_slide = PresentationSlide(
            presentation_id=presentation_id,
            title=obj_in.title,
            content_body=obj_in.content_body,
            slide_order=len(slides) + 1001,
        )
        db.add(new_slide)
        db.flush()

        slides.insert(insert_index, new_slide)
        self._rewrite_orders(db, slides)
        db.commit()
        db.refresh(new_slide)
        return new_slide

    def update_slide(
        self,
        db: Session,
        *,
        slide: PresentationSlide,
        obj_in: PresentationSlideUpdate,
    ) -> PresentationSlide:
        update_data = obj_in.model_dump(
            exclude_unset=True,
            exclude={"slide_order"},
        )
        for field, value in update_data.items():
            setattr(slide, field, value)

        if obj_in.slide_order is not None:
            slides = self.get_by_presentation(db, slide.presentation_id)
            slides = [item for item in slides if item.slide_id != slide.slide_id]
            insert_index = min(obj_in.slide_order - 1, len(slides))
            slides.insert(insert_index, slide)
            self._rewrite_orders(db, slides)

        db.add(slide)
        db.commit()
        db.refresh(slide)
        return slide

    def delete_slide(self, db: Session, *, slide: PresentationSlide) -> None:
        presentation_id = slide.presentation_id
        db.delete(slide)
        db.flush()

        remaining_slides = self.get_by_presentation(db, presentation_id)
        self._rewrite_orders(db, remaining_slides)
        db.commit()

    def reorder(
        self,
        db: Session,
        *,
        presentation_id: UUID,
        slide_ids: list[UUID],
    ) -> list[PresentationSlide]:
        slides = self.get_by_presentation(db, presentation_id)
        slide_by_id = {slide.slide_id: slide for slide in slides}
        ordered_slides = [slide_by_id[slide_id] for slide_id in slide_ids]

        self._rewrite_orders(db, ordered_slides)
        db.commit()

        for slide in ordered_slides:
            db.refresh(slide)
        return ordered_slides

    def get_by_slide_content_by_lesson(
        self, db: Session, lesson_id: UUID
    ) -> list[str]:
        """Lấy tất cả nội dung các slide thuộc về một lesson dựa trên lesson_id."""
        statement = (
            select(PresentationSlide.content_body)
            .join(Presentation, PresentationSlide.presentation_id == Presentation.presentation_id)
            .where(Presentation.lesson_id == lesson_id)
            .order_by(PresentationSlide.slide_order)
        )
        return list(db.exec(statement).all())


crud_presentation = CRUDPresentation(Presentation)
crud_presentation_slide = CRUDPresentationSlide(PresentationSlide)