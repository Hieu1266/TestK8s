"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export interface CourseLink {
  course_id: string;
  instructor_id: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_COURSE_BACKEND_URL;

// --- HÀM HELPER LẤY TOKEN TỪ COOKIE Ở TẦNG SERVER ---
async function getServerToken(): Promise<string> {
  const cookieStore = await cookies();
  const tokenObj = cookieStore.get("token");
  const token = tokenObj ? tokenObj.value : "";
  
  if (!token || token === 'undefined' || token === 'null') {
    throw new Error("Không tìm thấy mã xác thực Access Token. Vui lòng đăng nhập lại!");
  }
  return token.trim().replace(/^"|"$/g, "");
}

export async function getCoursesAction() {
  try {
    const cleanToken = await getServerToken();
    const url = `${BACKEND_URL}/get-course-list`; 

    console.log("🚀 Đang tải danh sách khóa học từ:", url);

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${cleanToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store", 
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Lỗi tải danh sách khóa học: ${res.status}`);
    }

    const data = await res.json();
    return data; 
  } catch (error: any) {
    console.error("❌ Lỗi tại getCoursesAction:", error.message);
    return [];
  }
}





export async function assignInstructorAction(payload: { course_id: string; instructor_id: string }) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value; 

        console.log("🔑 [Token Check]:", token ? "Đã lấy được token từ Cookie" : "Không tìm thấy token trong Cookie!");
        const response = await fetch(`${BACKEND_URL}/assignment/course-instructor-link`, { 
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token && { "Authorization": `Bearer ${token}` })
            },
            body: JSON.stringify(payload),
        });

        if (response.status === 401) {
            return { success: false, error: "Server trả về lỗi: 401 (Chưa đăng nhập hoặc thiếu token hợp lệ trong Header)" };
        }

        if (!response.ok) {
            const errorText = await response.text();
            return { success: false, error: `Lỗi: ${response.status} - ${errorText}` };
        }

        const data = await response.json();
        return { success: true, data };

    } catch (error: any) {
        return { success: false, error: error.message || "Lỗi kết nối Server Action" };
    }
}


export const updateInstructorAction = async (payload: { course_id: string; instructor_id: string }) => {
    try {
        const response = await fetch(`${BACKEND_URL}/assignments`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) return { success: false, error: data.detail || "Lỗi cập nhật" };
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};