import { RubricCriteria, PeerReviewAssignment, PeerReviewEvaluation, SubmissionDetail, QuizSubmission } from "@/types/examinations";
import { Quiz } from "@/types/quizzes";
import { QuizType, QuizPlacementType, QuestionType, CourseType } from "@/types/types";
import { SubmissionStatus, CourseStatus, LessonStatus, ReviewStatus, SubjectStatus } from "@/types/statuses";
import { UserLessonNote, LessonProgress } from "@/types/progresses";
import { Lesson } from "@/types/lessons";
import { Module } from "@/types/modules";
import { Subject } from "@/types/subjects";
import { Course } from "@/types/course";

const CURRENT_USER_ID = 'user-hoc-vien-001';
const COURSE_ID = 'course-fullstack-001';

const rubricCriterias: RubricCriteria[] = [
    { criteriaId: 'rc-1', quizId: 'quiz-essay-1', title: 'Đúng trọng tâm đề bài', description: 'Bài làm giải quyết đúng yêu cầu đề ra', maxScore: 4 },
    { criteriaId: 'rc-2', quizId: 'quiz-essay-1', title: 'Cấu trúc & lập luận', description: 'Trình bày mạch lạc, lập luận chặt chẽ', maxScore: 3 },
    { criteriaId: 'rc-3', quizId: 'quiz-essay-1', title: 'Ví dụ minh họa', description: 'Có ví dụ thực tế hỗ trợ lập luận', maxScore: 3 },
];

const essayQuiz: Quiz = {
    quizId: 'quiz-essay-1',
    subjectId: 'subject-1',
    title: 'Tiểu luận: Thiết kế REST API cho hệ thống thương mại điện tử',
    description: 'Trình bày phương án thiết kế REST API cho module giỏ hàng, có kèm ví dụ endpoint.',
    durationMinutes: 45,
    passingScore: 6,
    maxAttempts: 2,
    quizType: QuizType.FIXED_QUESTION,
    placementType: QuizPlacementType.INSIDE_LESSON,
    targetLessonId: 'lesson-1-2-2',
    isActive: true,
    isPeerReviewed: true,
    questions: [
        {
            questionId: 'q-essay-1',
            subjectId: 'subject-1',
            questionTitle: 'Thiết kế endpoint cho giỏ hàng',
            questionType: QuestionType.ESSAY,
            bodyContent: 'Hãy đề xuất các endpoint REST (method + path) cho chức năng thêm/sửa/xóa sản phẩm trong giỏ hàng, giải thích lựa chọn status code.',
            maxPoints: 10,
        },
    ],
    rubricCriterias,
};

const quizSubmissionMine: QuizSubmission = {
    submissionId: 'sub-mine-1',
    quizId: 'quiz-essay-1',
    userId: CURRENT_USER_ID,
    attemptNumber: 1,
    status: SubmissionStatus.SUBMITTED, // đã nộp, đang trong quá trình chấm chéo (completedReviewCount < requiredReviewCount)
    startedAt: '2026-07-20T09:00:00Z',
    submittedAt: '2026-07-20T09:38:00Z',
    peerAvgScore: undefined,
    isDiscrepant: false,
    completedReviewCount: 1,
    requiredReviewCount: 3,
    totalScore: undefined,
    isPassed: undefined,
    details: [
        {
            detailId: 'sd-1',
            submissionId: 'sub-mine-1',
            questionId: 'q-essay-1',
            essayAnswerText: 'POST /cart/items để thêm sản phẩm, PATCH /cart/items/{id} để cập nhật số lượng, DELETE /cart/items/{id} để xóa...',
        },
    ],
};

