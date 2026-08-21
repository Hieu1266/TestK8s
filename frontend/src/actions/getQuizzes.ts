"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { Quiz, QuizCreatePayload, QuizUpdatePayload, QuizDetail } from "@/types/exam-management";

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

// 1. Danh sách quiz theo subject
export const getQuizzesAction = async (subjectId: string, search: string = ""): Promise<Quiz[]> => {
    try {
        const queryParam = search ? `?search=${encodeURIComponent(search)}` : "";
        const url = `${EXAM_QUIZ_URL}/quizzes/get-quizzes-list/${subjectId}${queryParam}`;
        const res = await fetch(url, { method: "GET", headers: await authHeaders(), cache: "no-store" });

        if (!res.ok) {
            if (res.status === 403) throw new Error("Bạn không có quyền truy cập.");
            throw new Error(`Lỗi gọi API: ${res.status}`);
        }
        return await res.json();
    } catch (error) {
        console.error("Fetch Error:", error);
        throw error;
    }
};

// 2. Tạo mới đề thi
export const createQuizAction = async (
    payload: QuizCreatePayload,
    pathForRevalidation?: string
): Promise<{ success: boolean; quizId?: string; error?: string }> => {
    try {
        const res = await fetch(`${EXAM_QUIZ_URL}/quizzes/`, {
            method: "POST",
            headers: await authHeaders(),
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { success: false, error: typeof err?.detail === "string" ? err.detail : "Tạo đề thi thất bại." };
        }

        const data = await res.json();
        if (pathForRevalidation) revalidatePath(pathForRevalidation);
        return { success: true, quizId: data?.data?.quiz_id };
    } catch (error: any) {
        console.error("❌ createQuizAction:", error.message);
        return { success: false, error: error.message || "Lỗi kết nối máy chủ." };
    }
};

// 3. Xóa đề thi
export const deleteQuizAction = async (
    quizId: string,
    pathForRevalidation?: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const token = await getServerToken();
        const res = await fetch(`${EXAM_QUIZ_URL}/quizzes/${quizId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok && res.status !== 204) {
            const err = await res.json().catch(() => ({}));
            return { success: false, error: typeof err?.detail === "string" ? err.detail : "Xóa đề thi thất bại." };
        }
        if (pathForRevalidation) revalidatePath(pathForRevalidation);
        return { success: true };
    } catch (error: any) {
        console.error("❌ deleteQuizAction:", error.message);
        return { success: false, error: error.message || "Lỗi kết nối máy chủ." };
    }
};

// 4. 🆕 Cập nhật đề thi
export const updateQuizAction = async (
    quizId: string,
    payload: QuizUpdatePayload,
    pathForRevalidation?: string
): Promise<{ success: boolean; data?: Quiz; error?: string }> => {
    try {
        const res = await fetch(`${EXAM_QUIZ_URL}/quizzes/${quizId}`, {
            method: "PUT",
            headers: await authHeaders(),
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { success: false, error: typeof err?.detail === "string" ? err.detail : "Cập nhật đề thi thất bại." };
        }
        const data = await res.json();
        if (pathForRevalidation) revalidatePath(pathForRevalidation);
        return { success: true, data };
    } catch (error: any) {
        console.error("❌ updateQuizAction:", error.message);
        return { success: false, error: error.message || "Lỗi kết nối máy chủ." };
    }
};

// 5. 🆕 Lấy chi tiết 1 quiz (kèm câu hỏi cố định / pool rules)
export const getQuizDetailAction = async (quizId: string): Promise<QuizDetail | null> => {
    try {
        const res = await fetch(`${EXAM_QUIZ_URL}/quizzes/${quizId}`, {
            method: "GET",
            headers: await authHeaders(),
            cache: "no-store",
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(typeof err?.detail === "string" ? err.detail : "Không thể tải chi tiết đề thi.");
        }
        return await res.json();
    } catch (error) {
        console.error("getQuizDetailAction Error:", error);
        throw error;
    }
};

// 6. 🆕 Thêm câu hỏi cố định vào đề thi
export const addFixedQuestionsAction = async (
    quizId: string,
    questionIds: string[],
    videoTriggerSeconds?: number | null
): Promise<{ success: boolean; error?: string }> => {
    try {
        const payload = questionIds.map((question_id) => ({
            quiz_id: quizId,
            question_id,
            video_trigger_seconds: videoTriggerSeconds ?? null,
            order_index: 0, // Backend tự tính lại thứ tự thật, giá trị này không được dùng
        }));
        const res = await fetch(`${EXAM_QUIZ_URL}/quizzes/${quizId}/questions`, {
            method: "POST",
            headers: await authHeaders(),
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { success: false, error: typeof err?.detail === "string" ? err.detail : "Thêm câu hỏi thất bại." };
        }
        return { success: true };
    } catch (error: any) {
        console.error("❌ addFixedQuestionsAction:", error.message);
        return { success: false, error: error.message || "Lỗi kết nối máy chủ." };
    }
};

// 7. 🆕 Xóa 1 câu hỏi cố định khỏi đề thi
export const removeFixedQuestionAction = async (
    quizId: string,
    questionId: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const res = await fetch(`${EXAM_QUIZ_URL}/quizzes/${quizId}/questions/${questionId}`, {
            method: "DELETE",
            headers: await authHeaders(),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { success: false, error: typeof err?.detail === "string" ? err.detail : "Xóa câu hỏi thất bại." };
        }
        return { success: true };
    } catch (error: any) {
        console.error("❌ removeFixedQuestionAction:", error.message);
        return { success: false, error: error.message || "Lỗi kết nối máy chủ." };
    }
};

// 7.5. 🆕 Cập nhật mốc giây kích hoạt trong video riêng cho 1 câu hỏi đã có trong đề thi
export const updateFixedQuestionTriggerAction = async (
    quizId: string,
    questionId: string,
    videoTriggerSeconds: number
): Promise<{ success: boolean; error?: string }> => {
    try {
        const res = await fetch(`${EXAM_QUIZ_URL}/quizzes/${quizId}/questions/${questionId}`, {
            method: "PATCH",
            headers: await authHeaders(),
            body: JSON.stringify({ video_trigger_seconds: videoTriggerSeconds }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { success: false, error: typeof err?.detail === "string" ? err.detail : "Cập nhật thời gian thất bại." };
        }
        return { success: true };
    } catch (error: any) {
        console.error("❌ updateFixedQuestionTriggerAction:", error.message);
        return { success: false, error: error.message || "Lỗi kết nối máy chủ." };
    }
};

// 8. 🆕 Sắp xếp lại thứ tự câu hỏi cố định (Đã bổ sung Token)
export async function reorderFixedQuestionsAction(quizId: string, orderedIds: string[]) {
    try {
        // 🟢 Chuyển đổi mảng chuỗi ID thành mảng Object [{ question_id, order_index }]
        const payload = orderedIds.map((id, index) => ({
            question_id: id,
            order_index: index + 1, // Thứ tự bắt đầu từ 1
        }));

        const res = await fetch(`${EXAM_QUIZ_URL}/quizzes/${quizId}/questions/reorder`, {
            method: "PATCH",
            headers: await authHeaders(), // 🟢 Sử dụng authHeaders() để tự động gửi Content-Type & Token
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return {
                success: false,
                error: typeof errorData?.detail === "string" ? errorData.detail : JSON.stringify(errorData?.detail)
            };
        }

        return { success: true };
    } catch (error: any) {
        console.error("❌ reorderFixedQuestionsAction:", error.message);
        return { success: false, error: error.message || "Lỗi kết nối máy chủ." };
    }
}

// 9. 🆕 Thêm luật bốc pool ngẫu nhiên
export const addPoolRuleAction = async (
    quizId: string,
    poolId: string,
    quantity: number
): Promise<{ success: boolean; error?: string }> => {
    try {
        const res = await fetch(`${EXAM_QUIZ_URL}/quizzes/${quizId}/pool-rules`, {
            method: "POST",
            headers: await authHeaders(),
            body: JSON.stringify([{ quiz_id: quizId, pool_id: poolId, quantity }]),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { success: false, error: typeof err?.detail === "string" ? err.detail : "Thêm luật pool thất bại." };
        }
        return { success: true };
    } catch (error: any) {
        console.error("❌ addPoolRuleAction:", error.message);
        return { success: false, error: error.message || "Lỗi kết nối máy chủ." };
    }
};

// 10. 🆕 Cập nhật số lượng của 1 luật pool
export const updatePoolRuleAction = async (
    quizId: string,
    ruleId: string,
    quantity: number
): Promise<{ success: boolean; error?: string }> => {
    try {
        const res = await fetch(`${EXAM_QUIZ_URL}/quizzes/${quizId}/pool-rules/${ruleId}`, {
            method: "PATCH",
            headers: await authHeaders(),
            body: JSON.stringify({ quantity }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { success: false, error: typeof err?.detail === "string" ? err.detail : "Cập nhật luật pool thất bại." };
        }
        return { success: true };
    } catch (error: any) {
        console.error("❌ updatePoolRuleAction:", error.message);
        return { success: false, error: error.message || "Lỗi kết nối máy chủ." };
    }
};

// 12. 🆕 Lấy tổng số bài thi (quiz) của 1 môn học — dùng cho trang chọn môn học của Tester
export const getTotalQuizzesBySubjectAction = async (subjectId: string): Promise<number> => {
    try {
        const res = await fetch(`${EXAM_QUIZ_URL}/quizzes/get-total-quizzes/${subjectId}`, {
            method: "GET",
            headers: await authHeaders(),
            cache: "no-store",
        });
        if (!res.ok) return 0;
        const data = await res.json();
        return typeof data === "number" ? data : 0;
    } catch (error) {
        console.error("❌ getTotalQuizzesBySubjectAction:", error);
        return 0;
    }
};