"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LessonResourceItem } from "@/types/lessons";

const COURSE_URL = process.env.NEXT_PUBLIC_COURSE_BACKEND_URL;

export async function getLessonResourcesAction(lessonId: string): Promise<LessonResourceItem[]> {
    // 1. Kiểm tra nếu lessonId chưa hợp lệ thì ngắt ngay, không gọi API
    if (!lessonId || lessonId === 'undefined' || lessonId.trim() === '') {
        return [];
    }

    try {
        const res = await fetch(`${COURSE_URL}/lesson-resources/get-by-lesson/${lessonId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        // 2. Tránh quăng ngoại lệ ra UI nếu Backend trả lỗi status 404
        if (!res.ok) {
            console.warn(`Lỗi API (${res.status}): Không tìm thấy danh sách tài liệu cho lessonId ${lessonId}`);
            return [];
        }

        return await res.json();
    } catch (error) {
        console.error('Lỗi khi tải tài liệu bài học:', error);
        return [];
    }
}
/**
 * Lấy URL tải xuống của một tài nguyên
 */
export async function getLessonResourceDownloadUrl(resourceId: string): Promise<string> {
    return `${COURSE_URL}/lesson-resources/download/${resourceId}`;
}