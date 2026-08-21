import httpx
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings
# STORAGE_API_URL = "http://localhost:9000"
STORAGE_API_URL = settings.STORAGE_API_URL
class CRUDSyllabusMedia:
    def upload_file(self, file: UploadFile) -> str:
        try:
            files = {"file": (file.filename, file.file, file.content_type)}
            data = {"folder": "syllabus"}
            resp = httpx.post(f"{STORAGE_API_URL}/upload", files=files, data=data, timeout=30)
            resp.raise_for_status()
            result = resp.json()
            
            # 🟢 Trả về dạng: static/uploads/documents/syllabus/filename.pdf (Giống Curriculum)
            return f"static{result['path']}"  
        except httpx.HTTPError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Lỗi hệ thống khi lưu tệp tin đề cương: {str(e)}"
            )

crud_syllabus_media = CRUDSyllabusMedia()