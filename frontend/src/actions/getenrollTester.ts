"use server";

import { cookies } from "next/headers";

export interface ActionResponse {
  success: boolean;
  message?: string;
  data?: any;
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

/* ============================================================
   GÁN TESTER VÀO KHÓA HỌC (Manager đăng ký hộ cho Tester)
   POST /course_enrollment/create-testing-enrollment/{tester_id}
   ============================================================ */

export async function enrollTesterToCourse(
  testerId: string,
  courseId: string
): Promise<ActionResponse> {
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

    const response = await fetch(
      `${progressBackendUrl}/course_enrollment/create-testing-enrollment/${testerId}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ course_id: courseId }),
        cache: "no-store",
      }
    );

    if (response.status === 401) {
      return {
        success: false,
        message: "Phiên đăng nhập hết hạn hoặc không có quyền!",
      };
    }

    if (response.status === 403) {
      return {
        success: false,
        message:
          "Bạn không có quyền Manager để thực hiện thao tác này.",
      };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);

      return {
        success: false,
        message:
          errorData?.detail ||
          `Gán tester thất bại (mã lỗi ${response.status})`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.error("enrollTesterToCourse ERROR:", error);

    return {
      success: false,
      message: error?.message || "Lỗi kết nối mạng",
    };
  }
}