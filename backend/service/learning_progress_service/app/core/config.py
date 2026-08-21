from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
from typing import Annotated, Any
from pydantic import BeforeValidator, AnyUrl

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE_PATH = ROOT_DIR / ".env"
def parse_cors(v: Any) -> list[str] | str:
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",") if i.strip()]
    elif isinstance(v, list | str):
        return v
    raise ValueError(v)
class Settings(BaseSettings):
    BACKEND_CORS_ORIGINS: Annotated[
        list[str] | str, BeforeValidator(parse_cors)
    ] = []

    FRONTEND_HOST: str

    def all_cors_origins(self) -> list[str]:
        origins = [str(origin).rstrip("/") for origin in self.BACKEND_CORS_ORIGINS]
        if self.FRONTEND_HOST:
            origins.append(self.FRONTEND_HOST.rstrip("/"))
        return origins
    
    BACKEND_USER_URL: str 
    BACKEND_COURSE_URL: str
    BACKEND_QUIZ_EXAM_URL: str
    BACKEND_LEARNING_PROGRESS_URL: str
    LEARNING_PROGRESS_DB_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 1

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE_PATH), 
        env_file_encoding="utf-8",
        extra="ignore"
    )
settings = Settings()