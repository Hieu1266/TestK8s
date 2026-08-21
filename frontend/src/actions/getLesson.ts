"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LessonStatus } from "@/types/statuses";
import {
    LessonManagement,
    LessonCreatePayload,
    LessonUpdatePayload,
    LessonResource,
    LessonShort
} from "@/types/lessons";


const LEARNING_PROGRESS_URL = process.env.NEXT_PUBLIC_PROGRESS_BACKEND_URL;
const COURSE_URL = process.env.NEXT_PUBLIC_COURSE_BACKEND_URL;

async function getServerToken(): Promise<string> {
    const cookieStore = await cookies();
    const tokenObj = cookieStore.get("token");
    const token = tokenObj ? tokenObj.value : "";

    if (!token || token === 'undefined' || token === 'null') {
        return "";
    }
    return token.trim().replace(/^"|"$/g, "");
}

export async function fetchLessonStatus(lessonId: string): Promise<LessonStatus> {
    if (!lessonId) return LessonStatus.LOCKED;

    try {
        const token = await getServerToken();
        const baseUrl = LEARNING_PROGRESS_URL || "http://localhost:8000";

        const response = await fetch(`${baseUrl}/lesson_progress/get-status/${lessonId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            cache: "no-store",
        });

        if (!response.ok) return LessonStatus.LOCKED;

        const data = await response.json();
        const rawStatus = String(typeof data === "object" ? data?.status : data).toUpperCase().trim();

        if (rawStatus === "COMPLETED") return LessonStatus.COMPLETED;

        // Ánh xạ cả UNLOCKED và IN_PROGRESS của Backend về IN_PROGRESS của Frontend
        if (rawStatus === "UNLOCKED" || rawStatus === "IN_PROGRESS") {
            return LessonStatus.IN_PROGRESS;
        }

        return LessonStatus.LOCKED;
    } catch (error) {
        console.error(`Lỗi fetchLessonStatus cho ${lessonId}:`, error);
        return LessonStatus.LOCKED;
    }
}
/**
 * Đính kèm status vào danh sách bài học
 */
export async function attachStatusToLessons<T extends { lesson_id?: string; lessonId?: string }>(
    lessons: T[]
): Promise<(T & { status: LessonStatus })[]> {
    if (!lessons || !Array.isArray(lessons)) return [];

    const lessonsWithStatus = await Promise.all(
        lessons.map(async (lesson) => {
            // Ưu tiên lấy lesson_id từ schema LessonLearningStructure
            const targetId = lesson.lesson_id || lesson.lessonId;

            if (!targetId) {
                return { ...lesson, status: LessonStatus.LOCKED };
            }

            const status = await fetchLessonStatus(targetId);
            return {
                ...lesson,
                status: status,
            };
        })
    );

    return lessonsWithStatus;
}
export async function completeLessonAction(progressId: string) {
    try {
        const token = await getServerToken()

        const response = await fetch(
            `${process.env.NEXT_PUBLIC_PROGRESS_BACKEND_URL}/lesson_progress/lesson/${progressId}/complete`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.detail || 'Không thể đánh dấu hoàn thành bài học.',
            };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Lỗi kết nối tới hệ thống.',
        };
    }
}

export async function getLessonListAction(moduleId: string): Promise<LessonManagement[]> {
    try {
        const token = await getServerToken();
        const res = await fetch(`${COURSE_URL}/lessons/get-lesson-list/${moduleId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.detail || "Không thể tải danh sách bài học.");
        }
        return await res.json();
    } catch (error: any) {
        console.error("❌ Lỗi tại getLessonListAction:", error.message);
        return [];
    }
}

