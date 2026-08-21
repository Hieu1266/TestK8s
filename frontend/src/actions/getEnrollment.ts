"use server";

import { GeneralUserEnrollmentInfo, CourseInProgress } from "@/types/enrollment";
import { cookies } from "next/headers";

async function getAuthHeaders(): Promise<Record<string, string> | null> {
    const cookieStore = cookies();
    const resolvedCookies = typeof (cookieStore as any).then === "function"
        ? await cookieStore
        : cookieStore;

    const token = (resolvedCookies as any).get("token")?.value;

    // 🌟 SỬA: Nếu không có token, trả về null để báo hiệu không đủ điều kiện gọi API
    if (!token) return null;

    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
    };
}

// 1. Lấy thông số thống kê số lượng
export async function fetchUserStatistics(): Promise<GeneralUserEnrollmentInfo> {
    const headers = await getAuthHeaders();

    if (!headers) {
        console.warn("fetchUserStatistics: Không tìm thấy token, hủy request.");
        return { inprogress_courses: 0, completed_courses: 0, certificate: 0 };
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_PROGRESS_BACKEND_URL}/course_enrollment/statistics/me`, {
        headers: headers,
        cache: "no-store",
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error("Lỗi fetchUserStatistics từ Backend:", errText);
        throw new Error(`Không thể tải thông tin thống kê. Mã lỗi: ${res.status}`);
    }
    return res.json();
}

export async function fetchInprogressCourses(): Promise<CourseInProgress[]> {
    const headers = await getAuthHeaders();

    if (!headers) {
        console.warn("fetchInprogressCourses: Không tìm thấy token, hủy request.");
        return [];
    }
    const res = await fetch(`${process.env.NEXT_PUBLIC_PROGRESS_BACKEND_URL}/course_enrollment/history/false`, {
        headers: headers,
        cache: "no-store",
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error("Lỗi fetchInprogressCourses từ Backend:", errText);
        throw new Error(`Không thể tải danh sách khóa học đang học. Mã lỗi: ${res.status}`);
    }
    return res.json();
}

// 3. 🌟 SỬA: Lấy danh sách khóa học đã hoàn thành sử dụng endpoint /history/true
export async function fetchCompletedCourses(): Promise<CourseInProgress[]> {
    const headers = await getAuthHeaders();

    if (!headers) {
        console.warn("fetchCompletedCourses: Không tìm thấy token, hủy request.");
        return [];
    }

    // Backend route: /history/{is_completed} -> Đã hoàn thành tương ứng với true
    const res = await fetch(`${process.env.NEXT_PUBLIC_PROGRESS_BACKEND_URL}/course_enrollment/history/true`, {
        headers: headers,
        cache: "no-store",
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error("Lỗi fetchCompletedCourses từ Backend:", errText);
        throw new Error(`Không thể tải danh sách khóa học đã hoàn thành. Mã lỗi: ${res.status}`);
    }
    return res.json();
}

