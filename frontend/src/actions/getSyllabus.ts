'use server'
import { SyllabusUpdatePayload, SyllabusData, UploadSyllabusResponse } from '@/types/syllabus';

import { cookies } from 'next/headers'

const userBackendUrl = process.env.NEXT_PUBLIC_COURSE_BACKEND_URL;

// --- TYPES ---
export interface Subject {
  subject_id: string;
  course_id: string;
  title: string;
  description?: string;
  status_id?: string;
  subject_name?: string;
  order_index?: number;
}

export interface Course {
  course_id: string;
  title: string;
  description?: string;
  status_id?: string;
  instructor_id?: string | null;
  curriculum_id: string;
  curriculum_file_path?: string | null;
  subjects: Subject[];
}

// --- HELPER: LẤY TOKEN TỪ COOKIES ---
async function getTokenFromCookie(): Promise<string> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get("token")?.value || "";
  return rawToken.trim().replace(/^"|"$/g, "");
}

// --- HELPER: LẤY USER_ID TỪ TOKEN (NGƯỜI TẠO / PHÂN CÔNG) ---
async function getUserIdFromToken(): Promise<string | null> {
  const token = await getTokenFromCookie();
  if (!token) return null;
  try {
    const payloadBase64 = token.split(".")[1];
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const decodedPayload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
    return decodedPayload.user_id || decodedPayload.sub || null;
  } catch (e) {
    console.error("Không thể giải mã token:", e);
    return null;
  }
}

async function getAuthHeaders(additionalHeaders: Record<string, string> = {}) {
  const token = await getTokenFromCookie();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...additionalHeaders,
  };
}

// 1. Khóa học
export async function getCoursesAction(): Promise<Course[]> {
  try {
    const token = await getTokenFromCookie();
    const response = await fetch(`${userBackendUrl}/courses/`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json"
      },
    });

    if (!response.ok) {
      throw new Error(`Không thể lấy danh sách khóa học: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Lỗi getCoursesAction:", error);
    return [];
  }
}

// 2. Lấy danh sách Môn học theo Course ID
export async function getSubjectsByCourseAction(courseId: string): Promise<Subject[]> {
  try {
    const token = await getTokenFromCookie();
    const response = await fetch(`${userBackendUrl}/subjects/course/${courseId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json"
      },
    });

    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error("Lỗi getSubjectsByCourseAction:", error);
    return [];
  }
}

// 3. Lấy tất cả Môn học
export async function getSubjectsAction(): Promise<Subject[]> {
  try {
    const token = await getTokenFromCookie();
    const response = await fetch(`${userBackendUrl}/subjects/`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json"
      },
    });

    if (!response.ok) {
      throw new Error(`Không thể lấy danh sách học phần: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Lỗi getSubjectsAction:", error);
    return [];
  }
}

// 4. Tạo Môn học
export async function createSubjectAction(payload: { course_id: string; title: string; description: string; order_index?: number }) {
  try {
    const token = await getTokenFromCookie();
    const response = await fetch(`${userBackendUrl}/subjects/`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Không thể tạo môn học");
    }
    return data;
  } catch (error: any) {
    throw new Error(error.message || "Lỗi tạo môn học");
  }
}

// 5. Lấy Đề cương (Syllabus) theo Subject
export async function getSyllabusBySubjectAction(subjectId: string) {
  try {
    const baseUrl = userBackendUrl || "";
    const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}/syllabus/subject/${subjectId}`;

    const token = await getTokenFromCookie();

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      }
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("❌ Lỗi kết nối API Syllabus:", error);
    return null;
  }
}

// 🟢 6. TẠO ĐỀ CƯƠNG (SYLLABUS) - ĐÃ SỬA CHUẨN ĐỂ GÁN GIẢNG VIÊN VÀ NGƯỜI PHÂN CÔNG
export async function createSyllabusAction(payload: {
  subject_id: string;
  description: string;
  syllabus_file_path?: string | null;
  instructor_id?: string | null;
  status_id?: string;
}) {
  try {
    const baseUrl = userBackendUrl || "";
    const url = `${baseUrl.replace(/\/$/, "")}/syllabus/`;

    const token = await getTokenFromCookie();
    const currentUserId = await getUserIdFromToken();

    const finalPayload = {
      subject_id: payload.subject_id,
      description: payload.description || "Chưa có mô tả",
      instructor_id: payload.instructor_id || null,
      assigner_id: currentUserId,
      syllabus_file_path: payload.syllabus_file_path || "documents/syllabi/placeholder.pdf",
      status_id: payload.status_id || "SYLLABUS_DRAFT"
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify(finalPayload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(typeof data.detail === "string" ? data.detail : "Không thể tạo đề cương");
    }

    return data;
  } catch (error: any) {
    throw new Error(error.message || "Lỗi kết nối đến máy chủ.");
  }
}

// 8. Upload File
export async function uploadFileAction(formData: FormData) {
  const userBackendUrl = process.env.NEXT_PUBLIC_COURSE_BACKEND_URL || "http://localhost:8000";
  const token = await getTokenFromCookie();

  const endpoint = `${userBackendUrl.replace(/\/$/, "")}/syllabus/upload`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    },
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail || `Lỗi khi upload file (${res.status})`);
  }

  return data;
}

