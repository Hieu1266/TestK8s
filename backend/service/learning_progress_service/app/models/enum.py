from enum import Enum

class LessonStatus(str, Enum):
    LOCKED = "LOCKED"         # Bài học đang bị khóa (chưa đủ điều kiện học)
    UNLOCKED = "UNLOCKED"     # Đã mở khóa nhưng chưa học
    IN_PROGRESS = "IN_PROGRESS" # Đang học dở dang
    COMPLETED = "COMPLETED"   # Đã hoàn thành hoàn toàn

class StructurePart(str, Enum):
    COURSE = "COURSE" # Nhận xét toàn bộ khóa học
    SUBJECT = "SUBJECT" # Nhận xét một môn học cụ thể
    MODULE = "MODULE" #Nhận xét một module cụ thể
    LESSON = "LESSON" # Nhận xét một bài học cụ thể

class TestingEnrollment(str, Enum):
    IN_PROGRESS = "IN_PROGRESS" #Đang học
    REJECTED = "REJECTED" #Từ chối
    APPROVED = "APPROVED" # Xác nhận

class CommentStatus(str, Enum):
    PENDING = "PENDING"     # Chưa xử lý
    RESOLVED = "RESOLVED"   # Đã xử lý
    