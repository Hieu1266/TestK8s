"use server";

import { cookies } from "next/headers";

export interface ActionResponse {
  success: boolean;
  message?: string;
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

export async function submitCourseTestResult(params: {
  courseId: string;
  status: "APPROVED" | "REJECTED";
  reason?: string;
}): Promise<ActionResponse> {
  try {
    const headers = await getAuthHeaders();

    if (!headers) {
      return { success: false, message: "Không tìm thấy Token đăng nhập!" };
    }

    if (!progressBackendUrl) {
      return {
        success: false,
        message: "NEXT_PUBLIC_PROGRESS_BACKEND_URL chưa được cấu hình!",
      };
    }

    const response = await fetch(
      `${progressBackendUrl}/course_enrollment/testing-status/${params.courseId}`,
      {
        method: "PUT",
        headers,
        cache: "no-store",
        body: JSON.stringify({
          testing_course_status: params.status,
          reason: params.reason,
        }),
      }
    );

    if (response.status === 401) {
      return {
        success: false,
        message: "Phiên đăng nhập hết hạn hoặc không có quyền!",
      };
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      return {
        success: false,
        message: errorBody?.detail || `Không thể lưu kết quả kiểm thử (${response.status})`,
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error("submitCourseTestResult ERROR:", error);
    return {
      success: false,
      message: error?.message || "Lỗi kết nối mạng",
    };
  }
}