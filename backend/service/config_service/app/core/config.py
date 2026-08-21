# app/core/config.py
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = (
        "postgresql://postgres:postgres@postgres-service:5432/lumer_db"
    )
    ADMIN_KEY: str = "supersecretadmin-key"
    K8S_NAMESPACE: str = "default"  # <-- Thêm dòng này để linh hoạt namespace

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

ALLOWED_SERVICES = {
    "user_service",
    "course_service",
    "learning_progress_service",
    "quiz_exam_service",
    "frontend",
}