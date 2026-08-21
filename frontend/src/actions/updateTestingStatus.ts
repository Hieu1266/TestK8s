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
   MANAGER/ADMIN DUYỆT KẾT QUẢ KIỂM THỬ CỦA TESTER
   PUT /course_enrollment/admin/testing-status/{tester_id}/{course_id}
   ============================================================ */

export async function updateTesterTestingStatus(
  testerId: string,
  courseId: string,
  status: "APPROVED" | "REJECTED" | "IN_PROGRESS"
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
      `${progressBackendUrl}/course_enrollment/admin/testing-status/${testerId}/${courseId}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({ testing_course_status: status }),
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
        message: "Bạn không có quyền duyệt kết quả kiểm thử.",
      };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return {
        success: false,
        message:
          errorData?.detail ||
          `Cập nhật trạng thái thất bại (mã lỗi ${response.status})`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.error("updateTesterTestingStatus ERROR:", error);
    return {
      success: false,
      message: error?.message || "Lỗi kết nối mạng",
    };
  }
}