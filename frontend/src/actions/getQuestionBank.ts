"use server";

import { Question, SubjectInfo, QuestionTypeEnum } from "@/types/questions-bank";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const COURSE_API_URL = process.env.NEXT_PUBLIC_COURSE_BACKEND_URL;
const EXAM_QUIZ_URL = process.env.NEXT_PUBLIC_EXAM_BACKEND_URL;
// const EXAM_QUIZ_URL = process.env.NEXT_PUBLIC_EXAM_BACKEND_URL;

// Lấy Header xác thực bằng Cookie
async function getAuthHeaders(customToken?: string) {
  let token = customToken;

  if (!token) {
    const cookieStore = await cookies();
    token = cookieStore.get("access_token")?.value || cookieStore.get("token")?.value || "";
  }

  if (token) {
    token = token.replace(/^"|"/g, "").trim();
  }

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}


function mapQuestion(raw: any): Question {
  const maxPoints = Number(raw.max_points ?? 0);

  return {
    question_id: raw.question_id,
    subject_id: raw.subject_id,
    question_type: raw.question_type as QuestionTypeEnum,
    question_title: raw.question_title ?? "",
    content: raw.content ?? raw.body_content ?? "",
    max_points: maxPoints,
    options: Array.isArray(raw.options)
      ? raw.options
      : Array.isArray(raw.question_options)
        ? raw.question_options
        : [],
    rubrics: (
      Array.isArray(raw.rubrics)
        ? raw.rubrics
        : Array.isArray(raw.rubric_criterias)
          ? raw.rubric_criterias
          : Array.isArray(raw.rubric_criteria)
            ? raw.rubric_criteria
            : []
    ).map((r: any) => ({
      criteria_id: r.criteria_id,
      title: r.title ?? "",
      description: r.description ?? "",
      percentage: Number(r.percentage ?? 0),
      max_score: Number(r.max_score ?? (((Number(r.percentage) || 0) * maxPoints) / 100).toFixed(2)),
    })),
  } as any;
}

