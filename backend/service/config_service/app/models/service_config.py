from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class ServiceConfig(Base):
    __tablename__ = "service_config"

    id = Column(Integer, primary_key=True, index=True)
    service_name = Column(String(100), unique=True, nullable=False, index=True)
    config_json = Column(JSONB, nullable=False, default=dict)
    updated_at = Column(DateTime(timezone=True), server_default=func.now())