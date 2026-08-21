"use server";

import { cookies } from "next/headers";
import { Question } from "@/types/exam-management";

async function getServerToken() {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value || "";
    return token.trim().replace(/^"|"$/g, "");
}

const EXAM_QUIZ_URL = process.env.NEXT_PUBLIC_EXAM_BACKEND_URL;

// Lấy danh sách câu hỏi (Ngân hàng câu hỏi) của 1 subject.
// Việc tạo/sửa/xóa Question thuộc 1 trang quản lý riêng đã có sẵn (ngoài phạm vi lần này).
export const getQuestionsBySubjectAction = async (subjectId: string): Promise<Question[]> => {
    try {
        const token = await getServerToken();
        const res = await fetch(`${EXAM_QUIZ_URL}/questions/get-list/${subjectId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
        });

        if (!res.ok) {
            if (res.status === 403) throw new Error("Bạn không có quyền xem ngân hàng câu hỏi của môn học này.");
            throw new Error(`Lỗi gọi API: ${res.status}`);
        }
        return await res.json();
    } catch (error) {
        console.error("getQuestionsBySubjectAction Error:", error);
        throw error;
    }
};