export async function getSubjectDetailAction(
  subjectId: string,
  token?: string
): Promise<SubjectInfo | null> {
  try {
    const headers = await getAuthHeaders(token);
    const res = await fetch(`${COURSE_API_URL}/subjects/${subjectId}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!res.ok) return null;
    const data = await res.json();

    let totalModules = data.totalModules ?? 0;
    try {
      const modRes = await fetch(`${COURSE_API_URL}/modules/get-list/${subjectId}`, {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (modRes.ok) {
        const modules = await modRes.json();
        if (Array.isArray(modules)) totalModules = modules.length;
      }
    } catch (e) { }

    return {
      subject_id: data.subject_id,
      course_id: data.course_id,
      title: data.title,
      code: data.code,
      description: data.description,
      instructor: data.instructor,
      image: data.image,
      order_index: data.order_index,
      status_id: data.status_id,
      totalModules,
    };
  } catch (error) {
    return null;
  }
}


export async function getQuestionDetailAction(
  questionId: string,
  token?: string
): Promise<Question | null> {
  try {
    const headers = await getAuthHeaders(token);
    const res = await fetch(`${EXAM_QUIZ_URL}/questions-bank/${questionId}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();
    return mapQuestion(data);
  } catch (error) {
    return null;
  }
}


export async function getQuestionsBySubjectAction(
  subjectId: string,
  token?: string
): Promise<Question[] | null> {
  try {
    const headers = await getAuthHeaders(token);
    const res = await fetch(`${EXAM_QUIZ_URL}/questions-bank/get-list/${subjectId}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map(mapQuestion);
  } catch (error) {
    return null;
  }
}


export async function saveQuestionAction(
  question: Question | any,
  token?: string
): Promise<{ success: boolean; error?: string; data?: Question }> {
  try {
    const isUpdate = Boolean(question.question_id && question.question_id !== "");
    const url = isUpdate
      ? `${EXAM_QUIZ_URL}/questions-bank/${question.question_id}`
      : `${EXAM_QUIZ_URL}/questions-bank/`;

    // 🎯 Backend router (question_bank.py) expose PUT cho update, không phải PATCH
    const method = isUpdate ? "PUT" : "POST";

    const body: Record<string, any> = {
      question_title: question.question_title ?? "",
      body_content: question.content || question.body_content || "",
      max_points: Number(question.max_points) || 10,
      question_type: question.question_type,
    };

    if (!isUpdate) {
      body.subject_id = question.subject_id;
    }

    if (question.question_type === "ESSAY") {
      body.rubrics = (question.rubrics || []).map((r: any) => {
        const item: any = {
          title: r.title,
          description: r.description || "",
          percentage: Number(r.percentage) || 0,
        };
        if (r.criteria_id && String(r.criteria_id).trim() !== "") {
          item.criteria_id = r.criteria_id;
        }
        return item;
      });
    } else {
      body.options = (question.options || []).map((o: any) => {
        const item: any = {
          option_text: o.option_text,
          is_correct: Boolean(o.is_correct),
        };
        if (o.option_id && String(o.option_id).trim() !== "") {
          item.option_id = o.option_id;
        }
        return item;
      });
    }

    const headers = await getAuthHeaders(token);

    const fullPayload: Record<string, any> = {
      question: body,
    };

    console.log("==========================================");
    console.log(`🚀 [NEXT.JS SERVER] GỬI REQUEST: ${method} -> ${url}`);
    console.log("📦 [NEXT.JS SERVER] PAYLOAD:", JSON.stringify(fullPayload, null, 2));

    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(fullPayload),
      cache: "no-store",
    });

    console.log(`📥 [NEXT.JS SERVER] BACKEND PHẢN HỒI STATUS: ${res.status}`);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("❌ [NEXT.JS SERVER] LỖI BACKEND:", errText);
      return { success: false, error: errText || `Lỗi ${res.status}` };
    }

    const data = await res.json().catch(() => null);

    if (question.subject_id) {
      revalidatePath(`/instructor-management/questions-bank/${question.subject_id}`);
    }

    return {
      success: true,
      data: data && typeof data === "object" ? mapQuestion(data) : undefined,
    };
  } catch (error: any) {
    console.error("💥 [NEXT.JS SERVER] LỖI EXCEPTION:", error);
    return { success: false, error: error?.message || "Lỗi không xác định" };
  }
}


export async function deleteQuestionAction(
  questionId: string,
  subjectId?: string, // 🎯 Thêm tham số subjectId để refresh cache trang
  token?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `${EXAM_QUIZ_URL}/questions-bank/${questionId}`;
    const headers = await getAuthHeaders(token);

    console.log("==========================================");
    console.log(`🗑️ [NEXT.JS SERVER] THỰC THI DELETE -> ${url}`);

    const res = await fetch(url, {
      method: "DELETE",
      headers,
      cache: "no-store",
    });

    console.log(`📥 [NEXT.JS SERVER] DELETE STATUS: ${res.status}`);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("❌ [NEXT.JS SERVER] DELETE FAILED:", errText);
      return { success: false, error: errText || `Xóa thất bại (${res.status})` };
    }

    // 🎯 Xóa Cache để UI cập nhật câu hỏi vừa bị biến mất lập tức
    if (subjectId) {
      revalidatePath(`/instructor-management/questions-bank/${subjectId}`);
    }

    console.log("✅ [NEXT.JS SERVER] XÓA CÂU HỎI THÀNH CÔNG");
    return { success: true };
  } catch (error: any) {
    console.error("💥 [NEXT.JS SERVER] LỖI DELETE EXCEPTION:", error);
    return { success: false, error: error?.message || "Lỗi khi xóa câu hỏi" };
  }
}

export const generateFillInBlankQuestions = async (
  lessonId: string,
  numQuestions: number = 5,
  maxPoints: number = 1.0,
  token?: string
) => {
  try {
    const headers = await getAuthHeaders(token);

    const response = await fetch(`${EXAM_QUIZ_URL}/questions/generate-from-lesson/${lessonId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        num_questions: numQuestions,
        max_points: maxPoints
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(" [NEXT.JS SERVER] GENERATE FAILED:", errText);
      throw new Error("Bài học đã hết câu hỏi để tạo hoặc số lượng câu hỏi yêu cầu quá nhiều");
    }

    return await response.json();
  } catch (error: any) {
    console.error(" [NEXT.JS SERVER] LỖI GENERATE EXCEPTION:", error);
    throw error;
  }
};