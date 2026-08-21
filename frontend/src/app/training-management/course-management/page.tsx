"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Clock,
  Award,
  ArrowLeft,
  ChevronRight,
  RefreshCw,
  Calendar,
  FileText,
  Type,
  X,
  Layers,
  Sparkles,
} from "lucide-react";

import { Course } from "@/types/course";

import { getCurriculums } from "@/actions/getCurriculum";

import {
  getCoursesAction,
  createCourseAction,
  updateCourseAction,
  deleteCourseAction,
} from "@/actions/getCourse";

// ============================================================
// UTILS
// ============================================================

const getCookie = (name: string): string | null => {
  if (typeof window === "undefined") return null;

  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));

  if (match) {
    return decodeURIComponent(match[2]);
  }

  return null;
};

const generateFallbackUUID = (): string => {
  return "00000000-0000-4000-8000-000000000000";
};

const isValidUUID = (uuid: string | null | undefined): boolean => {
  if (!uuid) return false;

  const regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  return regex.test(uuid);
};

// ============================================================
// ID NORMALIZER
// ============================================================

/**
 * Chuẩn hóa ID về string lowercase.
 *
 * Hỗ trợ:
 * - UUID string
 * - Mongo ObjectId dạng {$oid: "..."}
 * - object có toString()
 */
const normalizeId = (value: any): string => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object" && value?.$oid) {
    return String(value.$oid).trim().toLowerCase();
  }

  return String(value).trim().toLowerCase();
};

/**
 * Lấy curriculum_id thật của Curriculum.
 *
 * QUAN TRỌNG:
 * Không dùng fallback lung tung ngoài curriculum_id/curriculumId/id
 * để tránh lấy nhầm field.
 */
const getCurriculumId = (curriculum: any): string => {
  if (!curriculum) return "";

  return normalizeId(
    curriculum.curriculum_id ?? curriculum.curriculumId ?? curriculum.id,
  );
};

/**
 * Lấy curriculum_id từ Course.
 *
 * TUYỆT ĐỐI KHÔNG dùng course.id ở đây.
 *
 * course.id là ID của Course,
 * còn curriculum_id mới là ID Curriculum mà Course tham chiếu.
 */
const getCourseCurriculumId = (course: any): string => {
  if (!course) return "";

  return normalizeId(course.curriculum_id ?? course.curriculumId);
};

/**
 * Lấy course_id.
 */
const getCourseId = (course: any): string => {
  if (!course) return "";

  return normalizeId(course.course_id ?? course.courseId ?? course.id);
};

// ============================================================
// COMPONENT
// ============================================================

