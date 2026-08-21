"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
    QuestionPool,
    QuestionPoolCreatePayload,
    QuestionPoolUpdatePayload,
} from "@/types/exam-management";

async function getServerToken() {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value || "";
    return token.trim().replace(/^"|"$/g, "");
}

const EXAM_QUIZ_URL = process.env.NEXT_PUBLIC_EXAM_BACKEND_URL;

async function authHeaders() {
    const token = await getServerToken();
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
}

// 1. Lấy danh sách pool theo subject
export const getPoolsBySubjectAction = async (subjectId: string): Promise<QuestionPool[]> => {
    try {
        const res = await fetch(`${EXAM_QUIZ_URL}/question_pools/get-by-subject/${subjectId}`, {
            method: "GET",
            headers: await authHeaders(),
            cache: "no-store",
        });
        if (!res.ok) throw new Error(`Lỗi gọi API: ${res.status}`);
        return await res.json();
    } catch (error) {
        console.error("getPoolsBySubjectAction Error:", error);
        throw error;
    }
};

// 2. Tạo pool mới
export const createPoolAction = async (
    payload: QuestionPoolCreatePayload,
    pathForRevalidation?: string
): Promise<{ success: boolean; data?: QuestionPool; error?: string }> => {
    try {
        const res = await fetch(`${EXAM_QUIZ_URL}/question_pools/`, {
            method: "POST",
            headers: await authHeaders(),
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { success: false, error: typeof err?.detail === "string" ? err.detail : "Tạo pool thất bại." };
        }
        const data = await res.json();
        if (pathForRevalidation) revalidatePath(pathForRevalidation);
        return { success: true, data: data?.data };
    } catch (error: any) {
        console.error("❌ createPoolAction:", error.message);
        return { success: false, error: error.message || "Lỗi kết nối máy chủ." };
    }
};

// 3. Cập nhật pool
export const updatePoolAction = async (
    poolId: string,
    payload: QuestionPoolUpdatePayload
): Promise<{ success: boolean; data?: QuestionPool; error?: string }> => {
    try {
        const res = await fetch(`${EXAM_QUIZ_URL}/question_pools/${poolId}`, {
            method: "PATCH",
            headers: await authHeaders(),
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { success: false, error: typeof err?.detail === "string" ? err.detail : "Cập nhật pool thất bại." };
        }
        const data = await res.json();
        return { success: true, data: data?.pool };
    } catch (error: any) {
        console.error("❌ updatePoolAction:", error.message);
        return { success: false, error: error.message || "Lỗi kết nối máy chủ." };
    }
};

// 4. Xóa pool
export const deletePoolAction = async (poolId: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const token = await getServerToken();
        const res = await fetch(`${EXAM_QUIZ_URL}/question_pools/${poolId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok && res.status !== 204) {
            const err = await res.json().catch(() => ({}));
            return { success: false, error: typeof err?.detail === "string" ? err.detail : "Xóa pool thất bại." };
        }
        return { success: true };
    } catch (error: any) {
        console.error("❌ deletePoolAction:", error.message);
        return { success: false, error: error.message || "Lỗi kết nối máy chủ." };
    }
};

// 5. Thay thế toàn bộ danh sách câu hỏi được gán vào pool
export const setPoolQuestionsAction = async (
    poolId: string,
    questionIds: string[]
): Promise<{ success: boolean; error?: string }> => {
    try {
        const res = await fetch(`${EXAM_QUIZ_URL}/question_pools/${poolId}/questions`, {
            method: "PATCH",
            headers: await authHeaders(),
            body: JSON.stringify({ question_ids: questionIds }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { success: false, error: typeof err?.detail === "string" ? err.detail : "Cập nhật câu hỏi trong pool thất bại." };
        }
        return { success: true };
    } catch (error: any) {
        console.error("❌ setPoolQuestionsAction:", error.message);
        return { success: false, error: error.message || "Lỗi kết nối máy chủ." };
    }
};