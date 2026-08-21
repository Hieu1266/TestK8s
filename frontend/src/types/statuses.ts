export enum CourseStatus {
    COURSE_REGISTRATION = 'COURSE_REGISTRATION',
    COURSE_UPCOMING = 'COURSE_UPCOMING',
    COURSE_ONGOING = 'COURSE_ONGOING',
    COURSE_COMPLETED = 'COURSE_COMPLETED',
}

// Lưu ý: đây là trạng thái BIÊN SOẠN nội dung của môn học (do giảng viên/CMS
// quản lý), KHÔNG phải trạng thái mở khóa cho từng học viên — việc mở khóa
// bài học theo học viên nằm ở LessonProgress.status (LessonStatus) bên dưới.
export enum SubjectStatus {
    SUBJECT_DEVELOPING = 'SUBJECT_DEVELOPING',
    SUBJECT_ACTIVE = 'SUBJECT_ACTIVE',
    SUBJECT_SUSPENDED = 'SUBJECT_SUSPENDED',
}

export enum LessonStatus {
    LOCKED = 'LOCKED',
    UNLOCKED = 'UNLOCKED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
}

export enum SubmissionStatus {
    IN_PROGRESS = 'IN_PROGRESS', // Thí sinh đang làm bài (chưa nộp)
    SUBMITTED = 'SUBMITTED',     // Đã nộp bài (chờ chấm điểm nếu có tự luận / chấm chéo)
    GRADED = 'GRADED',           // Đã chấm xong điểm hoàn toàn
}

export enum ReviewStatus {
    PENDING = 'PENDING',     // Được giao nhưng chưa chấm
    COMPLETED = 'COMPLETED', // Đã chấm xong
    SKIPPED = 'SKIPPED',     // Bị bỏ qua (hết hạn hoặc lý do đặc biệt)
}

export enum SyllabusStatus {
    SYLLABUS_DRAFT = "SYLLABUS_DRAFT",
    SYLLABUS_REVIEWING = "SYLLABUS_REVIEWING",
    SYLLABUS_APPROVED = "SYLLABUS_APPROVED",
    SYLLABUS_REJECTED = "SYLLABUS_REJECTED"
}