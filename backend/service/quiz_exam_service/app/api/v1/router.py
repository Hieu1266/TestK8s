from fastapi import APIRouter
from app.api.v1.routers.quiz import router as quiz_router
from app.api.v1.routers.question import router as question_router
from app.api.v1.routers.question_option import router as question_opt_router
from app.api.v1.routers.question_pool import router as question_pool_router
from app.api.v1.routers.question_bank import router as question_bank_router
from app.api.v1.routers.quiz_submission import router as quiz_submission_router
from app.api.v1.routers.submission_detail import router as submission_detail_router
from app.api.v1.routers.peer_review import router as peer_review_router

router = APIRouter()

router.include_router(quiz_router)
router.include_router(question_router)
router.include_router(question_opt_router)
router.include_router(question_pool_router)
router.include_router(question_bank_router)
router.include_router(quiz_submission_router)
router.include_router(submission_detail_router)
router.include_router(peer_review_router)
