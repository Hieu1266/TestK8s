"""
sync_env.py
Đặt file này CẠNH file .env của từng service (user_service, course_service,
learning_progress_service, quiz_exam_service). KHÔNG đặt trong config_service.

Cách chạy song song với uvicorn (mở thêm 1 terminal, activate venv, rồi):
    python3 sync_env.py

Chạy uvicorn với --reload-include để tự restart khi .env đổi:
    python3 -m uvicorn app.main:app --reload --reload-include ".env" --port 8003
"""

import os
import time
import httpx

# ==== CHỈNH DÒNG NÀY CHO ĐÚNG TỪNG SERVICE ====
# Đổi giá trị này khi copy sang thư mục service khác:
# user_service / course_service / learning_progress_service /  / frontend
SERVICE_NAME = "quiz_exam_service"
ENV_PATH = ".env"   # đặt file này cạnh .env của từng service, giữ nguyên đường dẫn này
# =================================================

CONFIG_SERVICE_URL = os.getenv("CONFIG_SERVICE_URL", "http://127.0.0.1:8005")
POLL_INTERVAL_SECONDS = 10  # 10s cho dev để thấy đổi ngay, sau này deploy thật thì tăng lên 30-60s


def fetch_remote_env_text() -> str | None:
    try:
        resp = httpx.get(
            f"{CONFIG_SERVICE_URL}/config/{SERVICE_NAME}/export",
            timeout=5,
        )
        resp.raise_for_status()
        return resp.text
    except Exception as e:
        print(f"[sync_env] Không gọi được config_service: {e}")
        return None


def read_local_env_text() -> str:
    if not os.path.exists(ENV_PATH):
        return ""
    with open(ENV_PATH, "r", encoding="utf-8") as f:
        return f.read()


def write_local_env_text(content: str) -> None:
    with open(ENV_PATH, "w", encoding="utf-8") as f:
        f.write(content)


def sync_once() -> None:
    remote_text = fetch_remote_env_text()
    if remote_text is None:
        return  # config_service đang tắt hoặc lỗi mạng, bỏ qua lần này

    local_text = read_local_env_text()

    if remote_text.strip() != local_text.strip():
        write_local_env_text(remote_text)
        print(f"[sync_env] Đã cập nhật .env cho '{SERVICE_NAME}' — uvicorn sẽ tự reload nếu chạy với --reload-include \".env\"")
    else:
        print(f"[sync_env] Config '{SERVICE_NAME}' không đổi.")


def main():
    print(f"[sync_env] Bắt đầu theo dõi config cho '{SERVICE_NAME}', mỗi {POLL_INTERVAL_SECONDS}s...")
    while True:
        sync_once()
        time.sleep(POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()