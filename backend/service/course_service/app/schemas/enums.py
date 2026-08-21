from enum import Enum


class SubmissionStatus(str, Enum):
    IN_PROGRESS = "IN_PROGRESS" # Thí sinh đang làm bài (chưa nộp)
    SUBMITTED = "SUBMITTED"     # Đã nộp bài (Chờ chấm điểm nếu có tự luận)
    GRADED = "GRADED"           # Đã chấm xong điểm hoàn toàn

class CourseType(str, Enum):
    LONG_TERM = "LONG_TERM"
    SHORT_TERM = "SHORT_TERM"

class CurriculumStatus(str, Enum):
    CURRICULUM_DRAFT = "CURRICULUM_DRAFT"
    CURRICULUM_PENDING = "CURRICULUM_PENDING"
    CURRICULUM_ACTIVE = "CURRICULUM_ACTIVE"
    CURRICULUM_ARCHIVED = "CURRICULUM_ARCHIVED"

class SyllabusStatus(str, Enum):
    SYLLABUS_DRAFT = "SYLLABUS_DRAFT"
    SYLLABUS_REVIEWING = "SYLLABUS_REVIEWING"
    SYLLABUS_APPROVED = "SYLLABUS_APPROVED"
    SYLLABUS_REJECTED = "SYLLABUS_REJECTED"

# # 🟢 Sửa lại Value cho trùng khớp với Postgres Enum (syllabusstatus)
# class SyllabusStatus(str, Enum):
#     SYLLABUS_DRAFT = "DRAFT"
#     SYLLABUS_REVIEWING = "REVIEWING"
#     SYLLABUS_APPROVED = "APPROVED"
#     SYLLABUS_REJECTED = "REJECTED"

class CourseStatus(str, Enum):
    COURSE_DRAFT = "COURSE_DRAFT"
    COURSE_REGISTRATION = "COURSE_REGISTRATION"
    COURSE_UPCOMING = "COURSE_UPCOMING"
    COURSE_ONGOING = "COURSE_ONGOING"
    COURSE_COMPLETED = "COURSE_COMPLETED"

class SubjectStatus(str, Enum):
    SUBJECT_DEVELOPING = "SUBJECT_DEVELOPING"
    SUBJECT_ACTIVE = "SUBJECT_ACTIVE"
    SUBJECT_SUSPENDED = "SUBJECT_SUSPENDED"
