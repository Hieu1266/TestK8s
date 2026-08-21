import datetime
import os
from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import PlainTextResponse
from kubernetes import client, config

from app.core.config import ALLOWED_SERVICES, settings
from app.core.db import SessionDep
from app.crud import config as crud_config
from app.schemas.config import ConfigUpdate

router = APIRouter(prefix="/config", tags=["config"])

K8S_NAMESPACE = getattr(settings, "K8S_NAMESPACE", "default")


# 1. Định nghĩa Middleware verify key trước khi dùng trong route
def verify_admin_key(x_admin_key: str = Header(default="")):
    admin_key = getattr(settings, "ADMIN_KEY", "")
    if x_admin_key != admin_key:
        raise HTTPException(status_code=401, detail="Sai admin key")


# 2. Khởi tạo K8s API Clients an toàn
def get_k8s_clients():
    try:
        config.load_incluster_config()
    except Exception:
        try:
            config.load_kube_config()
        except Exception as e:
            print(f"[Warning] Không thể kết nối K8s API: {e}")
            return None, None
    return client.CoreV1Api(), client.AppsV1Api()


def sync_to_k8s_and_restart(service_name: str, config_data: dict):
    """Cập nhật ConfigMap trên K8s và trigger Rollout Restart Pod"""
    k8s_name = service_name.replace("_", "-")
    cm_name = f"{k8s_name}-config"

    v1, apps_v1 = get_k8s_clients()
    if not v1 or not apps_v1:
        raise RuntimeError(
            "Không thể kết nối đến Kubernetes Cluster từ trong Pod"
        )

    # Cập nhật K8s ConfigMap
    string_config = {str(k): str(v) for k, v in config_data.items()}
    cm_body = client.V1ConfigMap(
        metadata=client.V1ObjectMeta(name=cm_name), data=string_config
    )
    v1.patch_namespaced_config_map(
        name=cm_name, namespace=K8S_NAMESPACE, body=cm_body
    )

    # Trigger Rollout Restart Deployment
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
        name=k8s_name, namespace=K8S_NAMESPACE, body=restart_patch
    )


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
        raise HTTPException(
            status_code=404, detail=f"Chưa có config cho '{service_name}'"
        )
    return {
        "service_name": row.service_name,
        "config": row.config_json,
        "updated_at": row.updated_at,
    }


@router.get("/{service_name}/export", response_class=PlainTextResponse)
def export_service_config_as_env(service_name: str, db: SessionDep):
    row = crud_config.get_config(db, service_name)
    if not row:
        raise HTTPException(
            status_code=404, detail=f"Chưa có config cho '{service_name}'"
        )

    lines = [f"{key}={value}" for key, value in row.config_json.items()]
    return "\n".join(lines) + "\n"


@router.put("/{service_name}", dependencies=[Depends(verify_admin_key)])
def update_service_config(
    service_name: str, payload: ConfigUpdate, db: SessionDep
):
    if service_name not in ALLOWED_SERVICES:
        raise HTTPException(
            status_code=400,
            detail=f"'{service_name}' không nằm trong danh sách service hợp lệ",
        )

    # Lưu DB
    row = crud_config.upsert_config(db, service_name, payload.config)

    if service_name == "frontend":
        return {
            "message": "Đã lưu config frontend vào DB",
            "service_name": row.service_name,
            "config": row.config_json,
        }

    # Đồng bộ K8s
    try:
        sync_to_k8s_and_restart(service_name, payload.config)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Đã lưu DB nhưng lỗi sync K8s: {str(e)}",
        )

    return {
        "message": f"Cập nhật config cho '{service_name}' và kích hoạt K8s Rollout Restart thành công",
        "service_name": row.service_name,
        "config": row.config_json,
        "updated_at": row.updated_at,
    }