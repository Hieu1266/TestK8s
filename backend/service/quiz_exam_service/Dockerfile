# ==========================================
# Stage 1: Builder (Cài đặt thư viện với uv)
# ==========================================
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Lấy công cụ 'uv' để cài thư viện siêu tốc
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Cài đặt thư viện build hệ thống (C++, PostgreSQL driver)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy file requirements.txt
COPY requirements.txt .

# Tạo môi trường ảo và cài đặt thư viện bằng uv
RUN uv venv /app/.venv && \
    . /app/.venv/bin/activate && \
    uv pip install --no-cache -r requirements.txt

# ==========================================
# Stage 2: Runner (Môi trường chạy nhẹ & bảo mật)
# ==========================================
FROM python:3.11-slim AS runner

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

# Thư viện runtime cần thiết
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Tạo user không phải root
RUN groupadd --system appgroup && useradd --system --gid appgroup appuser

# Copy môi trường ảo .venv từ builder
COPY --from=builder --chown=appuser:appgroup /app/.venv /app/.venv

# Copy thư mục app chứa code FastAPI (main.py nằm trong app/)
COPY --chown=appuser:appgroup ./app ./app

USER appuser

EXPOSE 8002

# Chạy ứng dụng FastAPI (Vì main.py nằm trong thư mục app/ nên module là app.main:app)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002"]