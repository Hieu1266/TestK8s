"use server";
import { cookies } from "next/headers";
import { CourseCollaborator } from "@/types/collaborator";

const COURSE_BACKEND_URL = process.env.NEXT_PUBLIC_COURSE_BACKEND_URL;

async function getServerToken() {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value || "";
    return token.trim().replace(/^"|"$/g, "");
}

function parseErrorMessage(errorData: any, fallback: string) {
    if (typeof errorData?.detail === "string") return errorData.detail;
    if (Array.isArray(errorData?.detail)) {
        return errorData.detail.map((e: any) => e.msg || JSON.stringify(e)).join(" | ");
    }
    return fallback;
}

// 1. Lấy danh sách cộng tác viên đã được phân công cho môn học
export async function getSubjectCollaboratorsAction(
    subjectId: string
): Promise<CourseCollaborator[]> {
    try {
        const token = await getServerToken();
        if (!token) throw new Error("Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn!");

        const res = await fetch(`${COURSE_BACKEND_URL}/course-collab-link/subject/${subjectId}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            cache: "no-store",
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(
                parseErrorMessage(errorData, `Lỗi Server (${res.status}): Không thể tải danh sách cộng tác viên`)
            );
        }

        return await res.json();
    } catch (error: any) {
        throw new Error(error.message || "Lỗi kết nối Server Action [getSubjectCollaboratorsAction]");
    }
}

// 2. Thêm cộng tác viên (Tester) vào môn học
export async function addSubjectCollaboratorAction(
    subjectId: string,
    collaboratorId: string
): Promise<CourseCollaborator> {
    try {
        const token = await getServerToken();
        if (!token) throw new Error("Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn!");

        const res = await fetch(`${COURSE_BACKEND_URL}/course-collab-link/`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ subject_id: subjectId, collaborator_id: collaboratorId }),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(
                parseErrorMessage(errorData, `Lỗi Server (${res.status}): Không thể thêm cộng tác viên`)
            );
        }

        return await res.json();
    } catch (error: any) {
        throw new Error(error.message || "Lỗi kết nối Server Action [addSubjectCollaboratorAction]");
    }
}

// 3. Xóa cộng tác viên khỏi môn học
export async function removeSubjectCollaboratorAction(
    subjectId: string,
    collaboratorId: string
): Promise<void> {
    try {
        const token = await getServerToken();
        if (!token) throw new Error("Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn!");

        const res = await fetch(`${COURSE_BACKEND_URL}/course-collab-link/`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ subject_id: subjectId, collaborator_id: collaboratorId }),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(
                parseErrorMessage(errorData, `Lỗi Server (${res.status}): Không thể xóa cộng tác viên`)
            );
        }
    } catch (error: any) {
        throw new Error(error.message || "Lỗi kết nối Server Action [removeSubjectCollaboratorAction]");
    }
}