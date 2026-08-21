"use server";

import { cookies } from "next/headers";

export interface ActionResponseList {
  success: boolean;
  message?: string;
  list?: any[];
}

export interface ActionResponseData {
  success: boolean;
  message?: string;
  data?: any;
}

const courseBackendUrl =
  process.env.NEXT_PUBLIC_COURSE_BACKEND_URL;

async function getAuthHeaders(): Promise<Record<string, string> | null> {
  const cookieStore = cookies();

  const resolvedCookies =
    typeof (cookieStore as any).then === "function"
      ? await cookieStore
      : cookieStore;

  const token = (resolvedCookies as any)
    .get("token")
    ?.value;

  if (!token) {
    return null;
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/* ============================================================
   LẤY DANH SÁCH KHÓA HỌC
   ============================================================ */

export async function getCoursesForApproval(): Promise<ActionResponseList> {
  try {
    const headers = await getAuthHeaders();

    if (!headers) {
      return {
        success: false,
        message: "Không tìm thấy Token đăng nhập!",
      };
    }

    if (!courseBackendUrl) {
      return {
        success: false,
        message:
          "NEXT_PUBLIC_COURSE_BACKEND_URL chưa được cấu hình!",
      };
    }

    console.log("========== GET COURSES FOR APPROVAL ==========");

    const response = await fetch(
      `${courseBackendUrl}/courses/?skip=0&limit=1000`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      }
    );

    console.log("courses status:", response.status);

    if (response.status === 401) {
      return {
        success: false,
        message:
          "Phiên đăng nhập hết hạn hoặc không có quyền!",
      };
    }

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => "");

      return {
        success: false,
        message: `Không thể tải danh sách khóa học: ${
          errorText || response.status
        }`,
      };
    }

    const data = await response.json();

 
    
    const courses = Array.isArray(data)
      ? data
      : Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.data)
      ? data.data
      : [];

    console.log("TOTAL COURSES:", courses.length);
    console.log("COURSES:", courses);

    return {
      success: true,
      list: courses,
    };
  } catch (error: any) {
    console.error(
      "getCoursesForApproval ERROR:",
      error
    );

    return {
      success: false,
      message:
        error?.message || "Lỗi kết nối mạng",
    };
  }
}



export async function getSubjectsForApproval(): Promise<ActionResponseList> {
  try {
    const headers = await getAuthHeaders();

    if (!headers) {
      return {
        success: false,
        message: "Không tìm thấy Token đăng nhập!",
      };
    }

    if (!courseBackendUrl) {
      return {
        success: false,
        message:
          "NEXT_PUBLIC_COURSE_BACKEND_URL chưa được cấu hình!",
      };
    }

    console.log(
      "========== GET SUBJECTS FOR APPROVAL =========="
    );

    const response = await fetch(
      `${courseBackendUrl}/subjects/?skip=0&limit=1000`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      }
    );

    console.log("subjects status:", response.status);

    if (response.status === 401) {
      return {
        success: false,
        message:
          "Phiên đăng nhập hết hạn hoặc không có quyền!",
      };
    }

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => "");

      return {
        success: false,
        message: `Không thể tải danh sách môn học: ${
          errorText || response.status
        }`,
      };
    }

    const data = await response.json();

    const subjects = Array.isArray(data)
      ? data
      : Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.data)
      ? data.data
      : [];

    console.log(
      "TOTAL SUBJECTS:",
      subjects.length
    );

    console.log("SUBJECTS:", subjects);

    return {
      success: true,
      list: subjects,
    };
  } catch (error: any) {
    console.error(
      "getSubjectsForApproval ERROR:",
      error
    );

    return {
      success: false,
      message:
        error?.message || "Lỗi kết nối mạng",
    };
  }
}

/* ============================================================
   LẤY TOÀN BỘ DATA CHO TRANG COURSE APPROVAL
   ============================================================ */

export async function getCourseApprovalData(): Promise<ActionResponseData> {
  try {
    const [coursesRes, subjectsRes] =
      await Promise.all([
        getCoursesForApproval(),
        getSubjectsForApproval(),
      ]);

    if (!coursesRes.success) {
      return {
        success: false,
        message:
          coursesRes.message ||
          "Không thể tải khóa học",
      };
    }

    if (!subjectsRes.success) {
      return {
        success: false,
        message:
          subjectsRes.message ||
          "Không thể tải môn học",
      };
    }

    const courses = coursesRes.list || [];
    const subjects = subjectsRes.list || [];

    /*
      Group SUBJECT theo COURSE.

      subject.course_id
             ↓
      course.course_id
    */

    const coursesWithSubjects = courses.map(
      (course: any) => {
        const courseId =
          course.course_id ??
          course.id;

        const courseSubjects = subjects.filter(
          (subject: any) =>
            String(
              subject.course_id
            ) === String(courseId)
        );

        return {
          ...course,
          course_id: courseId,
          subjects: courseSubjects,
        };
      }
    );

    console.log(
      "========== COURSE + SUBJECT =========="
    );

    coursesWithSubjects.forEach(
      (course: any) => {
        console.log({
          course_id: course.course_id,
          title: course.title,
          subject_count:
            course.subjects.length,
          subjects: course.subjects,
        });
      }
    );

    return {
      success: true,
      data: {
        courses: coursesWithSubjects,
        subjects,
      },
    };
  } catch (error: any) {
    console.error(
      "getCourseApprovalData ERROR:",
      error
    );

    return {
      success: false,
      message:
        error?.message ||
        "Lỗi tải dữ liệu khóa học",
    };
  }
}