export default function CourseManagementPage() {
  // ============================================================
  // STATES
  // ============================================================

  const [courses, setCourses] = useState<Course[]>([]);
  const [curriculums, setCurriculums] = useState<any[]>([]);

  const [keyword, setKeyword] = useState("");

  const [filterType, setFilterType] = useState<
    "ALL" | "SHORT_TERM" | "LONG_TERM"
  >("ALL");

  const [showModal, setShowModal] = useState(false);

  const [editing, setEditing] = useState<Course | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const [selectedCourseRow, setSelectedCourseRow] = useState<Course | null>(
    null,
  );

  const [form, setForm] = useState({
    course_id: "",
    title: "",
    description: "",
    price: 0,
    curriculum_id: "",
  });

  // ============================================================
  // TOKEN
  // ============================================================

  const verifyToken = (): string | null => {
    const token = getCookie("token");

    if (!token) {
      return "bypass_token_dev";
    }

    return token;
  };

  // ============================================================
  // CURRICULUM USAGE
  // ============================================================

  const curriculumUsageMap = useMemo(() => {
    const usageCount = new Map<
      string,
      {
        count: number;
        courseTitles: string[];
      }
    >();

    courses.forEach((course) => {
      const curriculumId = getCourseCurriculumId(course);

      if (!curriculumId) return;

      const current = usageCount.get(curriculumId) || {
        count: 0,
        courseTitles: [],
      };

      current.count += 1;

      if (course.title) {
        current.courseTitles.push(course.title);
      }

      usageCount.set(curriculumId, current);
    });

    return usageCount;
  }, [courses]);

  // ============================================================
  // CURRICULUM MAP
  // ============================================================

  const curriculumMap = useMemo(() => {
    const map = new Map<
      string,
      {
        type: string;
        finishedMonths: string | number;
        name: string;
      }
    >();

    curriculums.forEach((curriculum) => {
      const curriculumId = getCurriculumId(curriculum);

      if (!curriculumId) return;

      const type =
        curriculum.course_type ?? curriculum.courseType ?? "SHORT_TERM";

      const finishedMonths =
        curriculum.course_finished_months !== undefined
          ? curriculum.course_finished_months
          : "Chưa rõ";

      const name = curriculum.curriculum_name || "N/A";

      map.set(curriculumId, {
        type: String(type).toUpperCase(),
        finishedMonths,
        name,
      });
    });

    return map;
  }, [curriculums]);

  // ============================================================
  // COURSE TYPE
  // ============================================================

  const getCourseTypeFromCurriculum = (curriculumId: any) => {
    const searchId = normalizeId(curriculumId);

    if (!searchId) {
      return "SHORT_TERM";
    }

    return curriculumMap.get(searchId)?.type || "SHORT_TERM";
  };

  // ============================================================
  // MONTH
  // ============================================================

  const getMonthFromCurriculum = (curriculumId: any): string => {
    const searchId = normalizeId(curriculumId);

    if (!searchId) {
      return "Chưa cập nhật";
    }

    const months = curriculumMap.get(searchId)?.finishedMonths;

    if (months === undefined || months === "Chưa rõ") {
      return "Chưa cập nhật";
    }

    return `${months} Tháng`;
  };

  // ============================================================
  // TYPE COUNTS
  // ============================================================

  const typeCounts = useMemo(() => {
    let shortTerm = 0;
    let longTerm = 0;

    courses.forEach((course) => {
      const curriculumId = getCourseCurriculumId(course);

      const currentType = getCourseTypeFromCurriculum(curriculumId);

      if (currentType === "LONG_TERM") {
        longTerm++;
      } else {
        shortTerm++;
      }
    });

    return {
      shortTerm,
      longTerm,
    };
  }, [courses, curriculumMap]);

  // ============================================================
  // FILTER COURSES
  // ============================================================

  const filteredCourses = useMemo(() => {
    if (!courses) return [];

    const lowerKeyword = keyword.trim().toLowerCase();

    return courses.filter((course) => {
      // --------------------------------------------------------
      // SEARCH
      // --------------------------------------------------------

      if (
        lowerKeyword &&
        course.title &&
        !course.title.toLowerCase().includes(lowerKeyword)
      ) {
        return false;
      }

      // --------------------------------------------------------
      // CURRICULUM
      // --------------------------------------------------------

      const curriculumId = getCourseCurriculumId(course);

      // --------------------------------------------------------
      // TYPE
      // --------------------------------------------------------

      const currentType = getCourseTypeFromCurriculum(curriculumId);

      if (filterType !== "ALL" && currentType !== filterType) {
        return false;
      }

      return true;
    });
  }, [courses, keyword, filterType, curriculumMap]);

  // ============================================================
  // LOAD DATA
  // ============================================================

  const fetchInitialData = async () => {
    setIsLoading(true);

    try {
      /**
       * Load Course + Curriculum song song.
       *
       * Không slice.
       * Không giới hạn 10 ở frontend.
       */
      const [coursesData, curriculumsData] = await Promise.all([
        getCoursesAction(),
        getCurriculums(),
      ]);

      // --------------------------------------------------------
      // NORMALIZE RESPONSE
      // --------------------------------------------------------

      const validCourses: Course[] = Array.isArray(coursesData)
        ? coursesData
        : [];

      const validCurriculums: any[] = Array.isArray(curriculumsData)
        ? curriculumsData
        : [];

      // --------------------------------------------------------
      // DEBUG
      // --------------------------------------------------------

      console.log("========== COURSE/CURRICULUM LOAD ==========");

      console.log("Courses:", validCourses.length);

      console.log("Curriculums:", validCurriculums.length);

      // --------------------------------------------------------
      // BUILD CURRICULUM MAP
      //
      // O(n) thay vì .find() lặp lại.
      // Quan trọng khi có 10, 50, 100+ record.
      // --------------------------------------------------------

      const curriculumLookup = new Map<string, any>();

      validCurriculums.forEach((curriculum: any) => {
        const curriculumId = getCurriculumId(curriculum);

        if (!curriculumId) {
          console.warn("Curriculum không có ID:", curriculum);

          return;
        }

        curriculumLookup.set(curriculumId, curriculum);
      });

      // --------------------------------------------------------
      // SYNCHRONIZE COURSE
      // --------------------------------------------------------

      const synchronizedData = validCourses.map((course: Course) => {
        /**
         * CHỈ lấy curriculum_id.
         *
         * KHÔNG BAO GIỜ:
         *
         * course.curriculum_id || course.id
         *
         * vì course.id là ID Course.
         */
        const curriculumId = getCourseCurriculumId(course);

        const targetCurriculum = curriculumId
          ? curriculumLookup.get(curriculumId)
          : undefined;

        if (curriculumId && !targetCurriculum) {
          console.warn("Không tìm thấy Curriculum cho Course:", {
            course_id: getCourseId(course),

            course_title: course.title,

            curriculum_id: curriculumId,
          });
        }

        return {
          ...course,

          modules: targetCurriculum?.modules ?? (course as any).modules ?? [],
        };
      });

      // --------------------------------------------------------
      // SET STATE
      // --------------------------------------------------------

      setCourses(synchronizedData);

      setCurriculums(validCurriculums);

      // --------------------------------------------------------
      // SELECT FIRST COURSE
      // --------------------------------------------------------

      if (synchronizedData.length > 0) {
        setSelectedCourseRow(synchronizedData[0]);
      } else {
        setSelectedCourseRow(null);
      }

      // --------------------------------------------------------
      // DEFAULT CURRICULUM
      // --------------------------------------------------------

      if (validCurriculums.length > 0 && !form.curriculum_id) {
        const firstCurriculum = validCurriculums[0];

        const firstCurriculumId = getCurriculumId(firstCurriculum);

        setForm((prev) => ({
          ...prev,
          curriculum_id: firstCurriculumId,
        }));
      }

      console.log("Synchronized courses:", synchronizedData.length);

      console.log("===========================================");
    } catch (error) {
      console.error("Lỗi tải Course/Curriculum:", error);

      setCourses([]);
      setCurriculums([]);
      setSelectedCourseRow(null);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    fetchInitialData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // RESET FORM
  // ============================================================

  const resetForm = () => {
    setShowModal(false);
    setEditing(null);

    const firstCurriculum =
      curriculums.length > 0 ? getCurriculumId(curriculums[0]) : "";

    setForm({
      course_id: "",
      title: "",
      description: "",
      price: 0,
      curriculum_id: firstCurriculum,
    });
  };

  // ============================================================
  // EDIT
  // ============================================================

  const handleEdit = (course: Course) => {
    setEditing(course);

    setForm({
      course_id: (course as any).course_id || (course as any).courseId || "",

      title: course.title || "",

      description: course.description || "",

      price: Number(course.price) || 0,

      curriculum_id: getCourseCurriculumId(course),
    });

    setShowModal(true);
  };

  // ============================================================
  // DELETE
  // ============================================================

  const handleDelete = async (id: string) => {
    const token = verifyToken();

    if (!token) return;

    if (confirm("Bạn có chắc chắn muốn xóa khóa học này khỏi hệ thống?")) {
      const res = await deleteCourseAction(id);

      if (res.success) {
        alert("Xóa khóa học thành công!");

        await fetchInitialData();
      } else {
        alert(`Không thể xóa bản ghi: ${res.error}`);
      }
    }
  };

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = async () => {
    if (!form.title || !form.curriculum_id) {
      alert("Vui lòng điền đầy đủ Tên khóa học và Chương trình đào tạo!");

      return;
    }

    setIsLoading(true);

    try {
      // --------------------------------------------------------
      // COURSE TYPE
      // --------------------------------------------------------

      const correctType = getCourseTypeFromCurriculum(form.curriculum_id);

      // --------------------------------------------------------
      // INSTRUCTOR
      // --------------------------------------------------------

      const rawUserId = getCookie("user_id") || "";

      const validInstructorId = isValidUUID(rawUserId)
        ? rawUserId
        : generateFallbackUUID();

      // --------------------------------------------------------
      // PAYLOAD
      // --------------------------------------------------------

      const payload: any = {
        curriculum_id: form.curriculum_id,

        title: form.title,

        course_type: correctType,

        description: form.description,

        price: Number(form.price),

        image_url: editing?.image_url || "",

        status_id: "COURSE_DRAFT",

        instructor_id: validInstructorId,
      };

      // --------------------------------------------------------
      // UPDATE / CREATE
      // --------------------------------------------------------

      let res;

      if (editing && form.course_id) {
        payload.total_lessons = (editing as any).total_lessons ?? 0;

        res = await updateCourseAction(form.course_id, payload);
      } else {
        payload.total_lessons = 0;

        res = await createCourseAction(payload);
      }

      // --------------------------------------------------------
      // SUCCESS
      // --------------------------------------------------------

      if (res?.success) {
        alert(
          editing
            ? "Cập nhật khóa học thành công!"
            : "Tạo khóa học mới thành công!",
        );

        resetForm();

        await fetchInitialData();
      } else {
        alert(`Thao tác thất bại: ${res?.error || "Lỗi không xác định"}`);
      }
    } catch (error: any) {
      alert(`Đã xảy ra lỗi hệ thống: ${error?.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-slate-50 text-[#1E293B] antialiased">
      <Navbar />

      {/* ======================================================
          HERO
      ======================================================= */}

      <section className="relative overflow-hidden bg-gradient-to-r from-[#0066FF] to-[#0052cc] px-6 pb-24 pt-10 text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white blur-3xl" />

          <div className="absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-cyan-200 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-white/80">
            <Link
              href="/training-management"
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 shadow-sm backdrop-blur-md transition-all hover:bg-white/20 hover:text-white"
            >
              <ArrowLeft size={14} />
              Quản lý đào tạo
            </Link>

            <ChevronRight size={12} className="opacity-50" />

            <span className="font-semibold tracking-wide text-white">
              Quản lý khóa học
            </span>
          </div>

          <div className="max-w-3xl">
            <h1 className="text-3xl font-black uppercase tracking-tight drop-shadow-md md:text-4xl">
              QUẢN LÝ KHÓA HỌC HỆ THỐNG
            </h1>

            <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-blue-100">
              Quản lý thông tin, học phí hiển thị và phân bổ đề cương chi tiết
              cho các lớp đào tạo.
            </p>
          </div>
        </div>
      </section>

      {/* ======================================================
          MAIN
      ======================================================= */}

      <main className="relative z-20 mx-auto -mt-14 w-full max-w-7xl px-6 pb-20">
        <div className="space-y-6 rounded-[2rem] border border-white bg-white/80 p-6 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] backdrop-blur-xl md:p-8">
          {/* ==================================================
              STATISTICS
          =================================================== */}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-sm">
              <p className="text-2xl font-black text-[#0066FF]">
                {courses?.length || 0}
              </p>

              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Tổng khóa học
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-sm">
              <p className="text-2xl font-black text-amber-500">
                {typeCounts.shortTerm}
              </p>

              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Khóa ngắn hạn
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-sm">
              <p className="text-2xl font-black text-purple-600">
                {typeCounts.longTerm}
              </p>

              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Khóa dài hạn
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-sm">
              <p className="text-2xl font-black text-emerald-600">
                {courses
                  ?.reduce(
                    (sum, course) => sum + (Number(course.price) || 0),
                    0,
                  )
                  .toLocaleString() || 0}
                đ
              </p>

              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Tổng giá trị lưu trữ
              </p>
            </div>
          </div>

          {/* ==================================================
              SEARCH / FILTER
          =================================================== */}

          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm md:flex-row">
            <div className="flex w-full flex-col items-center gap-3 sm:flex-row md:flex-1">
              <div className="relative w-full sm:w-80">
                <Search
                  size={16}
                  className="absolute left-3 top-2.5 text-slate-400"
                />

                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tìm tiêu đề khóa học..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#0066FF]"
                />
              </div>

              <div className="relative flex w-full items-center gap-1.5 sm:w-56">
                <Clock size={14} className="shrink-0 text-slate-400" />

                <select
                  value={filterType}
                  onChange={(e) =>
                    setFilterType(
                      e.target.value as "ALL" | "SHORT_TERM" | "LONG_TERM",
                    )
                  }
                  className="w-full cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0066FF]"
                >
                  <option value="ALL">Loại hình: Tất cả</option>

                  <option value="SHORT_TERM">Khóa ngắn hạn</option>

                  <option value="LONG_TERM">Khóa dài hạn</option>
                </select>
              </div>
            </div>

            <div className="flex w-full shrink-0 items-center justify-end md:w-auto">
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#0066FF] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/10 transition-all hover:bg-blue-700 active:scale-[0.98] md:w-auto"
              >
                <Plus size={16} />
                Thêm khóa học mới
              </button>
            </div>
          </div>

          {/* ==================================================
              COURSE LIST
          =================================================== */}

          {isLoading && courses.length === 0 ? (
            <div className="rounded-xl border bg-white p-12 text-center text-xs font-bold text-slate-400 shadow-sm">
              Đang tải dữ liệu khóa học...
            </div>
          ) : (
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
              {/* ==================================================
                  LEFT
              =================================================== */}

              <div className="space-y-4 lg:col-span-2">
                {filteredCourses.length === 0 ? (
                  <div className="rounded-xl border bg-white p-8 text-center text-xs italic text-slate-400 shadow-xs">
                    Không tìm thấy khóa học nào khớp với điều kiện lọc hiện tại.
                  </div>
                ) : (
                  filteredCourses.map((course) => {
                    const courseId = getCourseId(course);

                    const isSelected =
                      selectedCourseRow &&
                      getCourseId(selectedCourseRow) === courseId;

                    const currentCurriculumId = getCourseCurriculumId(course);

                    const currentType =
                      getCourseTypeFromCurriculum(currentCurriculumId);

                    const usage = currentCurriculumId
                      ? curriculumUsageMap.get(currentCurriculumId)
                      : undefined;

                    const isDuplicated = !!usage && usage.count > 1;

                    return (
                      <div
                        key={courseId || `course-${Math.random()}`}
                        onClick={() => setSelectedCourseRow(course)}
                        className={`relative cursor-pointer rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${
                          isSelected
                            ? "border-[#0066FF] bg-blue-50/10 shadow-md ring-2 ring-[#0066FF]/10"
                            : isDuplicated
                              ? "border-amber-300 bg-amber-50/5"
                              : "border-slate-200"
                        }`}
                      >
                        {isDuplicated && (
                          <span className="absolute right-2 top-2 rounded-sm bg-amber-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-amber-800">
                            Dùng chung Curriculum
                          </span>
                        )}

                        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                          <div className="flex min-w-0 flex-1 gap-2">
                            <div className="min-w-0 flex-1 space-y-1">
                              <h4 className="truncate pr-24 text-sm font-bold text-slate-900">
                                {course.title}
                              </h4>

                              <p className="line-clamp-1 text-xs text-slate-400">
                                {course.description || "Chưa cập nhật mô tả."}
                              </p>

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-[11px] font-medium text-slate-500">
                                <span className="font-semibold text-slate-700">
                                  {(Number(course.price) || 0).toLocaleString()}
                                  đ
                                </span>

                                <span
                                  className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                    currentType === "LONG_TERM"
                                      ? "bg-purple-50 text-purple-600"
                                      : "bg-blue-50 text-[#0066FF]"
                                  }`}
                                >
                                  {currentType === "LONG_TERM"
                                    ? "DÀI HẠN"
                                    : "NGẮN HẠN"}
                                </span>

                                <span className="flex items-center gap-1 font-bold text-slate-400">
                                  <Calendar size={12} />

                                  {getMonthFromCurriculum(currentCurriculumId)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* ==================================================
                                ACTIONS
                            =================================================== */}

                          <div
                            className="flex shrink-0 items-center gap-1 pt-4 sm:pt-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleEdit(course)}
                              className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-700 transition hover:bg-slate-50"
                            >
                              <Pencil size={12} />
                              Sửa
                            </button>

                            <button
                              onClick={() => handleDelete(course.course_id)}
                              className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-rose-600 transition hover:bg-slate-50"
                            >
                              <Trash2 size={12} />
                              Xóa
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* ==================================================
                  RIGHT DETAIL
              =================================================== */}

              <div className="sticky top-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="absolute left-0 top-0 h-full w-1.5 bg-[#0066FF]" />

                <p className="mb-3.5 pl-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Thông tin chi tiết đính kèm
                </p>

                {selectedCourseRow ? (
                  <div className="space-y-4 pl-1">
                    <div>
                      <span className="block text-[10px] font-bold uppercase text-slate-400">
                        Đang xem:
                      </span>

                      <h3 className="mt-0.5 text-sm font-extrabold leading-snug text-slate-900">
                        {selectedCourseRow.title}
                      </h3>
                    </div>

                    <div className="space-y-2.5 border-t pt-3 text-xs font-medium text-slate-600">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-slate-400" />

                        <span>
                          Loại hình khóa học:{" "}
                          <strong className="text-slate-800">
                            {getCourseTypeFromCurriculum(
                              getCourseCurriculumId(selectedCourseRow),
                            ) === "LONG_TERM"
                              ? "DÀI HẠN"
                              : "NGẮN HẠN"}
                          </strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Award size={14} className="text-slate-400" />

                        <span>
                          Chi phí khóa:{" "}
                          <strong className="text-emerald-600">
                            {(
                              Number(selectedCourseRow.price) || 0
                            ).toLocaleString()}
                            đ
                          </strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-blue-500" />

                        <span>
                          Thời gian đào tạo:{" "}
                          <strong className="text-slate-800">
                            {getMonthFromCurriculum(
                              getCourseCurriculumId(selectedCourseRow),
                            )}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* ==================================================
                        MODULES
                    =================================================== */}

                    <div className="border-t pt-3">
                      <span className="mb-2 block text-[10px] font-bold uppercase text-slate-400">
                        Đề cương bài học đa tầng:
                      </span>

                      <div className="max-h-80 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                        {(selectedCourseRow as any).modules &&
                        (selectedCourseRow as any).modules.length > 0 ? (
                          (selectedCourseRow as any).modules.map(
                            (mod: any, mIdx: number) => (
                              <div
                                key={mod.module_id || `module-${mIdx}`}
                                className="rounded-lg border border-slate-100 bg-slate-50 p-2"
                              >
                                <p className="flex items-center gap-1 text-xs font-bold text-slate-800">
                                  {mod.title}
                                </p>

                                <ul className="ml-1.5 mt-1 space-y-1 border-l-2 border-slate-200 pl-4">
                                  {Array.isArray(mod.lessons) &&
                                    mod.lessons.map(
                                      (lesson: any, lessonIndex: number) => (
                                        <li
                                          key={
                                            lesson.lesson_id ||
                                            `lesson-${lessonIndex}`
                                          }
                                          className="flex items-center justify-between text-[11px] text-slate-600"
                                        >
                                          <span>{lesson.title}</span>

                                          <span className="font-mono text-[10px] text-slate-400">
                                            {lesson.duration}
                                          </span>
                                        </li>
                                      ),
                                    )}
                                </ul>
                              </div>
                            ),
                          )
                        ) : (
                          <p className="text-[11px] italic text-slate-400">
                            Chương trình đào tạo này hiện chưa cấu hình bài học.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="py-8 text-center text-xs italic text-slate-400">
                    Vui lòng chọn một khóa học bên danh sách để xem.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ======================================================
              MODAL
          ======================================================= */}

          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 text-slate-800 backdrop-blur-[6px] transition-all duration-300">
              <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)]">
                {/* ==================================================
                    MODAL HEADER
                =================================================== */}

                <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-xl p-2.5 text-white shadow-xs ${
                        editing
                          ? "bg-amber-500 shadow-amber-500/20"
                          : "bg-[#0066FF] shadow-blue-500/20"
                      }`}
                    >
                      {editing ? <Sparkles size={18} /> : <Plus size={18} />}
                    </div>

                    <div>
                      <h2 className="text-base font-extrabold tracking-tight text-slate-900">
                        {editing ? "Cập nhật khóa học" : "Tạo khóa học mới"}
                      </h2>
                    </div>
                  </div>

                  <button
                    onClick={resetForm}
                    className="cursor-pointer rounded-xl border-none bg-transparent p-2 text-slate-400 transition-all hover:bg-slate-100/80 hover:text-slate-600 active:scale-95"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* ==================================================
                    FORM
                =================================================== */}

                <div className="flex-1 space-y-5 overflow-y-auto bg-white p-6 custom-scrollbar">
                  {/* CURRICULUM */}

                  <div className="space-y-2">
                    <label className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Layers size={13} className="text-slate-400" />
                        Chương trình gốc (Curriculum)
                        <span className="text-rose-500">*</span>
                      </span>

                      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold normal-case text-amber-600">
                        Khuyến nghị: 1 Curriculum nên đi với 1 khóa
                      </span>
                    </label>

                    <select
                      value={form.curriculum_id}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          curriculum_id: e.target.value,
                        })
                      }
                      className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-3 text-xs font-semibold text-slate-800 transition-all duration-200 hover:border-slate-300 focus:border-[#0066FF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066FF]/10"
                      required
                    >
                      <option value="" disabled>
                        -- Chọn một chương trình đào tạo có sẵn --
                      </option>

                      {curriculums.map((curriculum) => {
                        const curriculumId = getCurriculumId(curriculum);

                        const typeBadge = String(
                          curriculum.course_type ??
                            curriculum.courseType ??
                            "SHORT_TERM",
                        ).toUpperCase();

                        const usage = curriculumUsageMap.get(curriculumId);

                        const isUsed = !!usage && usage.count > 0;

                        const usageText = isUsed
                          ? ` — Đã dùng bởi: ${usage.courseTitles.join(", ")}`
                          : " — Chưa sử dụng";

                        return (
                          <option
                            key={curriculumId}
                            value={curriculumId}
                            className={
                              isUsed
                                ? "bg-amber-50/30 text-slate-400"
                                : "font-bold text-slate-800"
                            }
                          >
                            {curriculum.curriculum_name} (
                            {typeBadge === "LONG_TERM" ? "DÀI HẠN" : "NGẮN HẠN"}
                            ){usageText}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* TITLE */}

                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <Type size={13} className="text-slate-400" />
                      Tên thương mại khóa học
                      <span className="text-rose-500">*</span>
                    </label>

                    <input
                      value={form.title}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          title: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-3 text-xs font-medium text-slate-800 transition-all duration-200 hover:border-slate-300 focus:border-[#0066FF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066FF]/10"
                      placeholder="Nhập tên khóa học (Ví dụ: Lập trình Next.js ứng dụng thực tế)"
                      required
                    />
                  </div>

                  {/* PRICE */}

                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <Award size={13} className="text-slate-400" />
                      Giá bán / Học phí công bố
                    </label>

                    <div className="relative rounded-xl">
                      <input
                        type="number"
                        value={form.price}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            price: Number(e.target.value),
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-3.5 pr-8 text-xs font-bold text-emerald-600 transition-all duration-200 hover:border-slate-300 focus:border-[#0066FF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066FF]/10"
                      />

                      <span className="absolute right-3.5 top-3.5 select-none text-xs font-extrabold text-slate-400">
                        đ
                      </span>
                    </div>
                  </div>

                  {/* DESCRIPTION */}

                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <FileText size={13} className="text-slate-400" />
                      Mô tả vắn tắt khóa học
                    </label>

                    <textarea
                      rows={4}
                      value={form.description}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          description: e.target.value,
                        })
                      }
                      className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs font-medium leading-relaxed text-slate-700 transition-all duration-200 hover:border-slate-300 focus:border-[#0066FF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066FF]/10"
                      placeholder="Ghi chú ngắn về mục tiêu, lộ trình học tập để học viên dễ nắm bắt thông tin..."
                    />
                  </div>
                </div>

                {/* ==================================================
                    FOOTER
                =================================================== */}

                <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-2xs transition-all hover:bg-slate-100 active:scale-95"
                  >
                    Đóng lại
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border-none bg-[#0066FF] px-5 py-2.5 text-xs font-extrabold text-white shadow-md shadow-blue-500/10 transition-all hover:bg-blue-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Đang thực hiện...
                      </>
                    ) : (
                      <>{editing ? "Cập nhật dữ liệu" : "Lưu khóa học"}</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
