"use server";

import { cookies } from "next/headers";
import {
    VideoProgress,
    VideoProgressUpdatePayload,
} from "@/types/video";

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

// 1. Lấy (hoặc tự tạo nếu chưa có) video_progress_id thật cho 1 bài học của user hiện tại.
// duration_seconds lấy từ dữ liệu bài học đã có sẵn ở FE (Course Service), vì Progress Service
// không tự biết thời lượng video.
export async function getOrCreateVideoProgressAction(
    lessonId: string,
    durationSeconds: number
): Promise<VideoProgress | null> {
    try {
        const token = await getServerToken();
        const res = await fetch(`${LEARNING_PROGRESS_URL}/video_progress/get-or-create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ lesson_id: lessonId, duration_seconds: durationSeconds }),
            cache: "no-store",
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.detail || "Không thể lấy tiến độ video.");
        }
        return await res.json();
    } catch (error: any) {
        console.error("❌ Lỗi tại getOrCreateVideoProgressAction:", error.message);
        return null;
    }
}

// 2. Đồng bộ tiến độ xem video (gọi từ onProgressUpdate của LessonVideoPlayer)
export async function updateVideoProgressAction(
    videoProgressId: string,
    payload: VideoProgressUpdatePayload
): Promise<{ success: boolean; error?: string }> {
    try {
        const token = await getServerToken();
        const res = await fetch(`${LEARNING_PROGRESS_URL}/video_progress/${videoProgressId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { success: false, error: err?.detail || "Cập nhật tiến độ thất bại." };
        }
        return { success: true };
    } catch (error: any) {
        console.error("❌ Lỗi tại updateVideoProgressAction:", error.message);
        return { success: false, error: error.message || "Lỗi kết nối máy chủ." };
    }
}