from fastapi import FastAPI
from app.core.config import settings
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import router

app = FastAPI()

if settings.all_cors_origins:
    app.add_middleware(
        CORSMiddleware,
        # allow_origins=["*"],
        allow_origins=settings.all_cors_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(router)


