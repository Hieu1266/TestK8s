'use server'

import { cookies } from 'next/headers'

const userBackendUrl = process.env.NEXT_PUBLIC_USER_BACKEND_URL;

// Cập nhật Interface để chứa redirectTo
export interface ActionResponse {
  success: boolean
  message: string
  redirectTo?: string // Thêm trường này
  user?: {
    username: string
    email: string
    role: string
  }
}

interface GoogleAuthResponse {
  message: string;
  access_token: string;
  token_type: string;
  user: {
    username: string;
    email: string;
    role: string;
    profile: {
      firstname: string | null;
      lastname: string | null;
      avatar_url: string | null;
    };
  };
}

// Hàm helper để phân loại URL theo Role
function getRedirectUrlByRole(role: string): string {
  const roleClean = role?.trim().toLowerCase();

  if (roleClean === "admin") return "/admin";
  if (roleClean === "faculty" || roleClean === "instructor") return "/training-management";
  if (roleClean === "manager") return "/instructor-management";
  return "/dashboard-student";
}

async function setAuthCookies(data: any) {
  const cookieStore = await cookies()
  // QUAN TRỌNG: KHÔNG dùng process.env.NODE_ENV để quyết định "secure".
  // Dockerfile luôn set NODE_ENV=production kể cả khi site chạy HTTP thuần
  // (vd: truy cập qua IP LAN không có TLS) -> nếu secure=true thì trình
  // duyệt sẽ tự động DROP cookie (token/user_info/user_role) trên các
  // origin không phải HTTPS, khiến user không đăng nhập được.
  // Dùng cờ riêng COOKIE_SECURE, set "true" trong k8s/frontend.yml khi
  // đã có domain thật + HTTPS phía trước.
  const cookieConfig = {
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24,
    path: '/',
  };

  if (data.access_token) {
    cookieStore.set('token', data.access_token, { ...cookieConfig, httpOnly: true })
  }

  if (data.user) {
    cookieStore.set('user_info', JSON.stringify(data.user), { ...cookieConfig, httpOnly: false })

    const roleToStore = data.user.role ? data.user.role.toLowerCase().trim() : '';
    cookieStore.set('user_role', roleToStore, { ...cookieConfig, httpOnly: false })
  }
}

// ------------------ Action Đăng Ký ----------------------
export async function registerAccount(name: string, email: string, password: string): Promise<ActionResponse> {
  try {
    const res = await fetch(`${userBackendUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: name,
        email: email,
        password: password,
        role_id: 2,
      })
    })

    const data = await res.json()
    if (!res.ok) {
      return { success: false, message: data.detail || 'Đăng ký thất bại' }
    }
    return { success: true, message: data.message || 'Đăng ký tài khoản thành công' }
  } catch (error) {
    console.error(error)
    return { success: false, message: 'Không thể kết nối đến Server Backend!' }
  }
}

// async function setAuthCookies(data: any) {
//   const cookieStore = await cookies()
//   const cookieConfig = {
//     secure: process.env.NODE_ENV === 'production',
//     sameSite: 'lax' as const,
//     maxAge: 60 * 60 * 24,
//     path: '/',
//   };

//   if (data.access_token) {
//     cookieStore.set('token', data.access_token, { ...cookieConfig, httpOnly: true })
//   }

//   if (data.user) {
//     cookieStore.set('user_info', JSON.stringify(data.user), { ...cookieConfig, httpOnly: false })
//     cookieStore.set('user_role', data.role.toLowerCase(), { expires: 7 })
//   }
// }

// ------------------ Action Đăng Nhập ----------------------
export async function loginUserAction(email: string, password: string): Promise<ActionResponse> {
  try {
    const formData = new URLSearchParams()
    formData.append("username", email)
    formData.append("password", password)

    const res = await fetch(`${userBackendUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    })

    const data = await res.json()

    if (!res.ok) {
      return { success: false, message: data.detail || 'Mật khẩu sai hoặc tài khoản không tồn tại' }
    }

    await setAuthCookies(data);

    return {
      success: true,
      message: data.message || 'Đăng nhập thành công',
      user: data.user,
      redirectTo: getRedirectUrlByRole(data.user?.role) // Trả URL về cho Client
    }
  } catch (error) {
    console.error(error)
    return { success: false, message: 'Không thể kết nối đến Server Backend!' }
  }
}

export async function loginGoogleUserAction(googleAccessToken: string): Promise<ActionResponse> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_USER_BACKEND_URL;
    const res = await fetch(`${baseUrl}/auth/google/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: googleAccessToken })
    })
    const data = await res.json()
    if (!res.ok) {
      return { success: false, message: data.detail || 'Đăng nhập Google thất bại' }
    }
    await setAuthCookies(data);
    return {
      success: true,
      message: data.message,
      user: data.user,
      redirectTo: getRedirectUrlByRole(data.user?.role) // Trả URL về cho Client
    }
  } catch (error) {
    return { success: false, message: 'Không thể kết nối đến hệ thống!' }
  }
}

export async function registerGoogleUserAction(googleAccessToken: string): Promise<ActionResponse> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_USER_BACKEND_URL;
    const res = await fetch(`${baseUrl}/auth/google/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: googleAccessToken })
    })
    const data = await res.json()
    if (!res.ok) {
      return { success: false, message: data.detail || 'Đăng ký Google thất bại' }
    }
    return { success: true, message: data.message, user: data.user }
  } catch (error) {
    return { success: false, message: 'Không thể kết nối đến hệ thống!' }
  }
}

export async function logoutUserAction() {
  const cookieStore = await cookies();

  // Xóa các Cookie do Next.js quản lý
  cookieStore.delete('token');
  cookieStore.delete('user_info');
  cookieStore.delete('user_role');

  return { success: true };
}