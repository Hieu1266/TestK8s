"use server";
import { cookies } from "next/headers";
import { GeneralInfoInstructorSubject, SubjectInfoWithQuestions, SubjectInfoWithQuizzes } from "@/types/subject";
import { SubjectData, SubjectUpdateInput } from "@/types/subjects";

const BACKEND_URL = process.env.NEXT_PUBLIC_COURSE_BACKEND_URL;

// Hàm trợ giúp lấy token an toàn
async function getServerToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value || "";
  return token.trim().replace(/^"|"$/g, "");
}

// 1. Tạo môn học mới
export async function createSubjectAction(payload: any) {
  try {
    const token = await getServerToken();

    if (!token) {
      throw new Error("Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn!");
    }

    const endpoint = `${BACKEND_URL}/subjects/`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      let errorMessage = `Lỗi Backend (${response.status})`;
      if (typeof errorData.detail === "string") {
        errorMessage = errorData.detail;
      } else if (Array.isArray(errorData.detail)) {
        errorMessage = errorData.detail
          .map((e: any) => `${e.loc?.slice(1).join(".")}: ${e.msg}`)
          .join(" | ");
      }

      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error: any) {
    console.error("❌ Lỗi createSubjectAction:", error.message);
    throw new Error(error.message || "Lỗi kết nối Server Action");
  }
}

