"use server";

import {
    ModuleData,
    CreateModuleInput,
    ModuleUpdatePayload,
} from "@/types/modules";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_COURSE_BACKEND_URL || "http://localhost:8000/api/v1";

// 🔑 Helper lấy Access Token từ Cookie
async function getServerToken(): Promise<string> {
    const cookieStore = await cookies();
    const tokenObj = cookieStore.get("token");
    const token = tokenObj ? tokenObj.value : "";

    if (!token || token === "undefined" || token === "null") {
        throw new Error(
            "Không tìm thấy mã xác thực Access Token trên hệ thống. Vui lòng đăng nhập lại!"
        );
    }
    return token.trim().replace(/^"|"$/g, "");
}

// 🔵 1. Lấy danh sách Modules kèm số lượng lesson theo Subject ID
export async function getModulesAction(subjectId: string): Promise<ModuleData[]> {
    const token = await getServerToken();

    // Khớp với Endpoint @router.get("/get-list/{subject_id}") của FastAPI
    const url = `${API_BASE_URL}/modules/get-list/${subjectId}`;

    const res = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
    });

    if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.detail || "Không thể tải danh sách Module");
    }

    return res.json();
}

// 🟢 2. Tạo mới Module
export async function createModuleAction(
    payload: CreateModuleInput,
    pathForRevalidation?: string
): Promise<ModuleData> {
    const token = await getServerToken();

    const res = await fetch(`${API_BASE_URL}/modules/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.detail || "Lỗi khi tạo Module mới");
    }

    if (pathForRevalidation) {
        revalidatePath(pathForRevalidation);
    }

    return res.json();
}

// 🟠 3. Cập nhật Module
export async function updateModuleAction(
    moduleId: string,
    payload: ModuleUpdatePayload,
    pathForRevalidation?: string
): Promise<ModuleData> {
    const token = await getServerToken();

    const res = await fetch(`${API_BASE_URL}/modules/${moduleId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.detail || "Lỗi khi cập nhật Module");
    }

    if (pathForRevalidation) {
        revalidatePath(pathForRevalidation);
    }

    return res.json();
}

// 🔴 4. Xóa Module
export async function deleteModuleAction(
    moduleId: string,
    pathForRevalidation?: string
): Promise<{ msg: string }> {
    const token = await getServerToken();

    const res = await fetch(`${API_BASE_URL}/modules/${moduleId}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.detail || "Lỗi khi xóa Module");
    }

    if (pathForRevalidation) {
        revalidatePath(pathForRevalidation);
    }

    return res.json();
}