// 2. Tạo bài học mới
export async function createLessonAction(
    payload: LessonCreatePayload,
    pathForRevalidation?: string
): Promise<{ success: boolean; data?: LessonManagement; error?: string }> {
    try {
        const token = await getServerToken();
        const res = await fetch(`${COURSE_URL}/lessons/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const detail = typeof err?.detail === "string" ? err.detail : "Tạo bài học thất bại.";
            return { success: false, error: detail };
        }

        const data = await res.json();
        if (pathForRevalidation) revalidatePath(pathForRevalidation);
        return { success: true, data };
    } catch (error: any) {
        console.error("❌ Lỗi tại createLessonAction:", error.message);
        return { success: false, error: error.message || "Lỗi kết nối máy chủ." };
    }
}

// 3. Cập nhật bài học
// ⚠️ Backend không cho phép đổi is_quiz sau khi tạo (schema LessonUpdate không có field này).
export async function updateLessonAction(
    lessonId: string,
    payload: LessonUpdatePayload,
    pathForRevalidation?: string
): Promise<{ success: boolean; data?: LessonManagement; error?: string }> {
    try {
        const token = await getServerToken();
        const res = await fetch(`${COURSE_URL}/lessons/${lessonId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const detail = typeof err?.detail === "string" ? err.detail : "Cập nhật bài học thất bại.";
            return { success: false, error: detail };
        }

        const data = await res.json();
        if (pathForRevalidation) revalidatePath(pathForRevalidation);
        return { success: true, data };
    } catch (error: any) {
        console.error("❌ Lỗi tại updateLessonAction:", error.message);
        return { success: false, error: error.message || "Lỗi kết nối máy chủ." };
    }
}

// 4. Xóa bài học
export async function deleteLessonAction(
    lessonId: string,
    pathForRevalidation?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const token = await getServerToken();
        const res = await fetch(`${COURSE_URL}/lessons/${lessonId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!res.ok && res.status !== 204) {
            const err = await res.json().catch(() => ({}));
            const detail = typeof err?.detail === "string" ? err.detail : "Xóa bài học thất bại.";
            return { success: false, error: detail };
        }

        if (pathForRevalidation) revalidatePath(pathForRevalidation);
        return { success: true };
    } catch (error: any) {
        console.error("❌ Lỗi tại deleteLessonAction:", error.message);
        return { success: false, error: error.message || "Lỗi kết nối máy chủ." };
    }
}

// 5. Upload tài nguyên (file) cho bài học - nhận FormData chứa field "file" (từ Client Component)
export async function uploadLessonResourceAction(
    lessonId: string,
    formData: FormData
): Promise<{ success: boolean; data?: LessonResource; error?: string }> {
    try {
        const token = await getServerToken();
        if (!formData.has("lesson_id")) {
            formData.append("lesson_id", lessonId);
        }

        const res = await fetch(`${COURSE_URL}/lesson-resources/`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                // KHÔNG tự set Content-Type cho multipart/form-data -> để fetch tự sinh boundary
            },
            body: formData,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const detail = typeof err?.detail === "string" ? err.detail : "Tải file thất bại.";
            return { success: false, error: detail };
        }

        const data = await res.json();
        return { success: true, data };
    } catch (error: any) {
        console.error("❌ Lỗi tại uploadLessonResourceAction:", error.message);
        return { success: false, error: error.message || "Lỗi kết nối máy chủ." };
    }
}

// 6. Xóa tài nguyên (file) của bài học
export async function deleteLessonResourceAction(
    resourceId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const token = await getServerToken();
        const res = await fetch(`${COURSE_URL}/lesson-resources/${resourceId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!res.ok && res.status !== 204) {
            const err = await res.json().catch(() => ({}));
            const detail = typeof err?.detail === "string" ? err.detail : "Xóa tài nguyên thất bại.";
            return { success: false, error: detail };
        }
        return { success: true };
    } catch (error: any) {
        console.error("❌ Lỗi tại deleteLessonResourceAction:", error.message);
        return { success: false, error: error.message || "Lỗi kết nối máy chủ." };
    }
}

export async function getLessonsBySubjectAction(
    subjectId: string,
    filterType?: string
): Promise<LessonShort[]> {
    try {
        const baseUrl = COURSE_URL
        // 🟢 Luôn đính kèm ?filter_type= nếu filterType có giá trị (bao gồm cả STANDALONE_LESSON)
        const query = filterType ? `?filter_type=${encodeURIComponent(filterType)}` : "";

        const endpoint = `${baseUrl}/lessons/subject/${subjectId}${query}`;

        const response = await fetch(endpoint, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            cache: "no-store",
        });

        if (!response.ok) {
            console.error(`Lỗi API Backend [Status ${response.status}]:`, await response.text());
            return [];
        }

        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Exception tại getLessonsBySubjectAction:", error);
        return [];
    }
}