// 2. Lấy môn học theo ID khóa học
export async function getSubjectsByCourseAction(courseId: string | number) {
  try {
    const token = await getServerToken();
    const response = await fetch(`${BACKEND_URL}/subjects/course/${courseId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok)
      throw new Error(`Lỗi Server (${response.status}) khi tải môn học`);
    return await response.json();
  } catch (error: any) {
    throw new Error(
      error.message || "Lỗi kết nối Server Action [getSubjectsByCourseAction]"
    );
  }
}

// 3. Lấy thông tin tổng quan các môn học của Giảng viên
export async function getInstructorGeneralInfoAction(
  searchQuery?: string
): Promise<GeneralInfoInstructorSubject[]> {
  try {
    const token = await getServerToken();

    if (!token) {
      throw new Error("Chưa đăng nhập hoặc phiên làm việc đã hết hạn");
    }

    const url = new URL(`${BACKEND_URL}/subjects/instructor-general-info`);
    if (searchQuery && searchQuery.trim() !== "") {
      url.searchParams.append("search", searchQuery.trim());
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail ||
        `Lỗi Server (${response.status}): Không thể tải danh sách môn học`
      );
    }

    return await response.json();
  } catch (error: any) {
    throw new Error(
      error.message ||
      "Lỗi kết nối Server Action [getInstructorGeneralInfoAction]"
    );
  }
}

// 4. Lấy danh sách môn học theo ID chương trình
export async function getSubjectsByCurriculum(curriculumId: string) {
  try {
    const token = await getServerToken();
    const response = await fetch(
      `${BACKEND_URL}/subjects/curriculum/${curriculumId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) throw new Error(`Lỗi Server (${response.status})`);
    return await response.json();
  } catch (error: any) {
    throw new Error(
      error.message || "Lỗi kết nối Server Action [getSubjectsByCurriculum]"
    );
  }
}

// 5. Xóa môn học
export async function deleteSubject(subjectId: string) {
  try {
    const token = await getServerToken();
    const response = await fetch(`${BACKEND_URL}/subjects/${subjectId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let message = "Xóa môn học thất bại";
      if (typeof errorData.detail === "string") {
        message = errorData.detail;
      } else if (Array.isArray(errorData.detail)) {
        message = errorData.detail.map((e: any) => e.msg || JSON.stringify(e)).join(" | ");
      } else if (errorData.detail) {
        message = JSON.stringify(errorData.detail);
      }
      throw new Error(message);
    }
    return await response.json();
  } catch (error: any) {
    throw new Error(error.message);
  }
}

// 6. Lấy tất cả môn học
export async function getSubjectsAction(): Promise<any[]> {
  try {
    const cleanToken = await getServerToken();
    const res = await fetch(`${BACKEND_URL}/subjects/?limit=1000`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) throw new Error("Không thể lấy danh sách học phần");
    return await res.json();
  } catch (error) {
    console.error("Lỗi lấy danh sách học phần:", error);
    return [];
  }
}
export const getInstructorSubjectsWithQuizzesAction = async (
  search: string = ""
): Promise<SubjectInfoWithQuizzes[]> => {
  try {
    const queryParam = search ? `?search=${encodeURIComponent(search)}` : "";
    const url = `${BACKEND_URL}/subjects/instructor-subjects-quizzes${queryParam}`;

    const token = await getServerToken();

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      method: "GET",
      headers: headers,
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error("Phiên đăng nhập hết hạn hoặc bạn không có quyền truy cập (401).");
      }
      throw new Error(`Lỗi gọi API: ${res.status}`);
    }

    const data: SubjectInfoWithQuizzes[] = await res.json();
    return data;
  } catch (error) {
    console.error("Fetch Error:", error);
    throw error;
  }
};

export const getInstructorSubjectsWithQuestionsAction = async (
  search: string = ""
): Promise<SubjectInfoWithQuestions[]> => {
  try {
    const queryParam = search ? `?search=${encodeURIComponent(search)}` : "";
    const url = `${BACKEND_URL}/subjects/instructor-subjects-questions${queryParam}`;

    // 1. Lấy token từ cookies. 
    const token = await getServerToken()

    // 2. Gắn token vào header
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      method: "GET",
      headers: headers,
    });

    if (!res.ok) {
      // Bắt riêng lỗi 401 để dễ debug
      if (res.status === 401) {
        throw new Error("Phiên đăng nhập hết hạn hoặc bạn không có quyền truy cập (401).");
      }
      throw new Error(`Lỗi gọi API: ${res.status}`);
    }

    const data: SubjectInfoWithQuestions[] = await res.json();
    return data;
  } catch (error) {
    console.error("Fetch Error:", error);
    throw error;
  }
};
// 7. Cập nhật môn học

// 7. Cập nhật môn học
export async function updateSubjectAction(
  subjectId: string,
  payload: SubjectUpdateInput
): Promise<SubjectData> {
  try {
    const token = await getServerToken();

    if (!token) {
      throw new Error("Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn!");
    }

    const response = await fetch(`${BACKEND_URL}/subjects/${subjectId}`, {
      method: "PUT", // Nếu Backend dùng PATCH thì đổi thành "PATCH"
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      let errorMessage = `Lỗi Server (${response.status})`;
      if (typeof errorData.detail === "string") {
        errorMessage = errorData.detail;
      } else if (Array.isArray(errorData.detail)) {
        errorMessage = errorData.detail
          .map((e: any) => `${e.loc?.slice(1).join(".") || "Lỗi"}: ${e.msg}`)
          .join(" | ");
      } else if (errorData.detail) {
        errorMessage = JSON.stringify(errorData.detail);
      }

      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error: any) {
    console.error("❌ Lỗi updateSubjectAction:", error.message);
    throw new Error(error.message || "Lỗi khi cập nhật môn học");
  }
}






// 8. 🆕 Lấy chi tiết 1 môn học theo ID (Cho SubjectPage.tsx)
export async function getSubjectByIdAction(
  subjectId: string
): Promise<SubjectData> {
  try {
    const token = await getServerToken();

    const response = await fetch(`${BACKEND_URL}/subjects/${subjectId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail ||
        `Lỗi Server (${response.status}): Không thể lấy thông tin môn học`
      );
    }

    return await response.json();
  } catch (error: any) {
    throw new Error(
      error.message || "Lỗi kết nối Server Action [getSubjectByIdAction]"
    );
  }
}


// Tùy chọn: Export alias để bạn thích dùng tên getSubjectAction hay getSubjectByIdAction đều được
export { getSubjectByIdAction as getSubjectAction };