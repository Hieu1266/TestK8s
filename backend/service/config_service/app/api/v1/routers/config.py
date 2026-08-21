import os
import datetime
from fastapi import APIRouter, Header, HTTPException, Depends
from fastapi.responses import PlainTextResponse
from kubernetes import client, config

from app.core.config import ALLOWED_SERVICES, settings
from app.core.db import SessionDep
from app.crud import config as crud_config
from app.schemas.config import ConfigUpdate

router = APIRouter(prefix="/config", tags=["config"])

# ============================================
# KHỞI TẠO KUBERNETES CLIENT
# ============================================
K8S_NAMESPACE = settings.K8S_NAMESPACE
try:
    config.load_incluster_config()
except config.ConfigException:
    try:
        config.load_kube_config()  # Để dev local kết nối K8s test
    except Exception:
        pass


def sync_to_k8s_and_restart(service_name: str, config_data: dict):
    """Cập nhật ConfigMap trên K8s và trigger Rollout Restart Pod"""
    cm_name = f"{service_name}-config"
    v1 = client.CoreV1Api()
    apps_v1 = client.AppsV1Api()

    # 1. Cập nhật K8s ConfigMap (ép tất cả value về dạng string)
    string_config = {k: str(v) for k, v in config_data.items()}
    v1.patch_namespaced_config_map(
        name=cm_name,
        namespace=K8S_NAMESPACE,
        body={"data": string_config}
    )

    # 2. Trigger Rollout Restart Deployment
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    restart_patch = {
        "spec": {
            "template": {
                "metadata": {
                    "annotations": {
                        "kubectl.kubernetes.io/restartedAt": now_iso
                    }
                }
            }
        }
    }
    apps_v1.patch_namespaced_deployment(
        name=service_name,
        namespace=K8S_NAMESPACE,
        body=restart_patch
    )


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

    # 1. Lưu vào Database như cũ
    row = crud_config.upsert_config(db, service_name, payload.config)

    # 2. Đẩy ConfigMap lên K8s & Trigger Restart Pod
    try:
        sync_to_k8s_and_restart(service_name, payload.config)
    except client.exceptions.ApiException as e:
        raise HTTPException(
            status_code=500,
            detail=f"Đã lưu DB nhưng lỗi sync K8s ConfigMap ({e.status}): {e.reason}"
        )
    except Exception as e:
        # Trường hợp chạy local không có cluster K8s
        print(f"[Warning] Không thể kết nối K8s Cluster: {e}")

    return {
        "message": f"Cập nhật config cho '{service_name}' và kích hoạt K8s Rollout Restart thành công",
        "service_name": row.service_name,
        "config": row.config_json,
        "updated_at": row.updated_at,
    }