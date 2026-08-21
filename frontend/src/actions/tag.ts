"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import type { TagCreate, TagItem, TagName, TagUpdate } from "@/types/tag";

const COURSE_API_URL =
  process.env.NEXT_PUBLIC_COURSE_BACKEND_URL || "http://localhost:8000";

const TAG_API_URL = `${COURSE_API_URL}/tags`;

export interface TagActionResponse {
  success: boolean;
  message: string;
}

interface FastAPIValidationError {
  loc?: Array<string | number>;
  msg?: string;
  type?: string;
}

interface FastAPIErrorResponse {
  detail?: string | FastAPIValidationError[];
  message?: string;
}

/**
 * Lấy access token từ cookie phía server.
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
 * Đọc thông báo lỗi do FastAPI trả về.
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
    // Backend không trả về JSON.
  }

  if (response.status === 401) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }

  if (response.status === 403) {
    return "Bạn không có quyền thực hiện thao tác này.";
  }

  if (response.status === 404) {
    return "Không tìm thấy dữ liệu Tag.";
  }

  if (response.status === 409) {
    return "Tên Tag đã được sử dụng.";
  }

  if (response.status === 422) {
    return "Dữ liệu gửi đến backend không hợp lệ.";
  }

  return `${defaultMessage}. Mã lỗi: ${response.status}`;
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
 * Lấy danh sách Tag.
 *
 * GET /tags/get-list?skip=0&limit=100
 */
export async function getTags(
  skip: number = 0,
  limit: number = 10,
): Promise<TagItem[]> {
  try {
    const token = await getServerToken();

    const query = new URLSearchParams({
      skip: String(skip),
      limit: String(limit),
    });

    const response = await fetch(
      `${TAG_API_URL}/get-list?${query.toString()}`,
      {
        method: "GET",
        headers: createAuthHeaders(token),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const message = await readErrorMessage(
        response,
        "Không thể lấy danh sách Tag",
      );

      throw new Error(message);
    }

    return (await response.json()) as TagItem[];
  } catch (error) {
    console.error("❌ Lỗi getTags:", error);

    /*
     * Không throw ra ngoài để tránh Next.js hiện màn hình
     * Console Error toàn trang.
     */
    return [];
  }
}

/**
 * Lấy top 5 Tag.
 *
 * GET /tags/top-5
 *
 * Endpoint này không yêu cầu xác thực.
 */
export async function getTop5Tags(): Promise<TagName[]> {
  try {
    const response = await fetch(`${TAG_API_URL}/top-5`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const message = await readErrorMessage(
        response,
        "Không thể lấy top 5 Tag",
      );

      throw new Error(message);
    }

    return (await response.json()) as TagName[];
  } catch (error) {
    console.error("❌ Lỗi getTop5Tags:", error);
    return [];
  }
}

/**
 * Tạo Tag mới.
 *
 * POST /tags/
 */
export async function createTag(
  tagData: TagCreate,
): Promise<TagActionResponse> {
  try {
    const token = await getServerToken();
    const tagName = tagData.tag_name.trim();

    if (!tagName) {
      return {
        success: false,
        message: "Tên Tag không được để trống.",
      };
    }

    const requestBody: TagCreate = {
      tag_name: tagName,
      description:
        typeof tagData.description === "string"
          ? tagData.description.trim() || null
          : null,
    };

    const response = await fetch(`${TAG_API_URL}/`, {
      method: "POST",
      headers: createAuthHeaders(token, true),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const message = await readErrorMessage(response, "Không thể tạo Tag");

      return {
        success: false,
        message,
      };
    }

    const result = await response.json();

    revalidatePath("/training-management/tag-management");

    return {
      success: true,
      message: result.message || "Tạo Tag thành công.",
    };
  } catch (error) {
    console.error("❌ Lỗi createTag:", error);

    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể tạo Tag.",
    };
  }
}

/**
 * Cập nhật Tag.
 *
 * PUT /tags/
 */
export async function updateTag(
  tagData: TagUpdate,
): Promise<TagActionResponse> {
  try {
    const token = await getServerToken();
    const tagId = tagData.tag_id.trim();

    if (!tagId) {
      return {
        success: false,
        message: "Tag ID không hợp lệ.",
      };
    }

    if (tagData.tag_name !== undefined && !tagData.tag_name.trim()) {
      return {
        success: false,
        message: "Tên Tag không được để trống.",
      };
    }

    const requestBody: TagUpdate = {
      tag_id: tagId,

      tag_name:
        tagData.tag_name !== undefined ? tagData.tag_name.trim() : undefined,

      description:
        tagData.description === undefined
          ? undefined
          : typeof tagData.description === "string"
            ? tagData.description.trim() || null
            : null,
    };

    const response = await fetch(`${TAG_API_URL}/`, {
      method: "PUT",
      headers: createAuthHeaders(token, true),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const message = await readErrorMessage(
        response,
        "Không thể cập nhật Tag",
      );

      return {
        success: false,
        message,
      };
    }

    const result = await response.json();

    revalidatePath("/training-management/tag-management");

    return {
      success: true,
      message: result.message || "Cập nhật Tag thành công.",
    };
  } catch (error) {
    console.error("❌ Lỗi updateTag:", error);

    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể cập nhật Tag.",
    };
  }
}

/**
 * Xóa Tag.
 *
 * DELETE /tags/{tag_id}
 */
export async function deleteTag(tagId: string): Promise<TagActionResponse> {
  try {
    const token = await getServerToken();
    const normalizedTagId = tagId.trim();

    if (!normalizedTagId) {
      return {
        success: false,
        message: "Tag ID không hợp lệ.",
      };
    }

    const response = await fetch(
      `${TAG_API_URL}/${encodeURIComponent(normalizedTagId)}`,
      {
        method: "DELETE",
        headers: createAuthHeaders(token),
      },
    );

    if (!response.ok) {
      const message = await readErrorMessage(response, "Không thể xóa Tag");

      return {
        success: false,
        message,
      };
    }

    const result = await response.json();

    revalidatePath("/training-management/tag-management");

    return {
      success: true,
      message: result.message || "Xóa Tag thành công.",
    };
  } catch (error) {
    console.error("❌ Lỗi deleteTag:", error);

    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể xóa Tag.",
    };
  }
}
