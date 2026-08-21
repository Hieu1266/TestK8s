from fastapi import APIRouter
from app.api.v1.routers.course import router as course_router
from app.api.v1.routers.subject import router as subject_router
from app.api.v1.routers.module import router as module_router
from app.api.v1.routers.lesson import router as lesson_router
from app.api.v1.routers.curriculum import router as curriculum_router
from app.api.v1.routers.syllabus import router as syllabus_router
from app.api.v1.routers.assignment import router as course_instructor_link
from app.api.v1.routers.tag import router as tag_router
from app.api.v1.routers.course_tag_link import router as course_tag_link_router
from app.api.v1.routers.lesson_resource import router as lesson_resource_router
from app.api.v1.routers.presentation import router as presentation_router
from app.api.v1.routers.subject_collaborator_link import router as collab_course_router
from app.api.v1.routers.content_annotation import router as content_annotation_router

router = APIRouter()

router.include_router(course_router)
router.include_router(subject_router)
router.include_router(module_router)
router.include_router(lesson_router)
router.include_router(tag_router)
router.include_router(curriculum_router)
router.include_router(syllabus_router)
router.include_router(course_instructor_link)
router.include_router(course_tag_link_router)
router.include_router(lesson_resource_router)
router.include_router(presentation_router)
router.include_router(collab_course_router)
router.include_router(content_annotation_router)
