"use server";

import { cookies } from "next/headers";
import {
    UserLessonNote,
    NoteCreatePayload,
    NoteUpdatePayload,
} from "@/types/progresses";

const LEARNING_PROGRESS_URL = process.env.NEXT_PUBLIC_PROGRESS_BACKEND_URL;

async function getServerToken(): Promise<string> {
    const cookieStore = await cookies();
    const tokenObj = cookieStore.get("token");
    const token = tokenObj ? tokenObj.value : "";
    if (!token || token === "undefined" || token === "null") {
        throw new Error("Không tìm thấy mã xác thực Access Token trên hệ thống. Vui lòng đăng nhập lại!");
    }
    return token.trim().replace(/^"|"$/g, "");
}

// 1. Lấy danh sách ghi chú của 1 bài học
export async function getLessonNotesAction(lessonId: string): Promise<UserLessonNote[]> {
    try {
        const token = await getServerToken();
        const res = await fetch(`${LEARNING_PROGRESS_URL}/note/get-lesson-notes/${lessonId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.detail || "Không thể tải danh sách ghi chú.");
        }
        return await res.json();
    } catch (error: any) {
        console.error("❌ Lỗi tại getLessonNotesAction:", error.message);
        return [];
    }
}

// 2. Tạo ghi chú mới
export async function createNoteAction(
    payload: NoteCreatePayload
): Promise<{ success: boolean; data?: UserLessonNote; error?: string }> {
    try {
        const token = await getServerToken();
        const res = await fetch(`${LEARNING_PROGRESS_URL}/note/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const detail = typeof err?.detail === "string" ? err.detail : "Tạo ghi chú thất bại.";
            return { success: false, error: detail };
        }

        const data: UserLessonNote = await res.json();
        return { success: true, data };
    } catch (error: any) {
        console.error("❌ Lỗi tại createNoteAction:", error.message);
        return { success: false, error: error.message || "Lỗi kết nối máy chủ." };
    }
}

// 3. Cập nhật ghi chú
// Backend chỉ trả {success, message}, KHÔNG trả object đã cập nhật
// -> FE tự merge dữ liệu vừa gửi vào state cục bộ sau khi gọi thành công (xem LessonNotesPanel.tsx)
export async function updateNoteAction(
    noteId: string,
    payload: NoteUpdatePayload
): Promise<{ success: boolean; error?: string }> {
    try {
        const token = await getServerToken();
        const res = await fetch(`${LEARNING_PROGRESS_URL}/note/${noteId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const detail = typeof err?.detail === "string" ? err.detail : "Cập nhật ghi chú thất bại.";
            return { success: false, error: detail };
        }
        return { success: true };
    } catch (error: any) {
        console.error("❌ Lỗi tại updateNoteAction:", error.message);
        return { success: false, error: error.message || "Lỗi kết nối máy chủ." };
    }
}

// 4. Xóa ghi chú
export async function deleteNoteAction(
    noteId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const token = await getServerToken();
        const res = await fetch(`${LEARNING_PROGRESS_URL}/note/${noteId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const detail = typeof err?.detail === "string" ? err.detail : "Xóa ghi chú thất bại.";
            return { success: false, error: detail };
        }
        return { success: true };
    } catch (error: any) {
        console.error("❌ Lỗi tại deleteNoteAction:", error.message);
        return { success: false, error: error.message || "Lỗi kết nối máy chủ." };
    }
}