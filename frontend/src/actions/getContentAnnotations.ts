"use server";

import { cookies } from "next/headers";

import {
  AnnotationContentType,
  ContentAnnotation,
  ContentAnnotationCreatePayload,
  ContentAnnotationUpdatePayload,
} from "@/types/content-annotations";

const COURSE_URL =
  process.env.NEXT_PUBLIC_COURSE_BACKEND_URL || "http://localhost:8001";

type ActionResult<T = undefined> = {
  success: boolean;

  data?: T;

  error?: string;

  status?: number;
};

async function getServerToken(): Promise<string> {
  const cookieStore = await cookies();

  const token = cookieStore.get("token")?.value || "";

  if (!token || token === "undefined" || token === "null") {
    return "";
  }

  return token.trim().replace(/^"|"$/g, "");
}

async function readError(
  response: Response,
  fallback: string,
): Promise<string> {
  const body = await response.json().catch(() => ({}));

  return typeof body?.detail === "string" ? body.detail : fallback;
}

export async function getContentAnnotationsAction(
  contentType: AnnotationContentType,
  contentId: string,
): Promise<ActionResult<ContentAnnotation[]>> {
  try {
    const token = await getServerToken();

    const response = await fetch(
      `${COURSE_URL}/content-annotations/content/${contentType}/${contentId}`,
      {
        method: "GET",

        headers: {
          "Content-Type": "application/json",

          Authorization: `Bearer ${token}`,
        },

        cache: "no-store",
      },
    );

    if (!response.ok) {
      return {
        success: false,

        status: response.status,

        error: await readError(response, "Không thể tải danh sách chú giải."),
      };
    }

    const data: ContentAnnotation[] = await response.json();

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

export async function createContentAnnotationAction(
  payload: ContentAnnotationCreatePayload,
): Promise<ActionResult<ContentAnnotation>> {
  try {
    const token = await getServerToken();

    if (!token) {
      return {
        success: false,
        status: 401,
        error: "Phiên đăng nhập đã hết hạn.",
      };
    }

    const response = await fetch(`${COURSE_URL}/content-annotations/`, {
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

        error: await readError(response, "Không thể tạo chú giải."),
      };
    }

    const data: ContentAnnotation = await response.json();

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

export async function updateContentAnnotationAction(
  annotationId: string,
  payload: ContentAnnotationUpdatePayload,
): Promise<ActionResult<ContentAnnotation>> {
  try {
    const token = await getServerToken();

    if (!token) {
      return {
        success: false,
        status: 401,
        error: "Phiên đăng nhập đã hết hạn.",
      };
    }

    const response = await fetch(
      `${COURSE_URL}/content-annotations/${annotationId}`,
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

        error: await readError(response, "Không thể cập nhật chú giải."),
      };
    }

    const data: ContentAnnotation = await response.json();

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

export async function deleteContentAnnotationAction(
  annotationId: string,
): Promise<ActionResult> {
  try {
    const token = await getServerToken();

    if (!token) {
      return {
        success: false,
        status: 401,
        error: "Phiên đăng nhập đã hết hạn.",
      };
    }

    const response = await fetch(
      `${COURSE_URL}/content-annotations/${annotationId}`,
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

        error: await readError(response, "Không thể xóa chú giải."),
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
