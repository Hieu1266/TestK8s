"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { Course } from "@/types/course";
import { GeneralCourseInfo, CoursePreview, CourseType, CourseSearchParams, CourseSearchPaginatedResponse, FeaturedCoursesResponse, CourseEnrollmentResponse, CourseLearningStructure } from "@/types/course";

// const BACKEND_URL = process.env.NEXT_PUBLIC_COURSE_BACKEND_URL || "http://localhost:8001";
const BACKEND_URL = process.env.NEXT_PUBLIC_COURSE_BACKEND_URL;
const LEARNING_PROGRESS_URL = process.env.NEXT_PUBLIC_PROGRESS_BACKEND_URL;
async function getServerToken(): Promise<string> {
  const cookieStore = await cookies();
  const tokenObj = cookieStore.get("token");
  const token = tokenObj ? tokenObj.value : "";

  if (!token || token === 'undefined' || token === 'null') {
    throw new Error("Không tìm thấy mã xác thực Access Token trên hệ thống. Vui lòng đăng nhập lại!");
  }
  return token.trim().replace(/^"|"$/g, "");
}

// 🟢 1. Lấy danh sách khóa học từ Backend
export async function getCoursesAction(): Promise<Course[]> {
  try {
    const cleanToken = await getServerToken();
    const res = await fetch(`${BACKEND_URL}/courses/`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${cleanToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Không thể lấy danh sách khóa học. Mã lỗi: ${res.status}`);
    }
    return await res.json();
  } catch (error: any) {
    console.error("❌ Lỗi tại getCoursesAction:", error.message);
    return [];
  }
}

// 🟢 2. Tạo mới khóa học
export async function createCourseAction(payload: any) {
  try {
    const cleanToken = await getServerToken();
    const res = await fetch(`${BACKEND_URL}/courses/`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cleanToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("Backend error:", err);
      throw new Error(
        typeof err.detail === "string" ? err.detail : JSON.stringify(err)
      );
    }
    revalidatePath("/courses");
    revalidatePath("/training-management/course-assignment");
    return { success: true };
  } catch (error: any) {
    console.error("❌ Lỗi tại createCourseAction:", error.message);
    return { success: false, error: error.message };
  }
}

// 🟢 3. Cập nhật khóa học
export async function updateCourseAction(courseId: string, payload: any) {
  try {
    const cleanToken = await getServerToken();
    const url = `${BACKEND_URL}/courses/${courseId}`;

    console.log("🚀 Đang gửi dữ liệu cập nhật tới:", url);

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${cleanToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Cập nhật thất bại từ phía Backend server.");
    }

    const data = await res.json();

    // Làm mới cache các trang liên quan
    revalidatePath("/courses");
    revalidatePath("/training-management/course-assignment");

    return { success: true, data };
  } catch (error: any) {
    console.error("❌ Lỗi tại updateCourseAction:", error.message);
    return { success: false, error: error.message };
  }
}

// 🟢 4. Xóa khóa học
export async function deleteCourseAction(courseId: string) {
  try {
    const cleanToken = await getServerToken();
    const res = await fetch(`${BACKEND_URL}/courses/${courseId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${cleanToken}`,
        "Content-Type": "application/json"
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Xóa khóa học thất bại.");
    }
    revalidatePath("/courses");
    revalidatePath("/training-management/course-assignment");
    return { success: true };
  } catch (error: any) {
    console.error("❌ Lỗi tại deleteCourseAction:", error.message);
    return { success: false, error: error.message };
  }
}

// 🟢 5. Upload ảnh đại diện khóa học (Nhận vào FormData từ Client)
export async function uploadCourseImageAction(formData: FormData) {
  try {
    const cleanToken = await getServerToken();

    const response = await fetch(`${BACKEND_URL}/courses/course-image`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cleanToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errData.detail || `Upload thất bại, Server phản hồi mã lỗi: ${response.status}`
      };
    }

    const data = await response.json();
    return { success: true, imageUrl: data.image_url };
  } catch (error: any) {
    console.error("❌ Lỗi tại uploadCourseImageAction:", error.message);
    return { success: false, error: error.message || "Lỗi kết nối mạng đến server." };
  }
}

// 🟢 6. Phân công giảng viên
export async function assignInstructorAction(payload: {
  course_id: string;
  instructor_id: string;
}) {
  try {
    const cleanToken = await getServerToken();
    if (!cleanToken) {
      return { success: false, error: "Phiên đăng nhập hết hạn!" };
    }
    const url = `${BACKEND_URL}/courses/${payload.course_id}/assign-instructor?instructor_id=${payload.instructor_id}`;

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${cleanToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.detail || `Lỗi hệ thống Backend: ${res.status}`
      };
    }
    revalidatePath("/training-management/course-assignment");
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Không thể kết nối đến máy chủ"
    };
  }
}
export async function getCourseList(
  tagId?: string,
  statusId: string = "COURSE_REGI"
): Promise<GeneralCourseInfo[]> {
  try {
    const url = new URL(
      `${BACKEND_URL}/course-tag-link/get-course-list`
    );

    if (tagId) {
      url.searchParams.append("tag_id", tagId);
    }

    url.searchParams.append("status_id", statusId);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch course list: ${response.statusText}`
      );
    }

    const data: GeneralCourseInfo[] =
      await response.json();

    return data;
  } catch (error) {
    console.error(
      "Error fetching course list:",
      error
    );

    return [];
  }
}

export async function searchCourses(
  params: CourseSearchParams
): Promise<CourseSearchPaginatedResponse> {
  try {
    const url = new URL(`${BACKEND_URL}/courses/search`);

    if (params.q) url.searchParams.append("q", params.q);
    if (params.tag_id) url.searchParams.append("tag_id", params.tag_id);
    if (params.course_type) url.searchParams.append("course_type", params.course_type);
    if (params.max_price !== undefined) url.searchParams.append("max_price", params.max_price.toString());
    if (params.page) url.searchParams.append("page", params.page.toString());
    if (params.size) url.searchParams.append("size", params.size.toString());

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to search courses: ${response.statusText}`);
    }

    const data: CourseSearchPaginatedResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error searching courses:", error);
    return {
      items: [],
      total: 0,
      page: 1,
      size: 10,
      total_pages: 0,
    };
  }
}

export async function getFeaturedCourses(): Promise<GeneralCourseInfo[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/courses/featured`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // Cache dữ liệu 5 phút (300s) để tối ưu hiệu năng Landing Page
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      console.error("Lỗi khi gọi API Featured Courses:", res.statusText);
      return [];
    }

    const result: FeaturedCoursesResponse = await res.json();
    return result.data || [];
  } catch (error) {
    console.error("Lỗi kết nối tới Course Service:", error);
    return [];
  }
}

