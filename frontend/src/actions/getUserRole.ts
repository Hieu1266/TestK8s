"use server";
import { cookies } from "next/headers";

export interface ActionResponseList {
  success: boolean;
  message?: string;
  list?: any[];
}

export interface ActionResponseStats {
  success: boolean;
  message?: string;
  data?: {
    inprogress_courses: number;
    completed_courses: number;
    certificate: number;
  };
}

async function getAuthHeaders(): Promise<Record<string, string> | null> {
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

const courseBackendUrl = process.env.NEXT_PUBLIC_COURSE_BACKEND_URL;
const progressBackendUrl = process.env.NEXT_PUBLIC_PROGRESS_BACKEND_URL;

/**
 * 🆕 DÀNH RIÊNG CHO MANAGER (role_id = 5) — khóa học họ đã TẠO.
 * Quan hệ thực tế: Manager -> Curriculum (assigner_id) -> Course (curriculum_id)
 * KHÔNG dùng Course.instructor_id (field này lưu người tạo Course, khác Manager).
 * Gộp dữ liệu từ 2 API có sẵn: GET /curriculums/ và GET /courses/ (KHÔNG đổi backend)
 */
export async function getCoursesByInstructor(managerId: string): Promise<ActionResponseList> {
  try {
    const headers = await getAuthHeaders();
    if (!headers) return { success: false, message: "Không tìm thấy Token đăng nhập!" };

    // 1. Lấy toàn bộ Curriculum -> lọc theo assigner_id (= Manager) -> lấy curriculum_id
    const currRes = await fetch(`${courseBackendUrl}/curriculums/?skip=0&limit=1000`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (currRes.status === 401) {
      return { success: false, message: "Phiên đăng nhập hết hạn hoặc không có quyền!" };
    }
    if (!currRes.ok) {
      const errText = await currRes.text().catch(() => "");
      return { success: false, message: `Không thể tải danh sách chương trình đào tạo: ${errText || currRes.status}` };
    }

    const curriculums: any[] = await currRes.json();
    const myCurriculumIds = new Set(
      curriculums
        .filter((c) => c.assigner_id === managerId)
        .map((c) => c.curriculum_id)
    );

    if (myCurriculumIds.size === 0) {
      return { success: true, list: [] };
    }

    // 2. Lấy toàn bộ Course -> lọc course có curriculum_id thuộc tập trên
    const courseRes = await fetch(`${courseBackendUrl}/courses/?skip=0&limit=1000`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (courseRes.status === 401) {
      return { success: false, message: "Phiên đăng nhập hết hạn hoặc không có quyền!" };
    }
    if (!courseRes.ok) {
      const errText = await courseRes.text().catch(() => "");
      return { success: false, message: `Không thể tải danh sách khóa học: ${errText || courseRes.status}` };
    }

    const allCourses: any[] = await courseRes.json();
    const myCourses = allCourses.filter(
      (c) => c.curriculum_id && myCurriculumIds.has(c.curriculum_id)
    );

    return { success: true, list: myCourses };
  } catch (error: any) {
    return { success: false, message: error.message || "Lỗi kết nối mạng" };
  }
}

/**
 * DÀNH RIÊNG CHO GIẢNG VIÊN (role_id = 4) — môn học được phân công
 * (quan hệ lưu ở Syllabus.instructor_id, khác hoàn toàn với Course.instructor_id).
 * GET /subjects/admin/instructor/{instructor_id}
 */
export async function getSubjectsByInstructorAdmin(instructorId: string): Promise<ActionResponseList> {
  try {
    const headers = await getAuthHeaders();
    if (!headers) return { success: false, message: "Không tìm thấy Token đăng nhập!" };

    const res = await fetch(`${courseBackendUrl}/subjects/admin/instructor/${instructorId}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (res.status === 401) {
      return { success: false, message: "Phiên đăng nhập hết hạn hoặc không có quyền Admin!" };
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { success: false, message: `Không thể tải danh sách môn học: ${errText || res.status}` };
    }

    const data = await res.json();
    return { success: true, list: data };
  } catch (error: any) {
    return { success: false, message: error.message || "Lỗi kết nối mạng" };
  }
}

/**
 * Danh sách khóa học đang học (isCompleted=false) hoặc đã hoàn thành
 * (isCompleted=true) của MỘT học viên bất kỳ — dùng cho Admin xem.
 * GET /course_enrollment/admin/history/{user_id}/{is_completed}
 */
export async function getStudentCoursesByStatus(
  userId: string,
  isCompleted: boolean
): Promise<ActionResponseList> {
  try {
    const headers = await getAuthHeaders();
    if (!headers) return { success: false, message: "Không tìm thấy Token đăng nhập!" };

    const res = await fetch(
      `${progressBackendUrl}/course_enrollment/admin/history/${userId}/${isCompleted}`,
      { method: "GET", headers, cache: "no-store" }
    );

    if (res.status === 401) {
      return { success: false, message: "Phiên đăng nhập hết hạn hoặc không có quyền Admin!" };
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { success: false, message: `Không thể tải dữ liệu học tập: ${errText || res.status}` };
    }

    const data = await res.json();
    return { success: true, list: data };
  } catch (error: any) {
    return { success: false, message: error.message || "Lỗi kết nối mạng" };
  }
}

/**
 * Thống kê tổng quan (đang học / hoàn thành / chứng chỉ) của một
 * học viên bất kỳ — dùng cho Admin xem.
 * GET /course_enrollment/admin/statistics/{user_id}
 */
export async function getStudentStatistics(userId: string): Promise<ActionResponseStats> {
  try {
    const headers = await getAuthHeaders();
    if (!headers) return { success: false, message: "Không tìm thấy Token đăng nhập!" };

    const res = await fetch(`${progressBackendUrl}/course_enrollment/admin/statistics/${userId}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (res.status === 401) {
      return { success: false, message: "Phiên đăng nhập hết hạn hoặc không có quyền Admin!" };
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { success: false, message: `Không thể tải thống kê: ${errText || res.status}` };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, message: error.message || "Lỗi kết nối mạng" };
  }
}