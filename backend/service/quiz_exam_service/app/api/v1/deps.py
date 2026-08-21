from collections.abc import Generator
from typing import Annotated
from fastapi import Depends
from sqlalchemy import create_engine
from app.core.config import settings
from sqlmodel import Session

engine = create_engine(settings.QUIZS_DB_URL)
def get_db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_db)]