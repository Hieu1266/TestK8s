"use server";

import { cookies } from "next/headers";

export interface ActionResponseList {
  success: boolean;
  message?: string;
  list?: any[];
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
   LẤY DANH SÁCH KHÓA HỌC (ĐANG HỌC hoặc ĐÃ HOÀN THÀNH) CỦA 1 TESTER
   GET /course_enrollment/admin/history/{user_id}/{is_completed}
   ============================================================ */

async function fetchTesterHistory(
  headers: Record<string, string>,
  testerId: string,
  isCompleted: boolean
): Promise<ActionResponseList> {
  try {
    const response = await fetch(
      `${progressBackendUrl}/course_enrollment/admin/history/${testerId}/${isCompleted}`,
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

    if (response.status === 403) {
      return {
        success: false,
        message:
          "Tài khoản của bạn không có quyền xem tiến độ (yêu cầu quyền Admin/Manager).",
      };
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        success: false,
        message: `Không thể tải tiến độ tester: ${
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
    console.error("fetchTesterHistory ERROR:", error);
    return {
      success: false,
      message: error?.message || "Lỗi kết nối mạng",
    };
  }
}

/* ============================================================
   LẤY TRẠNG THÁI TIẾN ĐỘ CỦA 1 TESTER TRONG 1 KHÓA HỌC CỤ THỂ
   ============================================================ */

export type TestingStatus = "IN_PROGRESS" | "REJECTED" | "APPROVED" | null;

export interface TesterCourseStatus {
  enrolled: boolean;
  is_completed: boolean;
  current_overall_progress: number;
  testing_course_status: TestingStatus;
  message?: string;
}

export async function getTesterCourseStatus(
  testerId: string,
  courseId: string
): Promise<{
  success: boolean;
  message?: string;
  data?: TesterCourseStatus;
}> {
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
      fetchTesterHistory(headers, testerId, false),
      fetchTesterHistory(headers, testerId, true),
    ]);

    if (!inProgressRes.success && !completedRes.success) {
      return {
        success: false,
        message:
          inProgressRes.message ||
          completedRes.message ||
          "Không thể tải tiến độ tester",
      };
    }

    const inProgressList = inProgressRes.list || [];
    const completedList = completedRes.list || [];

    const completedMatch = completedList.find(
      (item: any) => String(item.course_id) === String(courseId)
    );

    if (completedMatch) {
      return {
        success: true,
        data: {
          enrolled: true,
          is_completed: true,
          current_overall_progress:
            completedMatch.current_overall_progress ?? 100,
          testing_course_status:
            completedMatch.testing_course_status ?? null,
        },
      };
    }

    const inProgressMatch = inProgressList.find(
      (item: any) => String(item.course_id) === String(courseId)
    );

    if (inProgressMatch) {
      return {
        success: true,
        data: {
          enrolled: true,
          is_completed: false,
          current_overall_progress:
            inProgressMatch.current_overall_progress ?? 0,
          testing_course_status:
            inProgressMatch.testing_course_status ?? null,
        },
      };
    }

    return {
      success: true,
      data: {
        enrolled: false,
        is_completed: false,
        current_overall_progress: 0,
        testing_course_status: null,
      },
    };
  } catch (error: any) {
    console.error("getTesterCourseStatus ERROR:", error);
    return {
      success: false,
      message: error?.message || "Lỗi kết nối mạng",
    };
  }
}

/* ============================================================
   LẤY TIẾN ĐỘ CỦA NHIỀU TESTER CÙNG LÚC (cho 1 khóa học)
   ============================================================ */

export async function getTestersCourseStatusBulk(
  testerIds: string[],
  courseId: string
): Promise<Record<string, TesterCourseStatus>> {
  const results = await Promise.all(
    testerIds.map(async (id) => {
      const res = await getTesterCourseStatus(id, courseId);
      return { id, res };
    })
  );

  const map: Record<string, TesterCourseStatus> = {};

  results.forEach(({ id, res }) => {
    if (res.success && res.data) {
      map[id] = res.data;
    } else {
      map[id] = {
        enrolled: false,
        is_completed: false,
        current_overall_progress: 0,
        testing_course_status: null,
        message: res.message,
      };
    }
  });

  return map;
}