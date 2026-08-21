'use server';

import { cookies } from 'next/headers';

const COURSE_BASE_URL = process.env.NEXT_PUBLIC_COURSE_BACKEND_URL;

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

export interface TesterSubjectSummary {
    subject_id: string;
    title: string;
    description?: string;
    status_id: string;
    total_quizzes?: number;
}

/**
 * Lấy danh sách môn học mà Tester (cộng tác viên) hiện tại đang được Giảng viên giao.
 * Gọi API: GET /course-collab-link/my-subjects (Course Service)
 */
export async function getTesterAssignedSubjectsAction(
    search?: string
): Promise<{ success: boolean; data?: TesterSubjectSummary[]; error?: string }> {
    try {
        const headers = await getAuthHeader();
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        const res = await fetch(`${COURSE_BASE_URL}/course-collab-link/my-subjects${query}`, {
            method: 'GET',
            headers,
            cache: 'no-store',
        });

        const result = await res.json();
        if (!res.ok) {
            return { success: false, error: result.detail || 'Không thể tải danh sách môn học được giao' };
        }

        return { success: true, data: result };
    } catch (err: any) {
        return { success: false, error: err.message || 'Lỗi kết nối máy chủ' };
    }
}
