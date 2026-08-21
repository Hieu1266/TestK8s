from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import PlainTextResponse
from fastapi import Depends
from app.core.config import ALLOWED_SERVICES, settings
from app.core.db import SessionDep
from app.crud import config as crud_config
from app.schemas.config import ConfigUpdate

router = APIRouter(prefix="/config", tags=["config"])


def verify_admin_key(x_admin_key: str = Header(default="")):
    if x_admin_key != settings.ADMIN_KEY:
        raise HTTPException(status_code=401, detail="Sai admin key")


@router.get("")
def get_all_configs(db: SessionDep):
    rows = crud_config.get_all_configs(db)
    return {
        row.service_name: {
            "config": row.config_json,
            "updated_at": row.updated_at,
        }
        for row in rows
    }


@router.get("/{service_name}")
def get_service_config(service_name: str, db: SessionDep):
    row = crud_config.get_config(db, service_name)
    if not row:
        raise HTTPException(status_code=404, detail=f"Chưa có config cho '{service_name}'")
    return {
        "service_name": row.service_name,
        "config": row.config_json,
        "updated_at": row.updated_at,
    }


@router.get("/{service_name}/export", response_class=PlainTextResponse)
def export_service_config_as_env(service_name: str, db: SessionDep):
    row = crud_config.get_config(db, service_name)
    if not row:
        raise HTTPException(status_code=404, detail=f"Chưa có config cho '{service_name}'")

    lines = [f"{key}={value}" for key, value in row.config_json.items()]
    return "\n".join(lines) + "\n"


@router.put("/{service_name}", dependencies=[Depends(verify_admin_key)])
def update_service_config(service_name: str, payload: ConfigUpdate, db: SessionDep):
    if service_name not in ALLOWED_SERVICES:
        raise HTTPException(
            status_code=400,
            detail=f"'{service_name}' không nằm trong danh sách service hợp lệ: {sorted(ALLOWED_SERVICES)}",
        )

    row = crud_config.upsert_config(db, service_name, payload.config)

    return {
        "message": f"Cập nhật config cho '{service_name}' thành công",
        "service_name": row.service_name,
        "config": row.config_json,
        "updated_at": row.updated_at,
    }