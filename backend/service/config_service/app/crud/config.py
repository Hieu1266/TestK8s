from typing import Optional

from sqlalchemy.orm import Session

from app.models.service_config import ServiceConfig


def get_config(db: Session, service_name: str) -> Optional[ServiceConfig]:
    return db.query(ServiceConfig).filter_by(service_name=service_name).first()


def get_all_configs(db: Session):
    return db.query(ServiceConfig).all()


def upsert_config(db: Session, service_name: str, new_config: dict) -> ServiceConfig:
    row = get_config(db, service_name)
    if row:
        row.config_json = {**row.config_json, **new_config}
    else:
        row = ServiceConfig(service_name=service_name, config_json=new_config)
        db.add(row)

    db.commit()
    db.refresh(row)
    return row