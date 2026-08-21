from sqlalchemy import create_engine
from app.core.config import settings
from sqlmodel import SQLModel, Session, select, func


engine = create_engine(settings.QUIZS_DB_URL)

def init_db() -> None:
    import app.models.question
    import app.models.question_option
    import app.models.quiz
    import app.models.quiz_submission
    import app.models.submission_detail 
    import app.models.quiz_question
    import app.models.rubric_criteria
    import app.models.peer_review_assignments
    import app.models.peer_review_evaluations
    import app.models.question_pool
    import app.models.quiz_pool_rule
    import app.models.question_pool_link
    SQLModel.metadata.create_all(engine)