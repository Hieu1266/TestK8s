"use server";

import { cookies } from "next/headers";

export interface ActionResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}
const COURSE_URL = process.env.NEXT_PUBLIC_COURSE_BACKEND_URL;

export type CommentStatus = 'PENDING' | 'RESOLVED';
export type StructurePart = 'COURSE' | 'SUBJECT' | 'MODULE' | 'LESSON';

export interface StructureComment {
  comment_id: string;
  enrollment_id: string;
  tester_id: string;
  structure_part: StructurePart;
  part_id: string;  
  title: string;
  comment: string;
  status: CommentStatus;
}

export interface TeacherStructureComment extends StructureComment {
  tester_username: string;
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
   TẠO NHẬN XÉT CHO 1 SUBJECT/MODULE/LESSON CỤ THỂ
   POST /comment/
   ============================================================ */
export async function createStructureCommentAction(params: {
  courseId: string;
  structurePart: StructurePart;
  partId: string;
  title: string;
  comment: string;
}): Promise<ActionResponse<StructureComment>> {
  try {
    const headers = await getAuthHeaders();
    if (!headers) return { success: false, message: "Không tìm thấy Token đăng nhập!" };
    if (!progressBackendUrl) {
      return { success: false, message: "NEXT_PUBLIC_PROGRESS_BACKEND_URL chưa được cấu hình!" };
    }

    const response = await fetch(`${progressBackendUrl}/comment/`, {
      method: "POST",
      headers,
      cache: "no-store",
      body: JSON.stringify({
        course_id: params.courseId,
        structure_part: params.structurePart,
        part_id: params.partId,
        title: params.title,
        comment: params.comment,
      }),
    });

    if (response.status === 401) {
      return { success: false, message: "Phiên đăng nhập hết hạn hoặc không có quyền!" };
    }
    if (response.status === 403) {
      return { success: false, message: "Bạn không có quyền để lại nhận xét cho khóa học này." };
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      return {
        success: false,
        message: errorBody?.detail || `Không thể tạo nhận xét (${response.status})`,
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    console.error("createStructureCommentAction ERROR:", error);
    return { success: false, message: error?.message || "Lỗi kết nối mạng" };
  }
}

/* ============================================================
   LẤY TOÀN BỘ NHẬN XÉT CỦA TESTER CHO 1 KHÓA HỌC
   GET /comment/my-course/{course_id}
   ============================================================ */
export async function getMyStructureCommentsAction(
  courseId: string
): Promise<ActionResponse<StructureComment[]>> {
  try {
    const headers = await getAuthHeaders();
    if (!headers) return { success: false, message: "Không tìm thấy Token đăng nhập!", data: [] };
    if (!progressBackendUrl) {
      return { success: false, message: "NEXT_PUBLIC_PROGRESS_BACKEND_URL chưa được cấu hình!", data: [] };
    }

    const response = await fetch(`${progressBackendUrl}/comment/my-course/${courseId}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      return {
        success: false,
        message: errorBody?.detail || `Không thể tải danh sách nhận xét (${response.status})`,
        data: [],
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    console.error("getMyStructureCommentsAction ERROR:", error);
    return { success: false, message: error?.message || "Lỗi kết nối mạng", data: [] };
  }
}





/* ============================================================
   SỬA NHẬN XÉT
   PATCH /comment/{comment_id}
   ============================================================ */
export async function updateStructureCommentAction(
  commentId: string,
  params: { title?: string; comment?: string }
): Promise<ActionResponse<StructureComment>> {
  try {
    const headers = await getAuthHeaders();
    if (!headers) return { success: false, message: "Không tìm thấy Token đăng nhập!" };
    if (!progressBackendUrl) {
      return { success: false, message: "NEXT_PUBLIC_PROGRESS_BACKEND_URL chưa được cấu hình!" };
    }

    const response = await fetch(`${progressBackendUrl}/comment/${commentId}`, {
      method: "PATCH",
      headers,
      cache: "no-store",
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      return {
        success: false,
        message: errorBody?.detail || `Không thể cập nhật nhận xét (${response.status})`,
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    console.error("updateStructureCommentAction ERROR:", error);
    return { success: false, message: error?.message || "Lỗi kết nối mạng" };
  }
}

/* ============================================================
   XÓA NHẬN XÉT
   DELETE /comment/{comment_id}
   ============================================================ */
export async function deleteStructureCommentAction(commentId: string): Promise<ActionResponse> {
  try {
    const headers = await getAuthHeaders();
    if (!headers) return { success: false, message: "Không tìm thấy Token đăng nhập!" };
    if (!progressBackendUrl) {
      return { success: false, message: "NEXT_PUBLIC_PROGRESS_BACKEND_URL chưa được cấu hình!" };
    }

    const response = await fetch(`${progressBackendUrl}/comment/${commentId}`, {
      method: "DELETE",
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      return {
        success: false,
        message: errorBody?.detail || `Không thể xóa nhận xét (${response.status})`,
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error("deleteStructureCommentAction ERROR:", error);
    return { success: false, message: error?.message || "Lỗi kết nối mạng" };
  }
}
/* ============================================================
   GIẢNG VIÊN: LẤY TOÀN BỘ NHẬN XÉT CỦA MỌI TESTER THEO KHÓA HỌC
   GET /comment/course/{course_id}
   ============================================================ */
export async function getAllStructureCommentsForCourseAction(
  courseId: string
): Promise<ActionResponse<TeacherStructureComment[]>> {
  try {
    const headers = await getAuthHeaders();
    if (!headers) return { success: false, message: "Không tìm thấy Token đăng nhập!", data: [] };
    if (!progressBackendUrl) {
      return { success: false, message: "NEXT_PUBLIC_PROGRESS_BACKEND_URL chưa được cấu hình!", data: [] };
    }

    const response = await fetch(`${progressBackendUrl}/comment/course/${courseId}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (response.status === 401) {
      return { success: false, message: "Phiên đăng nhập hết hạn hoặc không có quyền!", data: [] };
    }
    if (response.status === 403) {
      return { success: false, message: "Bạn không có quyền xem nhận xét của khóa học này.", data: [] };
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      return {
        success: false,
        message: errorBody?.detail || `Không thể tải nhận xét (${response.status})`,
        data: [],
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    console.error("getAllStructureCommentsForCourseAction ERROR:", error);
    return { success: false, message: error?.message || "Lỗi kết nối mạng", data: [] };
  }
}




/* ============================================================
   GIẢNG VIÊN: CẬP NHẬT TRẠNG THÁI XỬ LÝ NHẬN XÉT
   PATCH /comment/{comment_id}/status
   ============================================================ */
export async function updateStructureCommentStatusAction(
  commentId: string,
  newStatus: CommentStatus
): Promise<ActionResponse<StructureComment>> {
  try {
    const headers = await getAuthHeaders();
    if (!headers) return { success: false, message: "Không tìm thấy Token đăng nhập!" };
    if (!progressBackendUrl) {
      return { success: false, message: "NEXT_PUBLIC_PROGRESS_BACKEND_URL chưa được cấu hình!" };
    }

    const response = await fetch(`${progressBackendUrl}/comment/${commentId}/status`, {
      method: "PATCH",
      headers,
      cache: "no-store",
      body: JSON.stringify({ status: newStatus }),
    });

    if (response.status === 401) {
      return { success: false, message: "Phiên đăng nhập hết hạn hoặc không có quyền!" };
    }
    if (response.status === 403) {
      return { success: false, message: "Bạn không có quyền cập nhật nhận xét này." };
    }
    if (response.status === 404) {
      return { success: false, message: "Không tìm thấy nhận xét." };
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      return {
        success: false,
        message: errorBody?.detail || `Không thể cập nhật trạng thái (${response.status})`,
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    console.error("updateStructureCommentStatusAction ERROR:", error);
    return { success: false, message: error?.message || "Lỗi kết nối mạng" };
  }
}

export async function getAllStructureCommentsForInstructorAction(): Promise<
  ActionResponse<TeacherStructureComment[]>
> {
  try {
    const headers = await getAuthHeaders();
    if (!headers) return { success: false, message: "Không tìm thấy Token đăng nhập!", data: [] };
    if (!progressBackendUrl) {
      return { success: false, message: "NEXT_PUBLIC_PROGRESS_BACKEND_URL chưa được cấu hình!", data: [] };
    }

    const response = await fetch(`${progressBackendUrl}/comment/my-courses`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (response.status === 401) {
      return { success: false, message: "Phiên đăng nhập hết hạn hoặc không có quyền!", data: [] };
    }
    if (response.status === 403) {
      return { success: false, message: "Bạn không có quyền xem nhận xét.", data: [] };
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      return {
        success: false,
        message: errorBody?.detail || `Không thể tải nhận xét (${response.status})`,
        data: [],
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    console.error("getAllStructureCommentsForInstructorAction ERROR:", error);
    return { success: false, message: error?.message || "Lỗi kết nối mạng", data: [] };
  }
}

/* ============================================================
   LẤY DANH SÁCH course_id CỦA GIẢNG VIÊN HIỆN TẠI
   (dùng lại endpoint GET /subjects/instructor-general-info đã có)
   ⚠️ Giả định GeneralInfoInstructorSubject có field course_id trong response.
   Nếu response không có field này, cho mình biết field nào chứa course_id
   (có thể phải sửa lại parse bên dưới).
   ============================================================ */
export async function getInstructorCourseIdsAction(): Promise<ActionResponse<string[]>> {
  try {
    const headers = await getAuthHeaders();
    if (!headers) return { success: false, message: "Không tìm thấy Token đăng nhập!", data: [] };
    if (!COURSE_URL) {
      return { success: false, message: "NEXT_PUBLIC_COURSE_BACKEND_URL chưa được cấu hình!", data: [] };
    }

    const response = await fetch(`${COURSE_URL}/subjects/instructor-general-info`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      return {
        success: false,
        message: errorBody?.detail || `Không thể tải danh sách khóa học (${response.status})`,
        data: [],
      };
    }

    const subjects = await response.json();
    const courseIds: string[] = Array.from(
      new Set(
        (subjects || [])
          .map((s: any) => s.course_id)
          .filter((id: any) => !!id)
      )
    );

    return { success: true, data: courseIds };
  } catch (error: any) {
    console.error("getInstructorCourseIdsAction ERROR:", error);
    return { success: false, message: error?.message || "Lỗi kết nối mạng", data: [] };
  }
}

export interface ModuleBrief {
  module_id: string;
  subject_id: string;
  title?: string;
}

export interface LessonBrief {
  lesson_id: string;
  title?: string;
}

export async function getModuleByIdAction(moduleId: string): Promise<ActionResponse<ModuleBrief>> {
  try {
    const headers = await getAuthHeaders();
    if (!headers) return { success: false, message: "Không tìm thấy Token đăng nhập!" };
    if (!COURSE_URL) return { success: false, message: "NEXT_PUBLIC_COURSE_BACKEND_URL chưa được cấu hình!" };

    const response = await fetch(`${COURSE_URL}/modules/${moduleId}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      return { success: false, message: errorBody?.detail || `Không thể tải module (${response.status})` };
    }
    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, message: error?.message || "Lỗi kết nối mạng" };
  }
}

export async function getModulesBySubjectAction(subjectId: string): Promise<ActionResponse<ModuleBrief[]>> {
  try {
    const headers = await getAuthHeaders();
    if (!headers) return { success: false, message: "Không tìm thấy Token đăng nhập!", data: [] };
    if (!COURSE_URL) return { success: false, message: "NEXT_PUBLIC_COURSE_BACKEND_URL chưa được cấu hình!", data: [] };

    const response = await fetch(`${COURSE_URL}/modules/get-list/${subjectId}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      return { success: false, message: errorBody?.detail || `Không thể tải modules (${response.status})`, data: [] };
    }
    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, message: error?.message || "Lỗi kết nối mạng", data: [] };
  }
}

export async function getLessonsByModuleAction(moduleId: string): Promise<ActionResponse<LessonBrief[]>> {
  try {
    const headers = await getAuthHeaders();
    if (!headers) return { success: false, message: "Không tìm thấy Token đăng nhập!", data: [] };
    if (!COURSE_URL) return { success: false, message: "NEXT_PUBLIC_COURSE_BACKEND_URL chưa được cấu hình!", data: [] };

    const response = await fetch(`${COURSE_URL}/lessons/get-lesson-list/${moduleId}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      return { success: false, message: errorBody?.detail || `Không thể tải lessons (${response.status})`, data: [] };
    }
    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, message: error?.message || "Lỗi kết nối mạng", data: [] };
  }
}

export async function getSubjectsByCourseAction(courseId: string): Promise<ActionResponse<{ subject_id: string }[]>> {
  try {
    const headers = await getAuthHeaders();
    if (!headers) return { success: false, message: "Không tìm thấy Token đăng nhập!", data: [] };
    if (!COURSE_URL) return { success: false, message: "NEXT_PUBLIC_COURSE_BACKEND_URL chưa được cấu hình!", data: [] };

    const response = await fetch(`${COURSE_URL}/subjects/course/${courseId}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      return { success: false, message: errorBody?.detail || `Không thể tải subjects (${response.status})`, data: [] };
    }
    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, message: error?.message || "Lỗi kết nối mạng", data: [] };
  }
}