export async function fetchCoursePreview(courseId: string): Promise<CoursePreview | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/courses/preview/${courseId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Giúp lấy dữ liệu mới nhất
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch course preview:', error);
    return null;
  }
}

export async function enrollCourseAction(courseId: string) {
  try {
    let token: string | null = null;

    try {
      token = await getServerToken();
    } catch (tokenErr) {
      console.error("[enrollCourseAction] Token retrieval error:", tokenErr);
    }

    if (!token) {
      return {
        success: false,
        message: "Vui lòng đăng nhập để thực hiện thao tác này.",
      };
    }

    const response = await fetch(`${LEARNING_PROGRESS_URL}/course_enrollment/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ course_id: courseId }),
      // Tránh cướp cache
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      // Đọc kĩ thuộc tính detail từ FastAPI trả về
      const errorMessage =
        (typeof data?.detail === "string" ? data.detail : null) ||
        data?.message ||
        "Đăng ký khóa học thất bại.";

      return {
        success: false,
        message: errorMessage,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.error("[enrollCourseAction] Exception:", error);
    return {
      success: false,
      message: error?.message || "Lỗi kết nối máy chủ, vui lòng thử lại sau.",
    };
  }
}

export async function getLearningCourse(courseId: string): Promise<CourseLearningStructure> {
  // 1. Lấy token từ Server Cookie
  const token = await getServerToken();

  // 2. Gọi API sang Backend FastAPI
  const response = await fetch(`${BACKEND_URL}/courses/get-learning-course/${courseId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  // 3. Xử lý phản hồi lỗi từ Backend
  if (!response.ok) {
    let errorMessage = 'Đã có lỗi xảy ra khi tải dữ liệu khóa học.';

    try {
      const errorData = await response.json();
      if (errorData?.detail) {
        errorMessage = typeof errorData.detail === 'string'
          ? errorData.detail
          : JSON.stringify(errorData.detail);
      }
    } catch {
      // Giữ nguyên errorMessage mặc định nếu không parse được JSON
    }

    if (response.status === 401) {
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
    }
    if (response.status === 403) {
      throw new Error(errorMessage || 'Bạn chưa đăng ký khóa học này.');
    }
    if (response.status === 404) {
      throw new Error('Khóa học không tồn tại.');
    }

    throw new Error(errorMessage);
  }

  // 4. Trả về kết quả
  const data: CourseLearningStructure = await response.json();
  return data;
}


export async function approveCourseAction(courseId: string) {
  try {
    const cleanToken = await getServerToken();

    const res = await fetch(`${BACKEND_URL}/courses/${courseId}/approve`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        success: false,
        message: data?.detail || "Duyệt khóa học thất bại.",
      };
    }

    return {
      success: true,
      message: data?.message || "Đã duyệt khóa học thành công.",
    };
  } catch (error: any) {
    console.error("❌ Lỗi tại approveCourseAction:", error.message);
    return {
      success: false,
      message: error?.message || "Lỗi kết nối máy chủ.",
    };
  }
}