export interface InstructorUser {
  user_id: string | number;
  username: string;
  email: string;
  role?: string;
}

export async function getInstructorsAction(): Promise<InstructorUser[]> {
  try {
    const userBackendUrl = process.env.NEXT_PUBLIC_USER_BACKEND_URL;
    const token = await getTokenFromCookie();

    const skip = 0;
    const limit = 100;
    const roleId = 4;
    const statusId = "ACTIVE";

    const url = `${userBackendUrl}/get-instructor-list?skip=${skip}&limit=${limit}&status_id=${statusId}&role_id=${roleId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Lỗi HTTP khi lấy giảng viên:", response.status);
      return [];
    }

    const resData = await response.json();

    let rawList = [];
    if (Array.isArray(resData)) {
      rawList = resData;
    } else if (resData && Array.isArray(resData.data)) {
      rawList = resData.data;
    } else if (resData && Array.isArray(resData.list)) {
      rawList = resData.list;
    }

    return rawList.map((user: any) => ({
      user_id: user.user_id,
      username: user.username || "Chưa có tên",
      email: user.email || "Không có email",
      role: "INSTRUCTOR"
    }));

  } catch (error) {
    console.error("Lỗi catch khi getInstructorsAction:", error);
    return [];
  }
}

/**
 * 9. Cập nhật Đề cương (Syllabus) theo ID
 */
export async function updateSyllabusAction(
  syllabusId: string,
  payload: SyllabusUpdatePayload
) {
  try {
    const baseUrl = userBackendUrl || "";
    const url = `${baseUrl.replace(/\/$/, "")}/syllabus/${syllabusId}`;

    const token = await getTokenFromCookie();

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });

    // 🟢 An toàn hơn: Bắt lỗi chuỗi / HTML khi Server bị crash 500
    if (!res.ok) {
      const errorText = await res.text();
      let errorMessage = `Lỗi máy chủ (${res.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail || errorMessage;
      } catch {
        // Nếu response là plain text "Internal Server Error"
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return await res.json();
  } catch (error: any) {
    throw new Error(error.message || "Lỗi cập nhật đề cương");
  }
}

/**
 * 10. Tải file Đề cương (Syllabus) về máy dưới dạng dữ liệu Base64
 */
export async function downloadSyllabusFileAction(
  syllabusId: string
): Promise<{ base64Data: string; contentType: string }> {
  try {
    const baseUrl = userBackendUrl || "";
    const url = `${baseUrl.replace(/\/$/, "")}/syllabus/download/${syllabusId}`;

    const token = await getTokenFromCookie();

    const res = await fetch(url, {
      method: "GET",
      headers: {
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      }
    });

    if (!res.ok) {
      throw new Error("Không thể tải tập tin đề cương về máy.");
    }

    const arrayBuffer = await res.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    const contentType = res.headers.get("content-type") || "application/octet-stream";

    return { base64Data, contentType };
  } catch (error: any) {
    throw new Error(error.message || "Lỗi khi tải file đề cương");
  }
}

/**
 * 11. Xóa Đề cương (Syllabus) theo ID
 */
export async function deleteSyllabusAction(syllabusId: string) {
  try {
    const baseUrl = userBackendUrl || "";
    const url = `${baseUrl.replace(/\/$/, "")}/syllabus/${syllabusId}`;

    const token = await getTokenFromCookie();

    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      }
    });

    if (!res.ok) {
      const errorText = await res.text();
      let errorMessage = `Lỗi máy chủ (${res.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return await res.json();
  } catch (error: any) {
    throw new Error(error.message || "Lỗi xóa đề cương");
  }
}