// Các bài của người khác được giao cho học viên hiện tại chấm chéo
const peerReviewAssignmentsForMe: PeerReviewAssignment[] = [
    {
        assignmentId: 'pra-1',
        quizId: 'quiz-essay-1',
        reviewerId: CURRENT_USER_ID,
        submissionId: 'sub-peer-101',
        submissionOwnerLabel: 'Học viên #A21',
        quizTitle: essayQuiz.title,
        lessonTitle: 'Thiết kế RESTful API',
        status: ReviewStatus.PENDING,
        assignedAt: '2026-07-21T02:00:00Z',
        dueAt: '2026-07-24T23:59:00Z',
        essayAnswerText:
            'Em đề xuất: POST /api/cart để thêm sản phẩm mới vào giỏ, trả về 201 Created. PUT /api/cart/{itemId} để cập nhật số lượng, trả về 200 OK. DELETE /api/cart/{itemId} trả về 204 No Content khi xóa thành công. Nếu sản phẩm không tồn tại thì trả 404...',
        evaluations: [],
    },
    {
        assignmentId: 'pra-2',
        quizId: 'quiz-essay-1',
        reviewerId: CURRENT_USER_ID,
        submissionId: 'sub-peer-102',
        submissionOwnerLabel: 'Học viên #B07',
        quizTitle: essayQuiz.title,
        lessonTitle: 'Thiết kế RESTful API',
        status: ReviewStatus.COMPLETED,
        finalScoreGiven: 8.5,
        generalComment: 'Bài làm rõ ràng, có ví dụ cụ thể, nên bổ sung thêm xử lý lỗi validate.',
        assignedAt: '2026-07-19T02:00:00Z',
        completedAt: '2026-07-20T05:00:00Z',
        dueAt: '2026-07-22T23:59:00Z',
        essayAnswerText: 'Em dùng POST /cart, PATCH /cart/{id}, DELETE /cart/{id}...',
        evaluations: [
            { evaluationId: 'ev-1', assignmentId: 'pra-2', criteriaId: 'rc-1', score: 4, feedback: 'Đúng trọng tâm' },
            { evaluationId: 'ev-2', assignmentId: 'pra-2', criteriaId: 'rc-2', score: 2.5, feedback: 'Cấu trúc khá tốt' },
            { evaluationId: 'ev-3', assignmentId: 'pra-2', criteriaId: 'rc-3', score: 2, feedback: 'Thiếu ví dụ lỗi' },
        ],
    },
    {
        assignmentId: 'pra-3',
        quizId: 'quiz-essay-1',
        reviewerId: CURRENT_USER_ID,
        submissionId: 'sub-peer-103',
        submissionOwnerLabel: 'Học viên #C15',
        quizTitle: essayQuiz.title,
        lessonTitle: 'Thiết kế RESTful API',
        status: ReviewStatus.PENDING,
        assignedAt: '2026-07-22T02:00:00Z',
        dueAt: '2026-07-25T23:59:00Z',
        essayAnswerText: 'Em tạo /api/v1/cart-items với các method GET, POST, PUT, DELETE tương ứng...',
        evaluations: [],
    },
];

const notesMine: UserLessonNote[] = [
    {
        noteId: 'note-1',
        userId: CURRENT_USER_ID,
        courseId: COURSE_ID,
        lessonId: 'lesson-1-1-1',
        timestampSeconds: 245,
        content: 'Nhớ ôn lại khái niệm idempotent của PUT vs POST.',
        createdAt: '2026-07-18T08:12:00Z',
    },
    {
        noteId: 'note-2',
        userId: CURRENT_USER_ID,
        courseId: COURSE_ID,
        lessonId: 'lesson-1-1-1',
        timestampSeconds: 512,
        content: 'Ví dụ status code hay, ghi lại để làm bài tiểu luận.',
        createdAt: '2026-07-18T08:20:00Z',
    },
];

// ---------- Cấu trúc bài học ----------

