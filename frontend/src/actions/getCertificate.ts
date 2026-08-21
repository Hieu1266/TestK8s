"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { CertificateItem } from "@/types/certificate";

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

export async function fetchUserCertificates(): Promise<CertificateItem[]> {
    try {
        const BACKEND_URL = process.env.NEXT_PUBLIC_PROGRESS_BACKEND_URL;
        const headers = await getAuthHeaders();
        const response = await fetch(`${BACKEND_URL}/certificate/get-list`, {
            method: "GET",
            // Nếu headers trả về null (do không có token), fallback về object rỗng
            headers: headers || { "Content-Type": "application/json" },
            next: { revalidate: 0 },
        });

        if (response.status === 404) {
            return [];
        }

        if (!response.ok) {
            throw new Error("Không thể tải danh sách chứng chỉ.");
        }

        return await response.json();
    } catch (error) {
        console.error("Lỗi tại fetchUserCertificates Action:", error);
        return [];
    }
}