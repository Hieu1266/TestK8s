"use server"
import { InstructorStatistics, Subject } from "@/types/statistic";
import { cookies } from "next/headers";


const COURSE_URL = process.env.NEXT_PUBLIC_COURSE_BACKEND_URL;
async function getAuthHeaders() {
    const cookieStore = cookies();
    const resolvedCookies = typeof (cookieStore as any).then === "function"
        ? await cookieStore
        : cookieStore;

    const token = (resolvedCookies as any).get("token")?.value;

    if (!token) return null;
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
    };
}

export async function fetchInstructorStatistics(): Promise<InstructorStatistics> {
    const headers = await getAuthHeaders();

    if (!headers) {
        throw new Error("Không tìm thấy token xác thực. Vui lòng đăng nhập lại.");
    }

    // URL đã thay đổi: không cần cộng chuỗi ID phía sau nữa
    const response = await fetch(`${COURSE_URL}/subjects/instructor/statistic`, {
        method: "GET",
        headers: headers,
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error("Không thể kết nối API thống kê giảng viên.");
    }

    return response.json();
}