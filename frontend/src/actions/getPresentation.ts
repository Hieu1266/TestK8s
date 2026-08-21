"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  Presentation,
  PresentationCreatePayload,
  PresentationSlide,
  PresentationSlideCreatePayload,
  PresentationSlideUpdatePayload,
} from "@/types/presentations";

const COURSE_URL =
  process.env.NEXT_PUBLIC_COURSE_BACKEND_URL || "http://localhost:8000";

type ActionResult<T = undefined> = {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
};

/**
 * Lấy access token được lưu trong cookie.
 */
async function getServerToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value || "";

  if (!token || token === "undefined" || token === "null") {
    return "";
  }

  return token.trim().replace(/^"|"$/g, "");
}

/**
 * Đọc thông báo lỗi trả về từ backend.
 */
async function readError(
  response: Response,
  fallback: string,
): Promise<string> {
  const body = await response.json().catch(() => ({}));

  return typeof body?.detail === "string" ? body.detail : fallback;
}

/**
 * Lấy Presentation và danh sách slide theo lesson.
 */
export async function getPresentationByLessonAction(
  lessonId: string,
): Promise<ActionResult<Presentation>> {
  try {
    const response = await fetch(
      `${COURSE_URL}/presentations/lesson/${lessonId}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: await readError(response, "Không thể tải bài trình chiếu."),
      };
    }

    const data: Presentation = await response.json();

    return {
      success: true,
      data,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Lỗi kết nối máy chủ.",
    };
  }
}

/**
 * Tạo Presentation cho một lesson.
 */
export async function createPresentationAction(
  payload: PresentationCreatePayload,
): Promise<ActionResult<Presentation>> {
  try {
    const token = await getServerToken();

    const response = await fetch(`${COURSE_URL}/presentations/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: await readError(response, "Không thể tạo bài trình chiếu."),
      };
    }

    const data: Presentation = await response.json();

    return {
      success: true,
      data,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Lỗi kết nối máy chủ.",
    };
  }
}

/**
 * Thêm slide vào Presentation.
 */
export async function createPresentationSlideAction(
  presentationId: string,
  payload: PresentationSlideCreatePayload,
): Promise<ActionResult<PresentationSlide>> {
  try {
    const token = await getServerToken();

    const response = await fetch(
      `${COURSE_URL}/presentations/${presentationId}/slides`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: await readError(response, "Không thể thêm slide."),
      };
    }

    const data: PresentationSlide = await response.json();

    return {
      success: true,
      data,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Lỗi kết nối máy chủ.",
    };
  }
}

/**
 * Cập nhật tiêu đề, nội dung hoặc thứ tự slide.
 */
export async function updatePresentationSlideAction(
  slideId: string,
  payload: PresentationSlideUpdatePayload,
): Promise<ActionResult<PresentationSlide>> {
  try {
    const token = await getServerToken();

    const response = await fetch(
      `${COURSE_URL}/presentations/slides/${slideId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: await readError(response, "Không thể cập nhật slide."),
      };
    }

    const data: PresentationSlide = await response.json();

    return {
      success: true,
      data,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Lỗi kết nối máy chủ.",
    };
  }
}

/**
 * Xóa một slide.
 */
export async function deletePresentationSlideAction(
  slideId: string,
): Promise<ActionResult> {
  try {
    const token = await getServerToken();

    const response = await fetch(
      `${COURSE_URL}/presentations/slides/${slideId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok && response.status !== 204) {
      return {
        success: false,
        status: response.status,
        error: await readError(response, "Không thể xóa slide."),
      };
    }

    return {
      success: true,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Lỗi kết nối máy chủ.",
    };
  }
}

/**
 * Cập nhật toàn bộ thứ tự slide sau khi kéo thả.
 */
export async function reorderPresentationSlidesAction(
  presentationId: string,
  slideIds: string[],
  pathForRevalidation?: string,
): Promise<ActionResult<PresentationSlide[]>> {
  try {
    const token = await getServerToken();

    const response = await fetch(
      `${COURSE_URL}/presentations/${presentationId}/slides/reorder`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slide_ids: slideIds,
        }),
      },
    );

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: await readError(response, "Không thể lưu thứ tự slide."),
      };
    }

    const data: PresentationSlide[] = await response.json();

    if (pathForRevalidation) {
      revalidatePath(pathForRevalidation);
    }

    return {
      success: true,
      data,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Lỗi kết nối máy chủ.",
    };
  }
}
