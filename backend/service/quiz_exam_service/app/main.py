from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlmodel import Session, update

from app.core.config import settings
from app.core.db import init_db, engine 
from app.api.v1.router import router
from app.models.quiz_submission import QuizSubmission 

# 1. Khởi tạo Scheduler
scheduler = AsyncIOScheduler()

def update_expired_peer_reviews_job():
    """Hàm tự động kiểm tra và chuyển is_peer_review = False sau 7 ngày nộp"""
    with Session(engine) as db:
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        
        statement = (
            update(QuizSubmission)
            .where(QuizSubmission.is_peer_review == True)
            .where(QuizSubmission.submitted_at.is_not(None))
            .where(QuizSubmission.submitted_at <= seven_days_ago)
            .values(is_peer_review=False)
        )
        
        result = db.exec(statement)
        db.commit()
        print(f"[{datetime.now()}] APScheduler: Đã cập nhật {result.rowcount} bài nộp quá hạn 7 ngày.")

# 2. Quản lý vòng đời ứng dụng bằng Lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Khi Server khởi chạy (Startup) ---
    init_db()
    print("Database started successfully!")
    
    # Đăng ký task chạy định kỳ (Ví dụ: Quét 1 giờ / lần)
    scheduler.add_job(
        update_expired_peer_reviews_job, 
        trigger="interval", 
        minutes=1, 
        id="check_peer_review_job"
    )
    scheduler.start()
    print("APScheduler started successfully!")
    
    yield  # Ứng dụng hoạt động tại đây
    
    # --- Khi Server tắt (Shutdown) ---
    scheduler.shutdown()
    print("APScheduler stopped!")

# 3. Gán lifespan vào ứng dụng FastAPI
app = FastAPI(lifespan=lifespan)

origins = [
    settings.FRONTEND_HOST
]

app.add_middleware(
    CORSMiddleware,
    # allow_origins=["*"],
    allow_origins=settings.all_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)