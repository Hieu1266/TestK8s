# import os
# import uuid
# import shutil
# from fastapi import UploadFile, HTTPException, status
# from app.core.config import settings

# class CRUDCourseMedia:
#     def __init__(self):
#         self.upload_dir = settings.FOLDER_PATH_COURSE_IMAGE

#     def upload_image(self, file: UploadFile, sub_path: str = "course-media/images") -> str:
#         try:
#             os.makedirs(self.upload_dir, exist_ok=True)
            
#             file_extension = os.path.splitext(file.filename)[1]
#             unique_filename = f"{uuid.uuid4()}{file_extension}"
#             file_path = os.path.join(self.upload_dir, unique_filename)
            
#             with open(file_path, "wb") as buffer:
#                 shutil.copyfileobj(file.file, buffer)
                
#             return f"/{sub_path}/{unique_filename}"
            
#         except Exception as e:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST, 
#                 detail=f"Lỗi hệ thống khi lưu tệp tin: {str(e)}"
#             )


# crud_course_media = CRUDCourseMedia()






import httpx
from fastapi import UploadFile, HTTPException, status

STORAGE_API_URL = "http://localhost:9000"

class CRUDCourseMedia:
    def upload_image(self, file: UploadFile, sub_path: str = "course-media/images") -> str:
        try:
            files = {"file": (file.filename, file.file, file.content_type)}
            data = {"folder": "course-image"}
            resp = httpx.post(f"{STORAGE_API_URL}/upload", files=files, data=data, timeout=30)
            resp.raise_for_status()
            result = resp.json()
            url_path = result["path"].replace("/uploads/course", "/course-media", 1)
            return url_path.lstrip("/")  # chỉ lưu path tương đối
        except httpx.HTTPError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Lỗi hệ thống khi lưu tệp tin: {str(e)}"
            )

crud_course_media = CRUDCourseMedia()