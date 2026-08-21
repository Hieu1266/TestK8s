from pathlib import Path
from typing import Annotated, Any
from pydantic import BeforeValidator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE_PATH = ROOT_DIR / ".env"

def parse_cors(v: Any) -> list[str] | str:
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",") if i.strip()]
    elif isinstance(v, list | str):
        return v
    raise ValueError(v)

class Settings(BaseSettings):
    FOLDER_PATH_COURSE_IMAGE: str = "static/uploads/courses"
    FOLDER_PATH_CURRICULUM: str = "static/uploads/curriculum"
    MEDIA_SERVER_URL: str = "http://172.16.109.76:8001"
    VM_B_URL: str ="http://172.21.0.1:8000"
    BACKEND_URL: str = "http://localhost:8001"
    FRONTEND_HOST: str
    BACKEND_CORS_ORIGINS: Annotated[
        list[str] | str, BeforeValidator(parse_cors)
    ] = []
    STORAGE_API_URL: str
    BACKEND_USER_URL: str 
    BACKEND_COURSE_URL: str 
    BACKEND_QUIZ_EXAM_URL: str
    BACKEND_LEARNING_PROGRESS_URL: str
    COURSES_DB_URL: str

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 1

    def all_cors_origins(self) -> list[str]:
        origins = [str(origin).rstrip("/") for origin in self.BACKEND_CORS_ORIGINS]
        if self.FRONTEND_HOST:
            origins.append(self.FRONTEND_HOST.rstrip("/"))
        return origins

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE_PATH), 
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()