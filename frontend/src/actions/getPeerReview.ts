'use server';

import { cookies } from 'next/headers';
import {
    MyAssignment,
    AssignmentDetail,
    SubmitEvaluationPayload,
    SubmitEvaluationResponse,
    ReviewStatus,
    QuizPeerReviewInfo,
    SubmissionListItem,
} from '@/types/peer-review';

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
 * 1. Danh sách các bài được giao cho học viên hiện tại chấm chéo
 */
export async function getMyPeerReviewAssignmentsAction(
    quizId?: string,
    reviewStatus?: ReviewStatus
): Promise<{ success: boolean; data?: MyAssignment[]; error?: string }> {
    try {
        const headers = await getAuthHeader();

        const params = new URLSearchParams();
        if (quizId) params.set('quiz_id', quizId);
        if (reviewStatus) params.set('status', reviewStatus);
        const query = params.toString() ? `?${params.toString()}` : '';

        const res = await fetch(`${BASE_URL}/peer-reviews/my-assignments${query}`, {
            method: 'GET',
            headers,
            cache: 'no-store',
        });

        const result = await res.json();
        if (!res.ok) {
            return { success: false, error: result.detail || 'Không thể tải danh sách bài chấm chéo' };
        }

        return { success: true, data: result };
    } catch (err: any) {
        return { success: false, error: err.message || 'Lỗi kết nối máy chủ' };
    }
}

/**
 * 2. Chi tiết một lượt chấm: câu trả lời tự luận cần chấm kèm rubric
 */
export async function getPeerReviewAssignmentDetailAction(
    assignmentId: string
): Promise<{ success: boolean; data?: AssignmentDetail; error?: string }> {
    try {
        const headers = await getAuthHeader();
        const res = await fetch(`${BASE_URL}/peer-reviews/assignments/${assignmentId}`, {
            method: 'GET',
            headers,
            cache: 'no-store',
        });

        const result = await res.json();
        if (!res.ok) {
            return { success: false, error: result.detail || 'Không thể tải chi tiết bài chấm chéo' };
        }

        return { success: true, data: result };
    } catch (err: any) {
        return { success: false, error: err.message || 'Lỗi kết nối máy chủ' };
    }
}

/**
 * 3. Nộp kết quả chấm chéo (điểm + nhận xét theo từng tiêu chí)
 */
export async function submitPeerReviewEvaluationAction(
    assignmentId: string,
    payload: SubmitEvaluationPayload
): Promise<{ success: boolean; data?: SubmitEvaluationResponse; error?: string }> {
    try {
        const headers = await getAuthHeader();
        const res = await fetch(`${BASE_URL}/peer-reviews/assignments/${assignmentId}/submit`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            cache: 'no-store',
        });

        const result = await res.json();
        if (!res.ok) {
            return { success: false, error: result.detail || 'Nộp kết quả chấm chéo thất bại' };
        }

        return { success: true, data: result };
    } catch (err: any) {
        return { success: false, error: err.message || 'Lỗi kết nối máy chủ' };
    }
}

// ---------------------------------------------------------------------------
// [Giảng viên] Bài nộp chấm chéo bị lệch điểm, cần chấm lại
// ---------------------------------------------------------------------------

/**
 * 4. [Giảng viên] Kiểm tra 1 đề thi có bật chấm chéo hay không.
 * Dùng để quyết định có hiển thị 2 mục (bài nộp thường / chấm chéo) trên trang quản lý bài nộp.
 */
export async function getQuizPeerReviewInfoAction(
    quizId: string
): Promise<{ success: boolean; data?: QuizPeerReviewInfo; error?: string }> {
    try {
        const headers = await getAuthHeader();
        const res = await fetch(`${BASE_URL}/peer-reviews/quizzes/${quizId}/peer-review-info`, {
            method: 'GET',
            headers,
            cache: 'no-store',
        });

        const result = await res.json();
        if (!res.ok) {
            return { success: false, error: result.detail || 'Không thể kiểm tra thông tin chấm chéo của đề thi' };
        }

        return { success: true, data: result };
    } catch (err: any) {
        return { success: false, error: err.message || 'Lỗi kết nối máy chủ' };
    }
}

/**
 * 5. [Giảng viên] Danh sách bài nộp của 1 đề thi, lọc theo cờ is_peer_review.
 * - isPeerReview = false -> mục "Bài nộp thường"
 * - isPeerReview = true  -> mục "Chấm chéo" (gồm cả bài đã chốt điểm lẫn bài lệch điểm)
 * - bỏ trống -> lấy tất cả
 */
export async function getQuizSubmissionsAction(
    quizId: string,
    isPeerReview?: boolean
): Promise<{ success: boolean; data?: SubmissionListItem[]; error?: string }> {
    try {
        const headers = await getAuthHeader();
        const query = isPeerReview !== undefined ? `?is_peer_review=${isPeerReview}` : '';
        const res = await fetch(`${BASE_URL}/peer-reviews/quizzes/${quizId}/submissions${query}`, {
            method: 'GET',
            headers,
            cache: 'no-store',
        });

        const result = await res.json();
        if (!res.ok) {
            return { success: false, error: result.detail || 'Không thể tải danh sách bài nộp' };
        }

        return { success: true, data: result };
    } catch (err: any) {
        return { success: false, error: err.message || 'Lỗi kết nối máy chủ' };
    }
}