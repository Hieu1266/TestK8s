import os
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from uuid import UUID
from app.api.v1.deps import SessionDep
from app.core.security import get_current_user_role
from app.crud.lesson_resource import crud_lesson_resource
from app.crud.lesson import crud_lesson
from app.crud.module import crud_module
from app.models.lesson_resource import LessonResource
from app.schemas.lesson_resource import LessonResourceResponse

router = APIRouter(prefix="/lesson-resources", tags=["lesson_resources"])

# Thư mục gốc lưu file, đúng theo yêu cầu: documents/lesson_resources/{lesson_id}/{tên_file}
BASE_STORAGE_DIR = Path("documents/lesson_resources")

# Các định dạng cơ bản được phép tải lên
ALLOWED_EXTENSIONS = {
    "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx",
    "zip", "rar", "txt", "csv", "png", "jpg", "jpeg",
}
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50MB - có thể điều chỉnh theo nhu cầu thực tế


def _check_owner_permission(db: SessionDep, lesson_id: UUID, user_id: str):
    """
    Chỉ giảng viên sở hữu khóa học (chứa Module -> chứa Lesson này) mới được thao tác.
    Dùng chung logic kiểm tra quyền như app/api/v1/endpoints/lesson.py
    """
    lesson = crud_lesson.get_by_id(db, id=lesson_id)
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bài học không tồn tại"
        )

    course_owner = crud_module.get_course_owner(db, lesson.module_id)
    if course_owner is None or str(user_id) != str(course_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền thao tác tài nguyên của bài học này"
        )
    return lesson


@router.post("/", response_model=LessonResourceResponse, status_code=status.HTTP_201_CREATED)
async def upload_lesson_resource(
    db: SessionDep,
    lesson_id: UUID = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user_role),
):
    _check_owner_permission(db, lesson_id, current_user["user_id"])

    original_name = file.filename or "file"
    extension = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else ""
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Định dạng .{extension or '(?)'} không được hỗ trợ."
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kích thước file vượt quá giới hạn cho phép (50MB)."
        )

    lesson_dir = BASE_STORAGE_DIR / str(lesson_id)
    lesson_dir.mkdir(parents=True, exist_ok=True)

    # Thêm tiền tố uuid vào tên file lưu trên đĩa để tránh trùng/đè file,
    # nhưng vẫn giữ nguyên `file_name` gốc để hiển thị cho người dùng
    stored_filename = f"{uuid.uuid4().hex}_{original_name}"
    file_path = lesson_dir / stored_filename

    with open(file_path, "wb") as f:
        f.write(contents)

    resource = LessonResource(
        lesson_id=lesson_id,
        file_name=original_name,
        file_path=str(file_path),
        file_extension=extension,
    )
    return crud_lesson_resource.create(db, obj_in=resource)


@router.get("/get-by-lesson/{lesson_id}", response_model=list[LessonResourceResponse])
def get_lesson_resources(
    db: SessionDep,
    lesson_id: UUID,
):
    return crud_lesson_resource.get_multi_by_lesson(db, lesson_id)


@router.get("/download/{resource_id}")
def download_lesson_resource(
    db: SessionDep,
    resource_id: UUID,
):
    resource = crud_lesson_resource.get_by_id(db, id=resource_id)
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tài nguyên không tồn tại")
    if not os.path.exists(resource.file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File không còn tồn tại trên hệ thống")

    return FileResponse(
        path=resource.file_path,
        filename=resource.file_name,
        media_type="application/octet-stream",
    )


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson_resource(
    db: SessionDep,
    resource_id: UUID,
    current_user: dict = Depends(get_current_user_role),
):
    resource = crud_lesson_resource.get_by_id(db, id=resource_id)
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tài nguyên không tồn tại")

    _check_owner_permission(db, resource.lesson_id, current_user["user_id"])

    if os.path.exists(resource.file_path):
        try:
            os.remove(resource.file_path)
        except OSError:
            # File có thể đã bị xóa thủ công trước đó ngoài hệ thống -> không chặn việc xóa bản ghi DB
            pass

    crud_lesson_resource.delete(db, id=resource_id)
    return None