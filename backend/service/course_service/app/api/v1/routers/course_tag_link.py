from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Query,
)
from uuid import UUID
from typing import Optional, List

from app.api.v1.deps import SessionDep
from app.core.security import RoleChecker

from app.schemas.course_tag_link import (
    CourseTagLinkCreate,
    CourseTagAssignmentUpdate,
)
from app.schemas.tag import TagName
from app.schemas.course import GeneralCourseInfo

from app.schemas.enums import CourseStatus
from app.crud.course import crud_course
from app.crud.tag import crud_tag
from app.crud.course_tag_link import (
    crud_course_tag_link,
)


router = APIRouter(
    prefix="/course-tag-link",
    tags=["course-tag-link"],
)


@router.post("/add-tags")
def add_tags_to_course(
    db: SessionDep,
    tag_list: List[UUID],
    linked_course: UUID,
    current_user: dict = Depends(
        RoleChecker(["Manager"])
    ),
):
    course = crud_course.get_by_id(
        db,
        linked_course,
    )

    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khóa học không tồn tại",
        )

    added_count = 0

    for tag_id in set(tag_list):
        if crud_tag.get_by_id(db, tag_id) is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tag {tag_id} không tồn tại",
            )

        existing_link = (
            crud_course_tag_link.get_by_id(
                db,
                course_id=linked_course,
                tag_id=tag_id,
            )
        )

        if existing_link is None:
            crud_course_tag_link.create(
                db,
                CourseTagLinkCreate(
                    course_id=linked_course,
                    tag_id=tag_id,
                ),
            )
            added_count += 1

    return {
        "status": "success",
        "message": (
            f"Đã thêm {added_count} Tag vào "
            f"khóa học {course.title}"
        ),
    }


@router.delete("/remove-tag")
def remove_tag_from_course(
    db: SessionDep,
    tag_id: UUID,
    course_id: UUID,
    current_user: dict = Depends(
        RoleChecker(["Manager"])
    ),
):
    course = crud_course.get_by_id(
        db,
        course_id,
    )

    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khóa học không tồn tại",
        )

    tag = crud_tag.get_by_id(db, tag_id)

    if tag is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag không tồn tại",
        )

    existing_link = (
        crud_course_tag_link.get_by_id(
            db,
            course_id,
            tag_id,
        )
    )

    if existing_link is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Tag chưa được gán cho khóa học này"
            ),
        )

    crud_course_tag_link.delete(
        db,
        course_id,
        tag_id,
    )

    return {
        "status": "success",
        "message": (
            f"Đã xóa Tag {tag.tag_name} khỏi "
            f"khóa học {course.title}"
        ),
    }


@router.get(
    "/get-tag-list/{course_id}",
    response_model=List[TagName],
)
def get_tag_list(
    db: SessionDep,
    course_id: UUID,
):
    course = crud_course.get_by_id(
        db,
        course_id,
    )

    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khóa học không tồn tại",
        )

    return (
        crud_course_tag_link
        .get_multi_by_course_id(
            db,
            course_id,
        )
    )

@router.get(
    "/get-course-list",
    response_model=List[GeneralCourseInfo],
)
def get_course_list(
    db: SessionDep,
    tag_id: Optional[UUID] = Query(
        None,
        description="ID của Tag cần lọc",
    ),
    status_id: Optional[CourseStatus] = Query(
        CourseStatus.COURSE_REGISTRATION,
        description="Trạng thái khóa học",
    ),
):
    courses = (
        crud_course_tag_link
        .get_multi_by_tag_id(
            db,
            tag_id=tag_id,
            status_id=status_id,
        )
    )

    result = []
    for course in courses:
        tags_list = [tag.tag_name for tag in course.tags] if course.tags else []
        result.append(
            GeneralCourseInfo(
                course_id=course.course_id,
                title=course.title,
                description=course.description,
                price=course.price,
                course_type=course.course_type,
                tags=tags_list,
            )
        )

    return result

@router.put("/update-tags")
def update_course_tags(
    db: SessionDep,
    payload: CourseTagAssignmentUpdate,
    current_user: dict = Depends(
        RoleChecker(["Manager"])
    ),
):
    course = crud_course.get_by_id(
        db,
        payload.course_id,
    )

    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khóa học không tồn tại",
        )

    unique_tag_ids = list(
        set(payload.tag_ids)
    )

    for tag_id in unique_tag_ids:
        if crud_tag.get_by_id(db, tag_id) is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tag {tag_id} không tồn tại",
            )

    result = (
        crud_course_tag_link
        .replace_course_tags(
            db=db,
            course_id=payload.course_id,
            tag_ids=unique_tag_ids,
        )
    )

    return {
        "status": "success",
        "message": (
            f"Đã cập nhật Tag cho khóa học "
            f"{course.title}"
        ),
        "added_count": result["added_count"],
        "removed_count": result["removed_count"],
        "total_tags": len(unique_tag_ids),
    }