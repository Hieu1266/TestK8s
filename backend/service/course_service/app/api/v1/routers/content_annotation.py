from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from app.api.v1.deps import SessionDep
from app.core.security import get_current_user_role

from app.crud.content_annotation import (
    crud_content_annotation,
)
from app.crud.lesson import crud_lesson
from app.crud.module import crud_module
from app.crud.presentation import (
    crud_presentation,
    crud_presentation_slide,
)

from app.models.lesson import Lesson

from app.schemas.content_annotation import (
    AnnotationContentType,
    ContentAnnotationCreate,
    ContentAnnotationResponse,
    ContentAnnotationUpdate,
)


router = APIRouter(
    prefix="/content-annotations",
    tags=["content-annotations"],
)


def resolve_annotation_lesson(
    db: SessionDep,
    content_type: AnnotationContentType,
    content_id: UUID,
) -> Lesson:
    """
    Xác định lesson chứa nội dung đang được thêm chú giải.

    - LESSON_CONTENT: content_id chính là lesson_id.
    - PRESENTATION_SLIDE: content_id là slide_id,
      cần đi từ slide -> presentation -> lesson.
    """

    if (
        content_type
        == AnnotationContentType.LESSON_CONTENT
    ):
        lesson = crud_lesson.get_by_id(
            db,
            content_id,
        )

    else:
        slide = (
            crud_presentation_slide.get_by_id(
                db,
                content_id,
            )
        )

        if slide is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Slide không tồn tại",
            )

        presentation = (
            crud_presentation.get_by_id(
                db,
                slide.presentation_id,
            )
        )

        if presentation is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bài trình chiếu không tồn tại",
            )

        lesson = crud_lesson.get_by_id(
            db,
            presentation.lesson_id,
        )

    if lesson is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Không tìm thấy nội dung cần "
                "thêm chú giải"
            ),
        )

    return lesson


def ensure_annotation_owner(
    db: SessionDep,
    lesson: Lesson,
    user_id: str,
) -> None:
    """
    Chỉ giảng viên được phân công môn học chứa lesson
    mới được tạo, sửa hoặc xóa chú giải.
    """

    owner_id = crud_module.get_course_owner(
        db,
        lesson.module_id,
    )

    if (
        owner_id is None
        or str(owner_id) != str(user_id)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Bạn không có quyền quản lý "
                "chú giải của nội dung này"
            ),
        )

@router.post(
    "/",
    response_model=ContentAnnotationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_content_annotation(
    annotation_in: ContentAnnotationCreate,
    db: SessionDep,
    current_user: dict = Depends(
        get_current_user_role
    ),
):
    """
    Tạo chú giải mới cho nội dung lesson hoặc slide.
    """

    # 1. Tìm lesson chứa nội dung
    lesson = resolve_annotation_lesson(
        db=db,
        content_type=annotation_in.content_type,
        content_id=annotation_in.content_id,
    )

    # 2. Kiểm tra quyền của giảng viên
    ensure_annotation_owner(
        db=db,
        lesson=lesson,
        user_id=current_user["user_id"],
    )

    # 3. Chuyển schema thành dictionary
    payload = annotation_in.model_dump()

    # Enum cần được chuyển thành chuỗi trước khi lưu
    payload["content_type"] = (
        annotation_in.content_type.value
    )

    # Lấy ID giảng viên từ JWT
    payload["created_by"] = UUID(
        str(current_user["user_id"])
    )

    # 4. Tạo bản ghi trong database
    return crud_content_annotation.create(
        db=db,
        obj_in=payload,
    )

@router.get(
    "/content/{content_type}/{content_id}",
    response_model=list[ContentAnnotationResponse],
)
def get_content_annotations(
    content_type: AnnotationContentType,
    content_id: UUID,
    db: SessionDep,
    current_user: dict = Depends(
        get_current_user_role
    ),
):
    """
    Lấy toàn bộ chú giải của một lesson hoặc slide.

    API này dùng cho:
    - Giảng viên khi chỉnh sửa nội dung.
    - Học viên khi xem bài học.
    """

    # Kiểm tra lesson hoặc slide có tồn tại
    resolve_annotation_lesson(
        db=db,
        content_type=content_type,
        content_id=content_id,
    )

    return crud_content_annotation.get_by_content(
        db=db,
        content_type=content_type,
        content_id=content_id,
    )

@router.put(
    "/{annotation_id}",
    response_model=ContentAnnotationResponse,
)
def update_content_annotation(
    annotation_id: UUID,
    annotation_in: ContentAnnotationUpdate,
    db: SessionDep,
    current_user: dict = Depends(
        get_current_user_role
    ),
):
    """
    Cập nhật tiêu đề hoặc nội dung giải thích
    của một chú giải.
    """

    # 1. Tìm chú giải
    annotation = (
        crud_content_annotation.get_by_id(
            db,
            annotation_id,
        )
    )

    if annotation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chú giải không tồn tại",
        )

    # 2. Xác định lesson chứa chú giải
    lesson = resolve_annotation_lesson(
        db=db,
        content_type=AnnotationContentType(
            annotation.content_type
        ),
        content_id=annotation.content_id,
    )

    # 3. Kiểm tra quyền giảng viên
    ensure_annotation_owner(
        db=db,
        lesson=lesson,
        user_id=current_user["user_id"],
    )

    # 4. Cập nhật dữ liệu
    return crud_content_annotation.update(
        db=db,
        db_obj=annotation,
        obj_in=annotation_in,
    )

@router.delete(
    "/{annotation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_content_annotation(
    annotation_id: UUID,
    db: SessionDep,
    current_user: dict = Depends(
        get_current_user_role
    ),
):
    """
    Xóa một chú giải theo annotation_id.
    """

    # 1. Tìm chú giải
    annotation = (
        crud_content_annotation.get_by_id(
            db,
            annotation_id,
        )
    )

    if annotation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chú giải không tồn tại",
        )

    # 2. Xác định lesson chứa chú giải
    lesson = resolve_annotation_lesson(
        db=db,
        content_type=AnnotationContentType(
            annotation.content_type
        ),
        content_id=annotation.content_id,
    )

    # 3. Kiểm tra quyền giảng viên
    ensure_annotation_owner(
        db=db,
        lesson=lesson,
        user_id=current_user["user_id"],
    )

    # 4. Xóa chú giải
    crud_content_annotation.delete(
        db=db,
        id=annotation_id,
    )

    return None