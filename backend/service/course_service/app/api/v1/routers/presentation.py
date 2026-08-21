from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.v1.deps import SessionDep
from app.core.security import get_current_user_role
from app.crud.lesson import crud_lesson
from app.crud.module import crud_module
from app.crud.presentation import crud_presentation, crud_presentation_slide
from app.models.lesson import Lesson
from app.models.presentation import Presentation
from app.models.presentation_slide import PresentationSlide
from app.schemas.presentation import (
    PresentationCreate,
    PresentationResponse,
    PresentationSlideCreate,
    PresentationSlideReorder,
    PresentationSlideResponse,
    PresentationSlideUpdate,
    PresentationUpdate,
)


router = APIRouter(prefix="/presentations", tags=["presentations"])


def _get_lesson_or_404(db: SessionDep, lesson_id: UUID) -> Lesson:
    lesson = crud_lesson.get_by_id(db, lesson_id)
    if lesson is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bài học không tồn tại",
        )
    return lesson


def _get_presentation_or_404(
    db: SessionDep, presentation_id: UUID
) -> Presentation:
    presentation = crud_presentation.get_by_id(db, presentation_id)
    if presentation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bài trình chiếu không tồn tại",
        )
    return presentation


def _get_slide_or_404(db: SessionDep, slide_id: UUID) -> PresentationSlide:
    slide = crud_presentation_slide.get_by_id(db, slide_id)
    if slide is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Slide không tồn tại",
        )
    return slide


def _ensure_lesson_owner(
    db: SessionDep, lesson: Lesson, current_user: dict
) -> None:
    course_owner = crud_module.get_course_owner(db, lesson.module_id)
    if course_owner is None or str(current_user["user_id"]) != str(course_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền quản lý bài trình chiếu của bài học này",
        )


def _lesson_from_presentation(
    db: SessionDep, presentation: Presentation
) -> Lesson:
    return _get_lesson_or_404(db, presentation.lesson_id)


def _presentation_from_slide(
    db: SessionDep, slide: PresentationSlide
) -> Presentation:
    return _get_presentation_or_404(db, slide.presentation_id)


@router.post(
    "/",
    response_model=PresentationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_presentation(
    db: SessionDep,
    presentation_in: PresentationCreate,
    current_user: dict = Depends(get_current_user_role),
):
    lesson = _get_lesson_or_404(db, presentation_in.lesson_id)
    _ensure_lesson_owner(db, lesson, current_user)

    if lesson.is_quiz:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bài kiểm tra không thể sử dụng nội dung trình chiếu",
        )

    if crud_presentation.get_by_lesson_id(db, lesson.lesson_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bài học này đã có bài trình chiếu",
        )

    return crud_presentation.create_for_lesson(
        db,
        lesson=lesson,
        obj_in=presentation_in,
    )


@router.get(
    "/lesson/{lesson_id}",
    response_model=PresentationResponse,
)
def get_presentation_by_lesson(db: SessionDep, lesson_id: UUID):
    _get_lesson_or_404(db, lesson_id)
    presentation = crud_presentation.get_by_lesson_id(db, lesson_id)
    if presentation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bài học chưa có nội dung trình chiếu",
        )
    return presentation


@router.put(
    "/{presentation_id}",
    response_model=PresentationResponse,
)
def update_presentation(
    db: SessionDep,
    presentation_id: UUID,
    presentation_in: PresentationUpdate,
    current_user: dict = Depends(get_current_user_role),
):
    presentation = _get_presentation_or_404(db, presentation_id)
    lesson = _lesson_from_presentation(db, presentation)
    _ensure_lesson_owner(db, lesson, current_user)
    return crud_presentation.update_presentation(
        db,
        presentation=presentation,
        obj_in=presentation_in,
    )


@router.delete(
    "/{presentation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_presentation(
    db: SessionDep,
    presentation_id: UUID,
    current_user: dict = Depends(get_current_user_role),
):
    presentation = _get_presentation_or_404(db, presentation_id)
    lesson = _lesson_from_presentation(db, presentation)
    _ensure_lesson_owner(db, lesson, current_user)
    crud_presentation.delete_presentation(
        db,
        presentation=presentation,
        lesson=lesson,
    )
    return None


@router.post(
    "/{presentation_id}/slides",
    response_model=PresentationSlideResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_slide(
    db: SessionDep,
    presentation_id: UUID,
    slide_in: PresentationSlideCreate,
    current_user: dict = Depends(get_current_user_role),
):
    presentation = _get_presentation_or_404(db, presentation_id)
    lesson = _lesson_from_presentation(db, presentation)
    _ensure_lesson_owner(db, lesson, current_user)
    return crud_presentation_slide.create_for_presentation(
        db,
        presentation_id=presentation_id,
        obj_in=slide_in,
    )


@router.put(
    "/{presentation_id}/slides/reorder",
    response_model=list[PresentationSlideResponse],
)
def reorder_slides(
    db: SessionDep,
    presentation_id: UUID,
    reorder_in: PresentationSlideReorder,
    current_user: dict = Depends(get_current_user_role),
):
    presentation = _get_presentation_or_404(db, presentation_id)
    lesson = _lesson_from_presentation(db, presentation)
    _ensure_lesson_owner(db, lesson, current_user)

    current_slides = crud_presentation_slide.get_by_presentation(
        db, presentation_id
    )
    current_ids = {slide.slide_id for slide in current_slides}
    requested_ids = reorder_in.slide_ids

    if len(requested_ids) != len(set(requested_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Danh sách sắp xếp chứa slide bị lặp",
        )
    if set(requested_ids) != current_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Danh sách sắp xếp phải chứa đầy đủ và đúng các slide của bài trình chiếu",
        )

    return crud_presentation_slide.reorder(
        db,
        presentation_id=presentation_id,
        slide_ids=requested_ids,
    )


@router.put(
    "/slides/{slide_id}",
    response_model=PresentationSlideResponse,
)
def update_slide(
    db: SessionDep,
    slide_id: UUID,
    slide_in: PresentationSlideUpdate,
    current_user: dict = Depends(get_current_user_role),
):
    slide = _get_slide_or_404(db, slide_id)
    presentation = _presentation_from_slide(db, slide)
    lesson = _lesson_from_presentation(db, presentation)
    _ensure_lesson_owner(db, lesson, current_user)
    return crud_presentation_slide.update_slide(
        db,
        slide=slide,
        obj_in=slide_in,
    )


@router.delete(
    "/slides/{slide_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_slide(
    db: SessionDep,
    slide_id: UUID,
    current_user: dict = Depends(get_current_user_role),
):
    slide = _get_slide_or_404(db, slide_id)
    presentation = _presentation_from_slide(db, slide)
    lesson = _lesson_from_presentation(db, presentation)
    _ensure_lesson_owner(db, lesson, current_user)
    crud_presentation_slide.delete_slide(db, slide=slide)
    return None