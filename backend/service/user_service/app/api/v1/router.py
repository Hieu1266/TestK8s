from fastapi import APIRouter
from app.api.v1.routers.auth import router as auth_router
from app.api.v1.routers.user import router as user_router
from app.api.v1.routers.profile import router as profile_router
from app.api.v1.routers.google_auth import router as gg_auth_router

router = APIRouter()
router.include_router(auth_router)
router.include_router(user_router)
router.include_router(profile_router)
router.include_router(gg_auth_router)