const lessons_1_1: Lesson[] = [
    {
        lessonId: 'lesson-1-1-1',
        moduleId: 'module-1-1',
        title: 'Giới thiệu kiến trúc REST và HTTP methods',
        videoUrl: 'https://cdn.example.com/videos/rest-intro.mp4',
        durationMinutes: 18,
        contentBody: 'Bài học giới thiệu về nguyên lý REST, các HTTP method (GET, POST, PUT, PATCH, DELETE) và cách áp dụng vào thiết kế API.',
        orderIndex: 1,
        isOptional: false,
        resources: [
            { resourceId: 'res-1', lessonId: 'lesson-1-1-1', fileName: 'Slide - REST Fundamentals.pdf', filePath: '/files/rest-fundamentals.pdf', fileExtension: 'pdf' },
            { resourceId: 'res-2', lessonId: 'lesson-1-1-1', fileName: 'Checklist thiết kế API.docx', filePath: '/files/api-checklist.docx', fileExtension: 'docx' },
        ],
    },
    {
        lessonId: 'lesson-1-1-2',
        moduleId: 'module-1-1',
        title: 'Status code & xử lý lỗi trong API',
        videoUrl: 'https://cdn.example.com/videos/status-codes.mp4',
        durationMinutes: 15,
        contentBody: 'Phân loại các nhóm status code 2xx/4xx/5xx và cách thiết kế response lỗi nhất quán.',
        orderIndex: 2,
        isOptional: false,
        resources: [],
    },
];

const lessons_1_2: Lesson[] = [
    {
        lessonId: 'lesson-1-2-1',
        moduleId: 'module-1-2',
        title: 'Thiết kế resource & versioning',
        videoUrl: 'https://cdn.example.com/videos/resource-design.mp4',
        durationMinutes: 20,
        contentBody: 'Cách đặt tên resource, phân trang (pagination), và chiến lược versioning API.',
        orderIndex: 1,
        isOptional: false,
        resources: [
            { resourceId: 'res-3', lessonId: 'lesson-1-2-1', fileName: 'Bộ quy tắc đặt tên endpoint.pdf', filePath: '/files/naming-rules.pdf', fileExtension: 'pdf' },
        ],
    },
    {
        lessonId: 'lesson-1-2-2',
        moduleId: 'module-1-2',
        title: 'Thiết kế RESTful API',
        videoUrl: 'https://cdn.example.com/videos/restful-api-design.mp4',
        durationMinutes: 22,
        contentBody: 'Thực hành thiết kế API hoàn chỉnh cho một module thương mại điện tử, áp dụng toàn bộ kiến thức đã học.',
        orderIndex: 2,
        isOptional: false,
        resources: [
            { resourceId: 'res-4', lessonId: 'lesson-1-2-2', fileName: 'Đề bài tiểu luận.pdf', filePath: '/files/essay-brief.pdf', fileExtension: 'pdf' },
        ],
        quiz: essayQuiz,
    },
];

const modules_subject_1: Module[] = [
    { moduleId: 'module-1-1', subjectId: 'subject-1', title: 'Nền tảng HTTP & REST', orderIndex: 1, lessons: lessons_1_1 },
    { moduleId: 'module-1-2', subjectId: 'subject-1', title: 'Thiết kế API thực chiến', orderIndex: 2, lessons: lessons_1_2 },
];

const lessons_2_1: Lesson[] = [
    {
        lessonId: 'lesson-2-1-1',
        moduleId: 'module-2-1',
        title: 'Thiết kế schema cơ sở dữ liệu quan hệ',
        videoUrl: 'https://cdn.example.com/videos/db-schema.mp4',
        durationMinutes: 25,
        contentBody: 'Chuẩn hóa dữ liệu, quan hệ 1-1/1-n/n-n, và cách dùng foreign key hiệu quả.',
        orderIndex: 1,
        isOptional: false,
        resources: [],
    },
    {
        lessonId: 'lesson-2-1-2',
        moduleId: 'module-2-1',
        title: 'ORM với SQLModel',
        videoUrl: 'https://cdn.example.com/videos/sqlmodel.mp4',
        durationMinutes: 19,
        contentBody: 'Sử dụng SQLModel để định nghĩa model, quan hệ Relationship, và truy vấn dữ liệu.',
        orderIndex: 2,
        isOptional: true,
        resources: [],
    },
];

