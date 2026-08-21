from sqlalchemy import create_engine
from app.core.config import settings
from sqlmodel import SQLModel, Session, select, func


engine = create_engine(settings.LEARNING_PROGRESS_DB_URL)

def init_db() -> None:
    import app.models.course_enrollment
    import app.models.lesson_progress
    import app.models.user_lesson_note
    import app.models.video_progress
    import app.models.certificate
    import app.models.comment 
    SQLModel.metadata.create_all(engine)