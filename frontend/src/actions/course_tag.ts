"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import type { TagName } from "@/types/tag";
import type {
  CourseTagActionResponse,
  CourseTagAssignmentUpdate,
  CourseTagItem,
  CourseTagUpdateResult,
} from "@/types/course_tag";

const COURSE_API_URL =
  process.env.NEXT_PUBLIC_COURSE_BACKEND_URL || "http://localhost:8000";

const COURSE_TAG_API_URL = `${COURSE_API_URL}/course-tag-link`;

/**
 * Kiểu lỗi validation do FastAPI trả về.
 */
interface FastAPIValidationError {
  loc?: Array<string | number>;
  msg?: string;
  type?: string;
}

/**
 * Kiểu response lỗi chung của FastAPI.
 */
interface FastAPIErrorResponse {
  detail?: string | FastAPIValidationError[];
  message?: string;
}

/**
 * Lấy Access Token từ cookie phía Server.
 */
async function getServerToken(): Promise<string> {
  const cookieStore = await cookies();
  const tokenObject = cookieStore.get("token");
  const token = tokenObject?.value || "";

  if (!token || token === "undefined" || token === "null") {
    throw new Error("Không tìm thấy Access Token. Vui lòng đăng nhập lại.");
  }

  return token.trim().replace(/^"|"$/g, "");
}

/**
 * Tạo header có Authorization.
 */
function createAuthHeaders(
  token: string,
  hasJsonBody: boolean = false,
): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };

  if (hasJsonBody) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

/**
 * Đọc thông báo lỗi từ FastAPI.
 */
async function readErrorMessage(
  response: Response,
  defaultMessage: string,
): Promise<string> {
  try {
    const errorData = (await response.json()) as FastAPIErrorResponse;

    if (typeof errorData.detail === "string") {
      return errorData.detail;
    }

    if (Array.isArray(errorData.detail)) {
      const messages = errorData.detail
        .map((item) => item.msg)
        .filter((message): message is string => Boolean(message));

      if (messages.length > 0) {
        return messages.join(", ");
      }
    }

    if (typeof errorData.message === "string") {
      return errorData.message;
    }
  } catch {
    // Backend không trả về JSON hợp lệ.
  }

  if (response.status === 401) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }

  if (response.status === 403) {
    return "Bạn không có quyền thực hiện thao tác này.";
  }

  if (response.status === 404) {
    return "Không tìm thấy khóa học hoặc Tag.";
  }

  if (response.status === 409) {
    return "Dữ liệu liên kết Course–Tag đã tồn tại.";
  }

  if (response.status === 422) {
    return "Dữ liệu gửi đến backend không hợp lệ.";
  }

  return `${defaultMessage}. Mã lỗi: ${response.status}`;
}

/**
 * Lấy danh sách khóa học cùng những Tag đã được gán.
 *
 * GET /course-tag-link/get-course-list
 *
 * Có thể truyền tagId để lọc khóa học theo Tag.
 */
export async function getCourseTagList(
  tagId?: string,
): Promise<CourseTagItem[]> {
  try {
    const token = await getServerToken();

    const url = new URL(`${COURSE_TAG_API_URL}/get-course-list`);

    if (tagId?.trim()) {
      url.searchParams.set("tag_id", tagId.trim());
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: createAuthHeaders(token),
      cache: "no-store",
    });

    if (!response.ok) {
      const message = await readErrorMessage(
        response,
        "Không thể lấy danh sách khóa học",
      );

      throw new Error(message);
    }

    return (await response.json()) as CourseTagItem[];
  } catch (error) {
    console.error("❌ Lỗi getCourseTagList:", error);

    return [];
  }
}

/**
 * Lấy danh sách Tag đang được gán cho một khóa học.
 *
 * GET /course-tag-link/get-tag-list/{course_id}
 */
export async function getCourseAssignedTags(
  courseId: string,
): Promise<TagName[]> {
  try {
    const normalizedCourseId = courseId.trim();

    if (!normalizedCourseId) {
      throw new Error("Course ID không hợp lệ.");
    }

    const token = await getServerToken();

    const response = await fetch(
      `${COURSE_TAG_API_URL}/get-tag-list/${encodeURIComponent(
        normalizedCourseId,
      )}`,
      {
        method: "GET",
        headers: createAuthHeaders(token),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const message = await readErrorMessage(
        response,
        "Không thể lấy danh sách Tag của khóa học",
      );

      throw new Error(message);
    }

    return (await response.json()) as TagName[];
  } catch (error) {
    console.error("❌ Lỗi getCourseAssignedTags:", error);

    return [];
  }
}

/**
 * Cập nhật toàn bộ Tag của một khóa học.
 *
 * PUT /course-tag-link/update-tags
 */
export async function updateCourseTags(
  payload: CourseTagAssignmentUpdate,
): Promise<CourseTagActionResponse> {
  try {
    const courseId = payload.course_id.trim();

    if (!courseId) {
      return {
        success: false,
        message: "Course ID không hợp lệ.",
      };
    }

    /*
     * Loại bỏ Tag ID rỗng và Tag ID bị lặp.
     *
     * Cho phép mảng rỗng để xóa toàn bộ Tag
     * khỏi khóa học.
     */
    const normalizedTagIds = Array.from(
      new Set(payload.tag_ids.map((tagId) => tagId.trim()).filter(Boolean)),
    );

    const requestBody: CourseTagAssignmentUpdate = {
      course_id: courseId,
      tag_ids: normalizedTagIds,
    };

    const token = await getServerToken();

    const response = await fetch(`${COURSE_TAG_API_URL}/update-tags`, {
      method: "PUT",
      headers: createAuthHeaders(token, true),
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });

    if (!response.ok) {
      const message = await readErrorMessage(
        response,
        "Không thể cập nhật Tag cho khóa học",
      );

      return {
        success: false,
        message,
      };
    }

    const result = (await response.json()) as CourseTagUpdateResult;

    revalidatePath("/training-management/course-tag-assignment");

    return {
      success: true,
      message: result.message || "Cập nhật Tag cho khóa học thành công.",
      data: result,
    };
  } catch (error) {
    console.error("❌ Lỗi updateCourseTags:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Không thể cập nhật Tag cho khóa học.",
    };
  }
}
