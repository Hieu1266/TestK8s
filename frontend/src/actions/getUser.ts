"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { UserDataInfo, ProfileInfo, UserInfoUpdate, ProfileUpdate } from "@/types/user";

export interface ActionResponseList {
  success: boolean;
  message?: string;
  list?: any[];
}

export interface ActionResponseSingle {
  success: boolean;
  message?: string;
}

export interface User {
  user_id: string;
  username: string;
  email: string;
  role_id: number;
  status_id: string;
  created_at?: string;
}

export type UserItem = User;
const userBackendUrl = process.env.NEXT_PUBLIC_USER_BACKEND_URL;

async function getAuthHeaders() {
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





// // 1. Lấy danh sách thành viên (Giữ nguyên vì logic đúng)
// export async function getrList(page: number, limit: number): Promise<ActionResponseList> {
//   try {
//     const skip = (page - 1) * limit;
//     const headers = await getAuthHeaders();

//     if (!headers) {
//       return { success: false, message: "Không tìm thấy Token đăng nhập trong Cookie!" };
//     }

//     const res = await fetch(`${userBackendUrl}/get-user-list?skip=${skip}&limit=${limit}`, {
//       method: "GET",
//       headers: headers,
//       cache: "no-store"
//     });

//     if (res.status === 401) {
//       return { success: false, message: "Phiên đăng nhập hết hạn hoặc không có quyền Admin!" };
//     }

//     if (!res.ok) {
//       return { success: false, message: `Lỗi hệ thống Backend: ${res.status}` };
//     }

//     const data = await res.json();
//     return { success: true, list: data };
//   } catch (error: any) {
//     return { success: false, message: error.message || "Lỗi kết nối mạng" };
//   }
// }


// Sửa lại hàm getrList để nhận thêm bộ lọc theo đúng Swagger
export async function getrList(
  page: number,
  limit: number,
  roleId?: number,
  statusId?: string
): Promise<ActionResponseList> {
  try {
    const validPage = Math.max(1, page);
    const validLimit = Math.max(1, limit);
    const skip = (validPage - 1) * validLimit;
    const headers = await getAuthHeaders();

    if (!headers) {
      return { success: false, message: "Không tìm thấy Token đăng nhập trong Cookie!" };
    }
    let url = `${userBackendUrl}/get-user-list?skip=${skip}&limit=${limit}`;
    if (statusId) url += `&status_id=${statusId}`;
    if (roleId !== undefined) url += `&role_id=${roleId}`;

    const res = await fetch(url, {
      method: "GET",
      headers: headers,
      cache: "no-store"
    });

    if (res.status === 401) {
      return { success: false, message: "Phiên đăng nhập hết hạn hoặc không có quyền Admin!" };
    }

    if (!res.ok) {
      return { success: false, message: `Lỗi hệ thống Backend: ${res.status}` };
    }

    const data = await res.json();
    return { success: true, list: data };
  } catch (error: any) {
    return { success: false, message: error.message || "Lỗi kết nối mạng" };
  }
}




// 2. SỬA LỖI: Cập nhật trạng thái Tài khoản (PATCH /update-status/)
export async function updateUserStatus(userId: string, nextStatus: any): Promise<ActionResponseSingle> {
  try {
    const headers = await getAuthHeaders();
    if (!headers) return { success: false, message: "Hết hạn phiên đăng nhập" };

    // LƯU Ý QUAN TRỌNG: 
    // Nếu status_id ở Backend/DB của bạn lưu dạng số (ví dụ: 1 = Active, 2 = Locked) thì cần mở dòng dưới ra:
    // const statusIdFormatted = !isNaN(Number(nextStatus)) ? Number(nextStatus) : nextStatus;

    // Nếu status_id ở Backend là dạng chuỗi chữ (ví dụ: "ACTIVE", "BLOCKED") thì giữ nguyên nextStatus
    const statusIdFormatted = nextStatus;

    const res = await fetch(`${userBackendUrl}/update-status/${userId}`, {
      method: "PATCH",
      headers: headers,
      body: JSON.stringify({
        status_id: statusIdFormatted // Gửi object phẳng { status_id: ... } theo đúng Pydantic UserStatusUpdate
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return { success: false, message: `Không thể cập nhật trạng thái: ${errorText}` };
    }

    revalidatePath("/admin/user-management");
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// 3. SỬA LỖI NẶNG NHẤT: Đưa cấu trúc dữ liệu phức tạp lồng về dạng PHẲNG (Flat Object)
export async function updateUserInfo(userId: string, editUserData: any): Promise<ActionResponseSingle> {
  try {
    const headers = await getAuthHeaders();
    if (!headers) return { success: false, message: "Hết hạn phiên đăng nhập" };

    // Trích xuất dữ liệu từ payload của form
    let rawData = editUserData;
    if (Array.isArray(editUserData)) {
      rawData = editUserData.find(item => typeof item === 'object' && item !== null && 'username' in item) || editUserData[editUserData.length - 1];
    }

    // KHÔNG BỌC LỒNG OBJECT NỮA. CHUYỂN THÀNH OBJECT PHẲNG THEO ĐÚNG SCHEMA UserInfoUpdate CỦA BACKEND
    // Dựa theo Hình 2 & Hình 3 trong Swagger của bạn: Model cập nhật thông tin gồm các trường phẳng dưới đây
    const formattedPayload = {
      username: rawData?.username || "",
      // Thêm các trường profile/user khác nếu form của bạn có truyền lên và Backend yêu cầu:
      // firstname: rawData?.firstname || "",
      // lastname: rawData?.lastname || "",
      // bio: rawData?.bio || "",
      // avatar_url: rawData?.avatar_url || ""
    };

    const res = await fetch(`${userBackendUrl}/update-user/${userId}`, {
      method: "PUT",
      headers: headers,
      body: JSON.stringify(formattedPayload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return { success: false, message: `Lỗi sửa thông tin (${res.status}): ${errorText}` };
    }

    revalidatePath("/admin/user-management");
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// 4. Tạo mới tài khoản (Giữ nguyên)
export async function registerAccount(newUserData: any): Promise<ActionResponseSingle> {
  try {
    const headers = await getAuthHeaders();
    if (!headers) return { success: false, message: "Hết hạn phiên đăng nhập" };

    const res = await fetch(`${userBackendUrl}/create-user`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(newUserData),
    });

    if (!res.ok) return { success: false, message: "Lỗi đăng ký tài khoản mới" };

    revalidatePath("/admin/user-management");
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// Thêm hàm này vào file Server Actions của bạn (@/actions/getUser.ts)
export async function updateUserRole(userId: string, roleId: number): Promise<ActionResponseSingle> {
  try {
    const headers = await getAuthHeaders();
    if (!headers) return { success: false, message: "Hết hạn phiên đăng nhập" };

    const res = await fetch(`${userBackendUrl}/update-role/${userId}`, {
      method: "PATCH",
      headers: headers,
      body: JSON.stringify({ role_id: roleId }), // Gửi đúng { role_id: số }
    });

    if (!res.ok) {
      const errorText = await res.text();
      return { success: false, message: `Không thể cập nhật role: ${errorText}` };
    }

    revalidatePath("/admin/user-management");
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}





// lấy toàn bộ thông tin 1 người 
// Định nghĩa kiểu dữ liệu phản hồi chi tiết từ Swagger
export interface ActionResponseDetail {
  success: boolean;
  message?: string;
  data?: {
    user_id: string;
    role_name: string;
    username: string;
    email: string;
    password?: string;
    birthdate?: string;
    created_at: string;
    status_id: string;
    [key: string]: any; // Cho phép chứa thêm các thông tin mở rộng khác nếu có
  };
}

// Hàm lấy toàn bộ thông tin chi tiết 1 người dùng dựa theo Swagger (GET /get-user/{user_id})
export async function getInforUser(userId: string): Promise<ActionResponseDetail> {
  try {
    const headers = await getAuthHeaders();
    if (!headers) return { success: false, message: "Hết hạn phiên đăng nhập" };

    // Đúng chuẩn Swagger: Phương thức GET, truyền userId trực tiếp lên URL thanh thoát
    const res = await fetch(`${userBackendUrl}/get-user/${userId}`, {
      method: "GET",
      headers: headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const errorText = await res.text();
      return { success: false, message: `Không thể tải thông tin chi tiết: ${errorText}` };
    }

    const data = await res.json();
    return { success: true, data: data };
  } catch (error: any) {
    return { success: false, message: error.message || "Lỗi kết nối hệ thống" };
  }
}




export async function getrInstructorList(
  page: number,
  limit: number,
  roleId: number,
  statusId: string
): Promise<ActionResponseList> {
  try {
    if (roleId === undefined || !statusId) {
      return { success: false, message: "Thiếu bộ lọc Role hoặc Status để tìm kiếm!" };
    }

    const validPage = Math.max(1, page);
    const validLimit = Math.max(1, limit);
    const skip = (validPage - 1) * validLimit;
    const headers = await getAuthHeaders();

    if (!headers) {
      return { success: false, message: "Không tìm thấy Token đăng nhập trong Cookie!" };
    }
    const url = `${userBackendUrl}/get-instructor-list?skip=${skip}&limit=${limit}&status_id=${statusId}&role_id=${roleId}`;
    const res = await fetch(url, {
      method: "GET",
      headers: headers,
      cache: "no-store"
    });

    if (res.status === 401) {
      return { success: false, message: "Phiên đăng nhập hết hạn hoặc không có quyền hợp lệ!" };
    }

    if (res.status === 400) {
      return { success: false, message: "Yêu cầu không hợp lệ, thiếu dữ liệu bộ lọc!" };
    }

    if (!res.ok) {
      return { success: false, message: `Lỗi hệ thống Backend: ${res.status}` };
    }

    const data = await res.json();
    return { success: true, list: data };
  } catch (error: any) {
    return { success: false, message: error.message || "Lỗi kết nối mạng" };
  }
}


export async function fetchCurrentUser(): Promise<UserDataInfo | null> {
  const backendUrl = process.env.NEXT_PUBLIC_USER_BACKEND_URL;
  if (!backendUrl) throw new Error("Thiếu NEXT_PUBLIC_USER_BACKEND_URL");
  const headers = await getAuthHeaders();
  if (!headers) return null;
  const response = await fetch(`${backendUrl}/me`, { method: "GET", headers, next: { revalidate: 0 } });
  if (!response.ok) return null;
  return response.json();
}

export async function fetchUserProfile(): Promise<ProfileInfo | null> {
  const backendUrl = process.env.NEXT_PUBLIC_USER_BACKEND_URL;
  if (!backendUrl) throw new Error("Thiếu NEXT_PUBLIC_USER_BACKEND_URL trong biến môi trường.");

  const headers = await getAuthHeaders();
  if (!headers) return null;

  const response = await fetch(`${backendUrl}/get-profile`, {
    method: "GET",
    headers,
    next: { revalidate: 0 }
  });

  if (!response.ok) return null;
  return response.json();
}

// 🌟 Hàm cập nhật thông tin tài khoản (/update-user)
export async function updateUserData(userId: string, data: UserInfoUpdate): Promise<boolean> {
  const backendUrl = process.env.NEXT_PUBLIC_USER_BACKEND_URL;
  if (!backendUrl) throw new Error("Thiếu NEXT_PUBLIC_USER_BACKEND_URL");
  const headers = await getAuthHeaders();
  if (!headers) return false;

  // Thêm userId vào sau đường dẫn giống với updateUserInfo
  const response = await fetch(`${backendUrl}/update-user/${userId}`, {
    method: "PUT", // Hoặc PATCH tùy thuộc vào thiết kế Backend của bạn
    headers,
    body: JSON.stringify(data),
  });


  return response.ok;
}

// 🌟 Hàm cập nhật thông tin hồ sơ (/update-profile)
export async function updateUserProfile(data: ProfileUpdate): Promise<boolean> {
  const backendUrl = process.env.NEXT_PUBLIC_USER_BACKEND_URL;
  if (!backendUrl) throw new Error("Thiếu NEXT_PUBLIC_USER_BACKEND_URL");
  const headers = await getAuthHeaders();
  if (!headers) return false;

  const response = await fetch(`${backendUrl}/update-profile`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(data),
  });
  return response.ok;
}

import { UserGeneralInfo } from "@/types/user";

// 5. Lấy danh sách Tester (dùng cho màn phân công cộng tác viên)
export async function getTesterListAction(
  search: string = ""
): Promise<ActionResponseList> {
  try {
    const headers = await getAuthHeaders();
    if (!headers) {
      return { success: false, message: "Không tìm thấy Token đăng nhập trong Cookie!" };
    }

    const res = await fetch(`${userBackendUrl}/get-tester-list?skip=0&limit=1000`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (res.status === 401) {
      return { success: false, message: "Phiên đăng nhập hết hạn hoặc bạn không có quyền truy cập!" };
    }
    if (!res.ok) {
      return { success: false, message: `Lỗi hệ thống Backend: ${res.status}` };
    }

    let list: UserGeneralInfo[] = await res.json();
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) => u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
      );
    }
    return { success: true, list };
  } catch (error: any) {
    return { success: false, message: error.message || "Lỗi kết nối mạng" };
  }
}