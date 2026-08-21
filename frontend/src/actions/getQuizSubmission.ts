'use server';

import { cookies } from 'next/headers';
import {
    QuizTakeResponse,
    SubmissionDetailUpdatePayload,
    SubmissionDetailUpdateResponse,
    QuizSubmitResponse,
    QuizSubmissionStatusResponse,
    QuizStatusActionResult,
    QuizSubmissionSummary,
    QuizUserSummaryItem,
    UserSubmissionItem,
    QuizSubmissionDetail,
    QuestionGradingPayload
} from '@/types/quiz-submission';


const BASE_URL = process.env.NEXT_PUBLIC_EXAM_BACKEND_URL;

/**
 * Lấy Bearer Token từ Cookies
 */
async function getAuthHeader(): Promise<Record<string, string>> {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || cookieStore.get('access_token')?.value;

    if (!token) {
        throw new Error('Chưa đăng nhập hoặc phiên làm việc đã hết hạn.');
    }

    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

/**
 * 1. Bắt đầu bài thi dựa trên lesson_id
 * @param isPeerReview - true nếu học viên chọn "Tham gia chấm chéo" thay vì nộp cho giảng viên chấm
 */
export async function startQuizSubmissionAction(
    lessonId: string,
    isPeerReview: boolean = false
): Promise<{ success: boolean; data?: QuizTakeResponse; error?: string }> {
    try {
        const headers = await getAuthHeader();
        const res = await fetch(
            `${BASE_URL}/quiz-submissions/start/${lessonId}?is_peer_review=${isPeerReview}`,
            {
                method: 'POST',
                headers,
                cache: 'no-store',
            }
        );

        const result = await res.json();
        if (!res.ok) {
            return { success: false, error: result.detail || 'Không thể khởi tạo bài thi' };
        }

        return { success: true, data: result };
    } catch (err: any) {
        return { success: false, error: err.message || 'Lỗi kết nối máy chủ' };
    }
}

/**
 * 2. Cập nhật câu trả lời (chọn đáp án trắc nghiệm hoặc nhập tự luận)
 */
export async function updateSubmissionDetailAction(
    detailId: string,
    payload: SubmissionDetailUpdatePayload
): Promise<{ success: boolean; data?: SubmissionDetailUpdateResponse; error?: string }> {
    try {
        const headers = await getAuthHeader();
        const res = await fetch(`${BASE_URL}/submission-details/${detailId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(payload),
            cache: 'no-store',
        });

        const result = await res.json();
        if (!res.ok) {
            return { success: false, error: result.detail || 'Không thể lưu câu trả lời' };
        }

        return { success: true, data: result };
    } catch (err: any) {
        return { success: false, error: err.message || 'Lỗi kết nối máy chủ' };
    }
}

/**
 * 3. Nộp bài thi và nhận kết quả chấm điểm
 */
export async function submitQuizAction(
    submissionId: string
): Promise<{ success: boolean; data?: QuizSubmitResponse; error?: string }> {
    try {
        const headers = await getAuthHeader();
        const res = await fetch(`${BASE_URL}/quiz-submissions/${submissionId}/submit`, {
            method: 'POST',
            headers,
            cache: 'no-store',
        });

        const result = await res.json();
        if (!res.ok) {
            return { success: false, error: result.detail || 'Nộp bài thất bại' };
        }

        return { success: true, data: result };
    } catch (err: any) {
        return { success: false, error: err.message || 'Lỗi kết nối máy chủ' };
    }
}

/**
 * 4. Lấy trạng thái bài thi theo lesson_id
 */
export async function getQuizStatusByLessonAction(lessonId: string): Promise<QuizStatusActionResult> {
    try {
        const headers = await getAuthHeader();

        const res = await fetch(`${BASE_URL}/quiz-submissions/lesson/${lessonId}`, {
            method: 'GET',
            headers,
            cache: 'no-store',
        });

        // 404 = chưa từng làm bài lần nào -> coi là trạng thái "null"
        if (res.status === 404) {
            return { success: true, data: null };
        }

        if (!res.ok) {
            const errBody = await res.json().catch(() => null);
            return { success: false, error: errBody?.detail || 'Không thể tải trạng thái bài thi.' };
        }

        const data: QuizSubmissionStatusResponse = await res.json();
        return { success: true, data };
    } catch (err) {
        return { success: false, error: 'Lỗi kết nối máy chủ.' };
    }
}

/**
 * 5. Chấm ngay 1 câu hỏi (dùng cho câu hỏi chèn giữa video)
 */
export async function submitQuestionAction(
    detailId: string
): Promise<{ success: boolean; data?: { success: boolean; is_correct: boolean | null }; error?: string }> {
    try {
        const headers = await getAuthHeader();
        const res = await fetch(`${BASE_URL}/submission-details/submit-question/${detailId}`, {
            method: 'POST',
            headers,
            cache: 'no-store',
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { success: false, error: errorData.detail || 'Lỗi kiểm tra đáp án' };
        }

        const data = await res.json();
        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err.message || 'Lỗi kết nối' };
    }
}

/**
 * 5b. Lấy số lượng thành viên đang trong quá trình học khóa học.
 * Dùng để quyết định có cho phép học viên chọn "Tham gia chấm chéo" hay không
 * (chỉ bật khi >= 3 người đang học).
 */
export async function getCourseInProgressCountAction(
    courseId: string
): Promise<{ success: boolean; data?: number; error?: string }> {
    try {
        const headers = await getAuthHeader();
        const res = await fetch(
            `${BASE_URL}/quiz-submissions/courses/${courseId}/in-progress-count`,
            {
                method: 'GET',
                headers,
                cache: 'no-store',
            }
        );

        if (!res.ok) {
            const errBody = await res.json().catch(() => null);
            return {
                success: false,
                error: errBody?.detail || 'Không thể kiểm tra số lượng học viên đang học khóa học',
            };
        }

        const result = await res.json();
        return { success: true, data: result };
    } catch (err: any) {
        return { success: false, error: err.message || 'Lỗi kết nối máy chủ' };
    }
}
export async function getQuizzesSummaryBySubjectAction(
    subjectId: string
): Promise<{ success: boolean; data?: QuizSubmissionSummary[]; error?: string }> {
    try {
        const headers = await getAuthHeader();
        const res = await fetch(`${BASE_URL}/quiz-submissions/subjects/${subjectId}/quizzes`, {
            method: 'GET',
            headers,
            cache: 'no-store',
        });

        const result = await res.json();
        if (!res.ok) {
            return { success: false, error: result.detail || 'Không thể tải danh sách bài thi' };
        }

        return { success: true, data: result };
    } catch (err: any) {
        return { success: false, error: err.message || 'Lỗi kết nối máy chủ' };
    }
}

/**
 * 1. Lấy danh sách học viên và số lượt nộp của đề thi
 */
export async function getQuizUsersSummaryAction(
    quizId: string
): Promise<{ success: boolean; data?: QuizUserSummaryItem[]; error?: string }> {
    try {
        const headers = await getAuthHeader();
        const res = await fetch(`${BASE_URL}/quiz-submissions/quizzes/${quizId}/users`, {
            method: 'GET',
            headers,
            cache: 'no-store',
        });

        const result = await res.json();
        if (!res.ok) return { success: false, error: result.detail || 'Không thể tải danh sách học viên' };
        return { success: true, data: result };
    } catch (err: any) {
        return { success: false, error: err.message || 'Lỗi kết nối máy chủ' };
    }
}

/**
 * 2. Lấy các lượt nộp của riêng 1 học viên trong đề thi
 */
export async function getUserSubmissionsByQuizAction(
    quizId: string,
    userId: string
): Promise<{ success: boolean; data?: UserSubmissionItem[]; error?: string }> {
    try {
        const headers = await getAuthHeader();
        const res = await fetch(`${BASE_URL}/quiz-submissions/quizzes/${quizId}/users/${userId}`, {
            method: 'GET',
            headers,
            cache: 'no-store',
        });

        const result = await res.json();
        if (!res.ok) return { success: false, error: result.detail || 'Không thể tải lượt nộp của học viên' };
        return { success: true, data: result };
    } catch (err: any) {
        return { success: false, error: err.message || 'Lỗi kết nối máy chủ' };
    }
}

export async function getSubmissionDetailAction(
    submissionId: string
): Promise<{ success: boolean; data?: QuizSubmissionDetail; error?: string }> {
    try {
        const headers = await getAuthHeader();
        const res = await fetch(`${BASE_URL}/quiz-submissions/${submissionId}/detail`, {
            method: 'GET',
            headers,
            cache: 'no-store',
        });

        const result = await res.json();
        if (!res.ok) {
            return { success: false, error: result.detail || 'Không thể lấy chi tiết bài làm' };
        }
        return { success: true, data: result };
    } catch (err: any) {
        return { success: false, error: err.message || 'Lỗi kết nối máy chủ' };
    }
}

export async function updateSubmissionGradingAction(
    submissionId: string,
    gradings: QuestionGradingPayload[]
): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
        const headers = await getAuthHeader();
        const res = await fetch(`${BASE_URL}/quiz-submissions/${submissionId}/grade`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ gradings }),
            cache: 'no-store',
        });

        const result = await res.json();
        if (!res.ok) {
            return { success: false, error: result.detail || 'Cập nhật điểm thất bại' };
        }

        return { success: true, message: result.message || 'Cập nhật điểm thành công' };
    } catch (err: any) {
        return { success: false, error: err.message || 'Lỗi kết nối máy chủ' };
    }
}