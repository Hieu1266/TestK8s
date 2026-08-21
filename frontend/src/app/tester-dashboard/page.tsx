"use client";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  ArrowLeft,
  ChevronRight,
  GraduationCap,
  UserRound,
  PenTool,
  LayoutGrid,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";

import { getMyAssignedCourses, TesterCourseItem } from "@/actions/getTesterCourses";
import { submitCourseTestResult } from "@/actions/submitCourseTestResult";

const ROUTE_LEARNING_PREFIX = "/course";
const ROUTE_SUBMISSION_MANAGE = "/tester-dashboard/submission-manage";

/* =========================================================
   CONFIRM TEST MODAL
========================================================= */

function ConfirmTestModal({
  courseTitle,
  onClose,
  onSubmit,
  submitting,
}: {
  courseTitle: string;
  onClose: () => void;
  onSubmit: (status: "APPROVED" | "REJECTED", reason?: string) => void;
  submitting: boolean;
}) {
  const [selectedStatus, setSelectedStatus] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  function handleSubmit() {
    if (!selectedStatus) {
      setError("Vui lòng chọn trạng thái");
      return;
    }
    if (selectedStatus === "REJECTED" && reason.trim().length === 0) {
      setError("Vui lòng nhập lý do khi chọn Không đạt");
      return;
    }
    setError("");
    onSubmit(selectedStatus, selectedStatus === "REJECTED" ? reason.trim() : undefined);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-xl">
        <h3 className="text-lg font-black text-slate-800 mb-1">Xác nhận kết quả kiểm thử</h3>
        <p className="text-sm text-slate-500 font-medium mb-5 line-clamp-2">{courseTitle}</p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            type="button"
            onClick={() => setSelectedStatus("APPROVED")}
            className={`flex flex-col items-center gap-2 py-4 rounded-2xl border-2 font-bold text-sm transition-all ${selectedStatus === "APPROVED"
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-slate-200 text-slate-500 hover:border-emerald-200"
              }`}
          >
            <CheckCircle2 size={22} />
            Đạt
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatus("REJECTED")}
            className={`flex flex-col items-center gap-2 py-4 rounded-2xl border-2 font-bold text-sm transition-all ${selectedStatus === "REJECTED"
                ? "border-red-500 bg-red-50 text-red-700"
                : "border-slate-200 text-slate-500 hover:border-red-200"
              }`}
          >
            <AlertCircle size={22} />
            Không đạt
          </button>
        </div>

        {selectedStatus === "REJECTED" && (
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Nhập lý do khóa học không đạt..."
            rows={4}
            className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-700 focus:outline-none focus:border-red-300 mb-3"
          />
        )}

        {error && <p className="text-xs font-semibold text-red-500 mb-3">{error}</p>}

        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-[#0066FF] text-white font-bold text-sm hover:bg-[#0052cc] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   COURSE CARD
========================================================= */

function CourseCard({
  course,
  onOpen,
  onRequestConfirm,
}: {
  course: TesterCourseItem;
  onOpen: (courseId: string) => void;
  onRequestConfirm: (course: TesterCourseItem) => void;
}) {
  const progress = Math.round(course.current_overall_progress ?? 0);

  const needsConfirm =
    course.is_completed &&
    course.is_tested &&
    (course.testing_course_status === null || course.testing_course_status === "IN_PROGRESS");

  const hasReviewed =
    course.testing_course_status === "APPROVED" || course.testing_course_status === "REJECTED";

  return (
    <div className="group relative w-full text-left bg-white border border-slate-200 rounded-[2rem] p-7 md:p-8 min-h-[280px] transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_18px_40px_-15px_rgba(0,102,255,0.22)] overflow-hidden">
      <button
        type="button"
        onDoubleClick={() => onOpen(course.course_id)}
        className="absolute inset-0 z-0 cursor-pointer"
        aria-label={`Mở ${course.course_title}`}
      />

      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full opacity-50 group-hover:scale-110 transition-transform duration-500 pointer-events-none" />
      <ChevronRight size={21} className="absolute top-8 right-7 text-slate-300 group-hover:text-[#0066FF] group-hover:translate-x-1 transition-all z-10 pointer-events-none" />

      <div className="relative z-10 w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-[#0066FF] flex items-center justify-center group-hover:bg-[#0066FF] group-hover:text-white transition-all shadow-sm group-hover:shadow-md pointer-events-none">
        <GraduationCap size={28} />
      </div>

      <h3 className="relative z-10 mt-7 text-xl md:text-[21px] font-black text-slate-800 group-hover:text-[#0066FF] transition-colors line-clamp-2 pointer-events-none">
        {course.course_title}
      </h3>

      {/* TRẠNG THÁI + TIẾN ĐỘ */}
      <div className="relative z-10 mt-4 pointer-events-none">
        {course.is_completed ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
            <CheckCircle2 size={13} />
            Đã hoàn thành
          </span>
        ) : (
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1.5">
              <span className="inline-flex items-center gap-1.5">
                <Clock size={13} />
                Đang học
              </span>
              <span className="font-bold text-[#0066FF]">{progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#0066FF] transition-all"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* KHU VỰC XÁC NHẬN KIỂM THỬ */}
      {course.is_tested && course.is_completed && (
        <div className="relative z-20 mt-5">
          {hasReviewed ? (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${course.testing_course_status === "APPROVED"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : "bg-red-50 text-red-600 border-red-100"
                }`}
            >
              {course.testing_course_status === "APPROVED" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
              {course.testing_course_status === "APPROVED" ? "Đạt" : "Không đạt"}
            </span>
          ) : needsConfirm ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRequestConfirm(course);
              }}
              className="relative z-20 w-full py-2.5 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition-all"
            >
              Xác nhận kết quả kiểm thử
            </button>
          ) : null}
        </div>
      )}

      {/* <div className="relative z-10 mt-6 flex items-center gap-3 pointer-events-none">
        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50/80 backdrop-blur-sm text-[#0066FF] text-xs font-bold border border-blue-100/50">
          Học như học viên
        </span>
        <span className="text-xs text-slate-400 font-semibold group-hover:text-slate-600 transition-colors">
          Double click để mở
        </span>
      </div> */}
    </div>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

type ViewState = "MENU" | "COURSES";
type CourseFilter = "ALL" | "IN_PROGRESS" | "COMPLETED";

export default function TesterProfilePage() {
  const router = useRouter();

  const [currentView, setCurrentView] = useState<ViewState>("MENU");
  useEffect(() => {
    const shouldReturnToCourses = sessionStorage.getItem(
      "tester_return_to_courses"
    );

    if (shouldReturnToCourses === "1") {
      setCurrentView("COURSES");

      sessionStorage.removeItem("tester_return_to_courses");
    }
  }, []);



  const [courses, setCourses] = useState<TesterCourseItem[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [courseFilter, setCourseFilter] = useState<CourseFilter>("ALL");

  const [confirmTarget, setConfirmTarget] = useState<TesterCourseItem | null>(null);
  const [submittingConfirm, setSubmittingConfirm] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
    if (currentView !== "COURSES") return;

    let mounted = true;

    async function loadCourses() {
      setCoursesLoading(true);
      setCoursesError(null);

      const result = await getMyAssignedCourses();

      if (!mounted) return;

      if (result.success) {
        setCourses(result.list || []);
      } else {
        setCoursesError(result.message || "Không thể tải danh sách khóa học");
      }

      setCoursesLoading(false);
    }

    loadCourses();

    return () => {
      mounted = false;
    };
  }, [currentView]);

  const filteredCourses = courses.filter((course) => {
    if (courseFilter === "IN_PROGRESS") return !course.is_completed;
    if (courseFilter === "COMPLETED") return course.is_completed;
    return true;
  });

  const inProgressCount = courses.filter((c) => !c.is_completed).length;
  const completedCount = courses.filter((c) => c.is_completed).length;

  function handleOpenCourse(courseId: string) {
    sessionStorage.setItem("tester_return_to_courses", "1");

    router.push(`${ROUTE_LEARNING_PREFIX}/${courseId}?tester=1`);
  }

  async function handleSubmitConfirm(status: "APPROVED" | "REJECTED", reason?: string) {
    if (!confirmTarget) return;
    setSubmittingConfirm(true);
    setConfirmError(null);

    const result = await submitCourseTestResult({
      courseId: confirmTarget.course_id,
      status,
      reason,
    });

    setSubmittingConfirm(false);

    if (result.success) {
      setCourses((prev) =>
        prev.map((c) =>
          c.course_id === confirmTarget.course_id
            ? { ...c, testing_course_status: status }
            : c
        )
      );
      setConfirmTarget(null);
    } else {
      setConfirmError(result.message || "Có lỗi xảy ra, vui lòng thử lại");
    }
  }
 

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      {/* BANNER */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0066FF] via-[#0052cc] to-[#003d99] text-white pt-10 pb-20 px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/20 blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute -bottom-32 left-[20%] w-[360px] h-[360px] rounded-full bg-blue-300/10 blur-3xl" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-white/80 font-medium mb-6">
            {currentView != "MENU" && (
            <button onClick={() => setCurrentView("MENU")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 backdrop-blur-md hover:bg-white/20 hover:text-white transition-all">
              <ArrowLeft size={14} /> Trang chủ
            </button>
            )}
            <ChevronRight size={13} className="opacity-50" />
            <span className="flex items-center gap-1.5 font-semibold text-white bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/5"><UserRound size={14} /> Khu vực Tester</span>
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-[44px] font-black uppercase tracking-tight leading-tight drop-shadow-sm">
            TRUNG TÂM KIỂM THỬ
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] md:text-base text-blue-100 font-medium leading-relaxed opacity-90">
            Không gian làm việc chuyên biệt dành cho Tester. Quản lý việc học thử các khóa học và thực hiện công tác kiểm tra, chấm điểm bài thi dễ dàng hơn.
          </p>
        </div>
      </section>

      {/* KHU VỰC NỘI DUNG CHÍNH */}
      <main className="max-w-7xl mx-auto px-6 py-12 relative z-20 -mt-10 pb-24">

        {currentView === "MENU" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
            <button
              onClick={() => setCurrentView("COURSES")}
              className="group relative overflow-hidden flex flex-col items-center justify-center text-center bg-white border border-slate-100 rounded-[2.5rem] p-12 transition-all duration-500 hover:-translate-y-2 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(0,102,255,0.25)] hover:border-blue-200"
            >
              <div className="absolute -bottom-10 -right-10 text-blue-50/50 group-hover:text-blue-50 group-hover:scale-110 transition-all duration-700 ease-out z-0">
                <GraduationCap size={220} strokeWidth={1} />
              </div>

              <div className="relative z-10 w-24 h-24 rounded-[2rem] bg-gradient-to-br from-blue-50 to-blue-100/50 text-[#0066FF] border border-blue-100/50 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#0066FF] group-hover:text-white group-hover:shadow-[0_10px_20px_-10px_rgba(0,102,255,0.5)] transition-all duration-500 mb-8">
                <GraduationCap size={44} strokeWidth={2} />
              </div>

              <h3 className="relative z-10 text-[28px] font-black text-slate-800 mb-3 group-hover:text-[#0066FF] transition-colors tracking-tight">Khóa học được giao</h3>
              <p className="relative z-10 text-slate-500 font-medium text-[15px] px-4 leading-relaxed">Truy cập để học thử và trải nghiệm các khóa học với tư cách là học viên để kiểm tra luồng hệ thống.</p>

              <div className="relative z-10 mt-8 flex items-center gap-2 text-[#0066FF] font-bold text-sm opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                Mở danh sách <ArrowRight size={16} />
              </div>
            </button>

            <button
              onClick={() => router.push(ROUTE_SUBMISSION_MANAGE)}
              className="group relative overflow-hidden flex flex-col items-center justify-center text-center bg-white border border-slate-100 rounded-[2.5rem] p-12 transition-all duration-500 hover:-translate-y-2 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(249,115,22,0.25)] hover:border-orange-200"
            >
              <div className="absolute -bottom-10 -right-10 text-orange-50/50 group-hover:text-orange-50 group-hover:scale-110 transition-all duration-700 ease-out z-0">
                <PenTool size={220} strokeWidth={1} />
              </div>

              <div className="relative z-10 w-24 h-24 rounded-[2rem] bg-gradient-to-br from-orange-50 to-orange-100/50 text-orange-500 border border-orange-100/50 flex items-center justify-center group-hover:scale-110 group-hover:bg-orange-500 group-hover:text-white group-hover:shadow-[0_10px_20px_-10px_rgba(249,115,22,0.5)] transition-all duration-500 mb-8">
                <PenTool size={40} strokeWidth={2} />
              </div>

              <h3 className="relative z-10 text-[28px] font-black text-slate-800 mb-3 group-hover:text-orange-500 transition-colors tracking-tight">Bài thi được giao</h3>
              <p className="relative z-10 text-slate-500 font-medium text-[15px] px-4 leading-relaxed">Kiểm tra, theo dõi và thực hiện chấm điểm các bài tập, bài thi được phân công từ giảng viên.</p>

              <div className="relative z-10 mt-8 flex items-center gap-2 text-orange-500 font-bold text-sm opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                Mở danh sách <ArrowRight size={16} />
              </div>
            </button>
          </div>
        )}

        {currentView === "COURSES" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center">
                  <GraduationCap size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Khóa học được giao</h3>
                  <p className="text-sm text-slate-500 font-medium mt-1">Danh sách khóa học bạn cần kiểm tra</p>
                </div>
              </div>
              <button onClick={() => setCurrentView("MENU")} className="group flex items-center gap-2 px-5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-all hover:shadow-sm">
                <LayoutGrid size={16} className="text-slate-400 group-hover:text-[#0066FF] transition-colors" /> Quay lại Menu
              </button>
            </div>

            {!coursesLoading && !coursesError && courses.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { key: "ALL", label: `Tất cả (${courses.length})` },
                    { key: "IN_PROGRESS", label: `Đang học (${inProgressCount})` },
                    { key: "COMPLETED", label: `Đã hoàn thành (${completedCount})` },
                  ] as { key: CourseFilter; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setCourseFilter(tab.key)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${courseFilter === tab.key
                        ? "bg-[#0066FF] text-white shadow-sm"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {coursesLoading ? (
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500 font-semibold py-24 bg-white rounded-3xl border border-slate-200">
                <Loader2 size={18} className="animate-spin" />
                Đang tải danh sách khóa học...
              </div>
            ) : coursesError ? (
              <div className="flex flex-col items-center justify-center gap-3 text-center py-24 bg-white rounded-3xl border border-red-200">
                <AlertCircle size={32} className="text-red-500" />
                <p className="text-sm font-semibold text-red-500 max-w-md">{coursesError}</p>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
                <GraduationCap size={32} className="text-slate-300" />
                <p className="text-sm font-semibold text-slate-500">
                  {courses.length === 0
                    ? "Bạn chưa được giao khóa học nào."
                    : "Không có khóa học nào khớp bộ lọc."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCourses.map((course) => (
                  <CourseCard
                    key={course.course_id}
                    course={course}
                    onOpen={handleOpenCourse}
                    onRequestConfirm={(c) => {
                      setConfirmError(null);
                      setConfirmTarget(c);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {confirmTarget && (
        <ConfirmTestModal
          courseTitle={confirmTarget.course_title}
          submitting={submittingConfirm}
          onClose={() => {
            setConfirmTarget(null);
            setConfirmError(null);
          }}
          onSubmit={handleSubmitConfirm}
        />
      )}

      {confirmTarget && confirmError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-red-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg">
          {confirmError}
        </div>
      )}
    </div>
  );
}