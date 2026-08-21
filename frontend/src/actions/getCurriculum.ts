"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { CurriculumCreatePayload } from "@/types/course";

// const BACKEND_URL = process.env.NEXT_PUBLIC_COURSE_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:8001";
  const BACKEND_URL = process.env.NEXT_PUBLIC_COURSE_BACKEND_URL;
async function getServerToken(): Promise<string> {
  const cookieStore = await cookies();
  const tokenObj = cookieStore.get("token");
  const token = tokenObj ? tokenObj.value : "";
  
  if (!token || token === 'undefined' || token === 'null') {
    throw new Error("Không tìm thấy mã xác thực Access Token trên hệ thống. Vui lòng đăng nhập lại!");
  }
  return token.trim().replace(/^"|"$/g, "");
}

// --- 1. UPLOAD FILE EXCEL/PDF CURRICULUM ---
export async function uploadCurriculums(formData: FormData, curriculumId?: string) {
  try {
    const token = await getServerToken();

    let apiUrl = `${BACKEND_URL}/curriculums/upload`;
    if (curriculumId) apiUrl += `?curriculum_id=${curriculumId}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${token}` 
      }, 
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Lỗi tải file lên: ${response.status}`);
    }
    
    revalidatePath("/training-management/course-assignment");
    return await response.json();
  } catch (error: any) {
    console.error("❌ Lỗi tại uploadCurriculums:", error.message);
    throw new Error(error.message);
  }
}

// --- 2. LẤY DANH SÁCH CURRICULUM (Đồng bộ tên hàm getCurriculumsAction với Client) ---
export async function getCurriculumsAction() {
  try {
    const token = await getServerToken();
    const response = await fetch(`${BACKEND_URL}/curriculums/`, { 
      method: "GET",
      headers: { 
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Không thể tải danh sách chương trình đào tạo");
    }

    return await response.json();
  } catch (error: any) {
    console.error("❌ Lỗi tại getCurriculumsAction:", error.message);
    
    return [];
  }
}

// Giữ lại alias getCurriculums phòng trường hợp các file khác trong dự án gọi tên cũ
export async function getCurriculums() {
  return getCurriculumsAction();
}

// --- 3. TẠO MỚI CURRICULUM ---
export async function createCurriculum(data: CurriculumCreatePayload) {
  try {
    const token = await getServerToken();
    const response = await fetch(`${BACKEND_URL}/curriculums/`, { 
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Không thể tạo chương trình đào tạo mới");
    }

    revalidatePath("/training-management/course-assignment");
    return await response.json();
  } catch (error: any) {
    console.error("❌ Lỗi tại createCurriculum:", error.message);
    throw new Error(error.message);
  }
}

// --- 4. CẬP NHẬT CURRICULUM ---
export async function updateCurriculum(curriculumId: string, payload: any) {
  try {
    const token = await getServerToken();
    const response = await fetch(`${BACKEND_URL}/curriculums/${curriculumId}`, {
      method: "PUT",
      headers: { 
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Không thể cập nhật chương trình đào tạo");
    }

    revalidatePath("/training-management/course-assignment");
    return await response.json();
  } catch (error: any) {
    console.error("❌ Lỗi tại updateCurriculum:", error.message);
    throw new Error(error.message);
  }
}

// --- 5. XÓA CURRICULUM ---
export async function deleteCurriculum(curriculumId: string) {
  try {
    const token = await getServerToken();
    const response = await fetch(`${BACKEND_URL}/curriculums/${curriculumId}`, {
      method: "DELETE",
      headers: { 
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Không thể tiến hành xóa dữ liệu.");
    }

    revalidatePath("/training-management/course-assignment");
    return true;
  } catch (error: any) {
    console.error("❌ Lỗi tại deleteCurriculum:", error.message);
    throw new Error(error.message);
  }
}