const modules_subject_2: Module[] = [
    { moduleId: 'module-2-1', subjectId: 'subject-2', title: 'Thiết kế dữ liệu', orderIndex: 1, lessons: lessons_2_1 },
];

const subjects: Subject[] = [
    {
        subjectId: 'subject-1',
        courseId: COURSE_ID,
        title: 'Môn 1: Thiết kế API',
        description: 'Trang bị kiến thức và kỹ năng thiết kế REST API chuẩn công nghiệp.',
        orderIndex: 1,
        statusId: SubjectStatus.SUBJECT_ACTIVE,
        modules: modules_subject_1,
    },
    {
        subjectId: 'subject-2',
        courseId: COURSE_ID,
        title: 'Môn 2: Thiết kế cơ sở dữ liệu',
        description: 'Nắm vững nguyên lý mô hình hóa dữ liệu quan hệ và ORM.',
        orderIndex: 2,
        statusId: SubjectStatus.SUBJECT_ACTIVE,
        modules: modules_subject_2,
    },
];

export const mockCourse: Course = {
    courseId: COURSE_ID,
    curriculumId: 'curriculum-001',
    title: 'Lập trình Fullstack: Từ API đến Cơ sở dữ liệu',
    courseType: CourseType.LONG_TERM,
    description: 'Khóa học chuyên sâu về thiết kế API và cơ sở dữ liệu cho hệ thống web quy mô lớn.',
    price: 1490000,
    statusId: CourseStatus.COURSE_ONGOING,
    totalLessons: 6,
    subjects,
};

// Tiến độ học của người dùng hiện tại cho từng bài học (mô phỏng bảng lesson_progress)
export const mockLessonProgress: LessonProgress[] = [
    { progressId: 'lp-1', userId: CURRENT_USER_ID, courseId: COURSE_ID, lessonId: 'lesson-1-1-1', status: LessonStatus.COMPLETED, quizPassed: true, updatedAt: '2026-07-18T08:30:00Z' },
    { progressId: 'lp-2', userId: CURRENT_USER_ID, courseId: COURSE_ID, lessonId: 'lesson-1-1-2', status: LessonStatus.COMPLETED, quizPassed: true, updatedAt: '2026-07-18T09:10:00Z' },
    { progressId: 'lp-3', userId: CURRENT_USER_ID, courseId: COURSE_ID, lessonId: 'lesson-1-2-1', status: LessonStatus.COMPLETED, quizPassed: true, updatedAt: '2026-07-19T10:00:00Z' },
    { progressId: 'lp-4', userId: CURRENT_USER_ID, courseId: COURSE_ID, lessonId: 'lesson-1-2-2', status: LessonStatus.IN_PROGRESS, quizPassed: false, highestQuizScore: undefined, successfulSubmissionId: undefined, updatedAt: '2026-07-20T09:38:00Z' },
    { progressId: 'lp-5', userId: CURRENT_USER_ID, courseId: COURSE_ID, lessonId: 'lesson-2-1-1', status: LessonStatus.LOCKED, quizPassed: true, updatedAt: '2026-07-15T00:00:00Z' },
    { progressId: 'lp-6', userId: CURRENT_USER_ID, courseId: COURSE_ID, lessonId: 'lesson-2-1-2', status: LessonStatus.LOCKED, quizPassed: true, updatedAt: '2026-07-15T00:00:00Z' },
];

export const mockNotes: UserLessonNote[] = notesMine;
export const mockQuizSubmissions: QuizSubmission[] = [quizSubmissionMine];
export const mockPeerReviewAssignments: PeerReviewAssignment[] = peerReviewAssignmentsForMe;
export const CURRENT_USER = { userId: CURRENT_USER_ID, name: 'Nguyễn Văn Học' };

