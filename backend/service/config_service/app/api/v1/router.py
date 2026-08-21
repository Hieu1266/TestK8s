from fastapi import APIRouter

from app.api.v1.routers.config import router as config_router

router = APIRouter()

router.include_router(config_router)