"use server";

import { cookies } from "next/headers";

export type TesterCourseItem = {
  course_id: string;
  course_title: string;
  current_overall_progress: number;
  is_completed: boolean;
  is_tested: boolean;
  testing_course_status: "IN_PROGRESS" | "APPROVED" | "REJECTED" | null;
};

// giữ nguyên phần fetch hiện có của bạn, chỉ đảm bảo response map đủ các field trên

export interface ActionResponseList {
  success: boolean;
  message?: string;
  list?: TesterCourseItem[];
}

async function getAuthHeaders(): Promise<Record<string, string> | null> {
  const cookieStore = cookies();
  const resolvedCookies =
    typeof (cookieStore as any).then === "function"
      ? await cookieStore
      : cookieStore;

  const token = (resolvedCookies as any).get("token")?.value;
  if (!token) return null;

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

const progressBackendUrl = process.env.NEXT_PUBLIC_PROGRESS_BACKEND_URL;

async function fetchHistory(
  headers: Record<string, string>,
  isCompleted: boolean
): Promise<ActionResponseList> {
  try {
    const response = await fetch(
      `${progressBackendUrl}/course_enrollment/history/${isCompleted}`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      }
    );

    if (response.status === 401) {
      return {
        success: false,
        message: "Phiên đăng nhập hết hạn hoặc không có quyền!",
      };
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        success: false,
        message: `Không thể tải danh sách khóa học: ${
          errorText || response.status
        }`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      list: Array.isArray(data) ? data : [],
    };
  } catch (error: any) {
    console.error("fetchHistory ERROR:", error);
    return {
      success: false,
      message: error?.message || "Lỗi kết nối mạng",
    };
  }
}

/* ============================================================
   LẤY TẤT CẢ KHÓA HỌC ĐƯỢC GIAO CHO TESTER (đang học + đã xong)
   ============================================================ */

export async function getMyAssignedCourses(): Promise<ActionResponseList> {
  try {
    const headers = await getAuthHeaders();

    if (!headers) {
      return {
        success: false,
        message: "Không tìm thấy Token đăng nhập!",
      };
    }

    if (!progressBackendUrl) {
      return {
        success: false,
        message:
          "NEXT_PUBLIC_PROGRESS_BACKEND_URL chưa được cấu hình!",
      };
    }

    const [inProgressRes, completedRes] = await Promise.all([
      fetchHistory(headers, false),
      fetchHistory(headers, true),
    ]);

    if (!inProgressRes.success && !completedRes.success) {
      return {
        success: false,
        message:
          inProgressRes.message ||
          completedRes.message ||
          "Không thể tải danh sách khóa học",
      };
    }

    const combined = [
      ...(inProgressRes.list || []),
      ...(completedRes.list || []),
    ];

    return {
      success: true,
      list: combined,
    };
  } catch (error: any) {
    console.error("getMyAssignedCourses ERROR:", error);
    return {
      success: false,
      message: error?.message || "Lỗi kết nối mạng",
    };
  }
}