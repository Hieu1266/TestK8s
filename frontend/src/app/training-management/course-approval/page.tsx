"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";

import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Clock,
  GraduationCap,
  Loader2,
  Search,
  ShieldCheck,
  TestTube2,
  Trophy,
  UserPlus,
  UsersRound,
} from "lucide-react";

import { getCourseApprovalData } from "@/actions/getSyllabusApproval";

import { getAllTesters } from "@/actions/getTester";

import { enrollTesterToCourse } from "@/actions/getenrollTester";

import {
  getTestersCourseStatusBulk,
  TesterCourseStatus,
} from "@/actions/getTesterProgress";

import { approveCourseAction } from "@/actions/getCourse";

/* ============================================================
   TYPES
   ============================================================ */

type Subject = {
  subject_id: string;
  title: string;
  description: string | null;
  course_id: string;
};

type Course = {
  course_id: string;
  title: string;
  description?: string | null;
  status_id?: string;
  subjects: Subject[];
};

type TesterUser = {
  user_id: string;
  username: string;
  email: string;
  role_id: number;
};

type AssignMessage = {
  type: "success" | "error";
  text: string;
  testerId: string;
};

type ApproveMessage = {
  type: "success" | "error";
  text: string;
};

/* ============================================================
   INNER COMPONENT (Sử dụng useSearchParams)
   ============================================================ */

function CourseApprovalContent() {
  /* ============================================================
     URL STATE
     ============================================================ */

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /* ============================================================
     STATE
     ============================================================ */

  const [courses, setCourses] = useState<Course[]>([]);
  const [testers, setTesters] = useState<TesterUser[]>([]);

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ---------------- GÁN TESTER ---------------- */

  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignedMap, setAssignedMap] = useState<Record<string, boolean>>({});
  const [assignMessage, setAssignMessage] = useState<AssignMessage | null>(
    null,
  );

  /* ---------------- TIẾN ĐỘ HỌC CỦA TESTER ---------------- */

  const [progressMap, setProgressMap] = useState<
    Record<string, TesterCourseStatus>
  >({});
  const [progressLoading, setProgressLoading] = useState(false);

  /* ---------------- DUYỆT KHÓA HỌC ---------------- */

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approveMessage, setApproveMessage] = useState<ApproveMessage | null>(
    null,
  );

  /* ============================================================
     LOAD DATA
     ============================================================ */

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [courseResult, testerResult] = await Promise.all([
          getCourseApprovalData(),
          getAllTesters(),
        ]);

        if (!mounted) return;

        if (!courseResult.success) {
          setError(courseResult.message || "Không thể tải khóa học");
          return;
        }

        const courseList = courseResult.data?.courses || [];
        setCourses(courseList);

        if (courseList.length > 0) {
          const courseIdFromUrl = searchParams.get("courseId");
          const courseExistsInUrl =
            courseIdFromUrl &&
            courseList.some(
              (course: any) => course.course_id === courseIdFromUrl,
            );

          setSelectedCourseId(
            courseExistsInUrl
              ? (courseIdFromUrl as string)
              : courseList[0].course_id,
          );
        }

        if (testerResult.success) {
          setTesters(testerResult.list || []);
        }
      } catch (err: any) {
        console.error("LOAD COURSE APPROVAL ERROR:", err);

        if (mounted) {
          setError(err?.message || "Không thể tải dữ liệu");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  /* ============================================================
     SELECTED COURSE
     ============================================================ */

  const selectedCourse = useMemo(() => {
    return (
      courses.find((course) => course.course_id === selectedCourseId) || null
    );
  }, [courses, selectedCourseId]);

  /* ============================================================
     SEARCH COURSE
     ============================================================ */

  const filteredCourses = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    if (!keyword) {
      return courses;
    }

    return courses.filter((course) => {
      return (
        course.title?.toLowerCase().includes(keyword) ||
        course.course_id?.toLowerCase().includes(keyword)
      );
    });
  }, [courses, searchKeyword]);

  /* ============================================================
     SUBJECTS
     ============================================================ */

  const selectedSubjects = selectedCourse?.subjects || [];

  /* ============================================================
     ĐIỀU KIỆN DUYỆT KHÓA HỌC
     ============================================================ */

  const enrolledTesters = useMemo(() => {
    return testers.filter((tester) => progressMap[tester.user_id]?.enrolled);
  }, [testers, progressMap]);

  const hasApprovedTester = useMemo(() => {
    return testers.some(
      (tester) =>
        progressMap[tester.user_id]?.testing_course_status === "APPROVED",
    );
  }, [testers, progressMap]);

  /* ============================================================
     CHỌN KHÓA HỌC
     ============================================================ */

  function handleSelectCourse(courseId: string) {
    setSelectedCourseId(courseId);

    const params = new URLSearchParams(searchParams.toString());
    params.set("courseId", courseId);

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  /* ============================================================
     KHI ĐỔI KHÓA HỌC
     ============================================================ */

  useEffect(() => {
    setAssignMessage(null);
    setApproveMessage(null);
  }, [selectedCourseId]);

  /* ============================================================
     LOAD TIẾN ĐỘ TESTER
     ============================================================ */

  useEffect(() => {
    if (!selectedCourseId || testers.length === 0) {
      setProgressMap({});
      return;
    }

    let mounted = true;

    async function loadProgress() {
      setProgressLoading(true);

      const ids = testers.map((t) => t.user_id);
      const result = await getTestersCourseStatusBulk(
        ids,
        selectedCourseId as string,
      );

      if (mounted) {
        setProgressMap(result);
        setProgressLoading(false);
      }
    }

    loadProgress();

    return () => {
      mounted = false;
    };
  }, [selectedCourseId, testers]);

  /* ============================================================
     GÁN TESTER
     ============================================================ */

  async function handleAssignTester(testerId: string) {
    if (!selectedCourseId) return;

    setAssigningId(testerId);
    setAssignMessage(null);

    try {
      const result = await enrollTesterToCourse(testerId, selectedCourseId);

      if (result.success) {
        setAssignedMap((prev) => ({
          ...prev,
          [`${testerId}_${selectedCourseId}`]: true,
        }));

        setAssignMessage({
          type: "success",
          text: "Đã gán tester vào khóa học",
          testerId,
        });

        setProgressMap((prev) => ({
          ...prev,
          [testerId]: {
            enrolled: true,
            is_completed: false,
            current_overall_progress: 0,
            testing_course_status: null,
          },
        }));
      } else {
        setAssignMessage({
          type: "error",
          text: result.message || "Gán tester thất bại",
          testerId,
        });
      }
    } finally {
      setAssigningId(null);
    }
  }

  /* ============================================================
     DUYỆT KHÓA HỌC
     ============================================================ */

  async function handleApproveCourse(courseId: string) {
    if (!hasApprovedTester) {
      setApproveMessage({
        type: "error",
        text: 'Cần ít nhất một tester đánh giá "Đạt" trước khi duyệt khóa học.',
      });
      return;
    }

    setApprovingId(courseId);
    setApproveMessage(null);

    try {
      const result = await approveCourseAction(courseId);

      if (result.success) {
        setApproveMessage({
          type: "success",
          text: result.message || "Đã duyệt khóa học thành công.",
        });

        setCourses((prev) =>
          prev.map((course) =>
            course.course_id === courseId
              ? {
                  ...course,
                  status_id: "COURSE_REGISTRATION",
                }
              : course,
          ),
        );
      } else {
        setApproveMessage({
          type: "error",
          text: result.message || "Duyệt khóa học thất bại.",
        });
      }
    } finally {
      setApprovingId(null);
    }
  }

  /* ============================================================
     LOADING & ERROR STATES
     ============================================================ */

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="mx-auto animate-spin text-blue-600" />
          <p className="mt-3 text-sm font-medium text-slate-500">
            Đang tải dữ liệu khóa học...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle size={40} className="mx-auto text-red-500" />
          <h2 className="mt-4 text-lg font-bold text-slate-900">
            Không thể tải dữ liệu
          </h2>
          <p className="mt-2 text-sm text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative z-20 mx-auto -mt-14 w-full max-w-7xl px-6 pb-20">
      <div className="rounded-[2rem] border border-white bg-white/90 p-6 shadow-xl backdrop-blur-xl md:p-8">
        {/* STATISTICS */}
        <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Tổng khóa học
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {courses.length}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <GraduationCap size={24} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Tổng môn học
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {courses.reduce(
                    (total, course) => total + course.subjects.length,
                    0,
                  )}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <BookOpen size={24} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Nhân sự kiểm thử
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {testers.length}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <TestTube2 size={24} />
              </div>
            </div>
          </div>
        </section>

        {/* TWO COLUMNS */}
        <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* LEFT SIDEBAR */}
          <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-6">
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900">Khóa học</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {filteredCourses.length} khóa học
                  </p>
                </div>
                <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600">
                  {courses.length}
                </span>
              </div>

              <div className="relative mt-4">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder="Tìm khóa học..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="max-h-[700px] space-y-3 overflow-y-auto p-3">
              {filteredCourses.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
                  <Search size={28} className="mx-auto text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-slate-600">
                    Không tìm thấy khóa học
                  </p>
                </div>
              ) : (
                filteredCourses.map((course) => {
                  const selected = course.course_id === selectedCourseId;

                  return (
                    <button
                      type="button"
                      key={course.course_id}
                      onClick={() => handleSelectCourse(course.course_id)}
                      className={`group w-full rounded-xl border p-4 text-left transition-all ${
                        selected
                          ? "border-blue-500 bg-blue-50/70 shadow-sm ring-4 ring-blue-50"
                          : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className={`line-clamp-2 text-sm font-bold leading-5 ${
                              selected ? "text-blue-700" : "text-slate-900"
                            }`}
                          >
                            {course.title}
                          </p>
                        </div>
                        <ChevronRight
                          size={18}
                          className={`mt-0.5 shrink-0 ${
                            selected ? "text-blue-600" : "text-slate-300"
                          }`}
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                          <BookOpen size={12} />
                          {course.subjects.length} môn học
                        </span>

                        {course.status_id === "COURSE_DRAFT" && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                            <Clock size={12} />
                            Chờ duyệt
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* RIGHT DETAILS */}
          <div className="space-y-6">
            {!selectedCourse ? (
              <section className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
                <GraduationCap size={40} className="mx-auto text-slate-300" />
                <p className="mt-4 text-sm font-medium text-slate-500">
                  Chọn một khóa học
                </p>
              </section>
            ) : (
              <>
                {/* COURSE INFORMATION */}
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 p-6 sm:p-7">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle2 size={12} />
                            Khóa học
                          </span>

                          {selectedCourse.status_id && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                                selectedCourse.status_id === "COURSE_DRAFT"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {selectedCourse.status_id === "COURSE_DRAFT"
                                ? "Đang tạo khóa học"
                                : selectedCourse.status_id}
                            </span>
                          )}
                        </div>

                        <h2 className="mt-3 text-xl font-bold leading-snug text-slate-900 sm:text-2xl">
                          {selectedCourse.title}
                        </h2>

                        {/* NÚT DUYỆT */}
                        {selectedCourse.status_id === "COURSE_DRAFT" && (
                          <div className="mt-4">
                            <button
                              type="button"
                              disabled={
                                approvingId === selectedCourse.course_id ||
                                !hasApprovedTester
                              }
                              title={
                                !hasApprovedTester
                                  ? 'Cần ít nhất một tester đánh giá "Đạt" trước khi duyệt'
                                  : undefined
                              }
                              onClick={() =>
                                handleApproveCourse(selectedCourse.course_id)
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {approvingId === selectedCourse.course_id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <ShieldCheck size={14} />
                              )}

                              {approvingId === selectedCourse.course_id
                                ? "Đang duyệt..."
                                : "Duyệt khóa học"}
                            </button>

                            {!hasApprovedTester &&
                              approvingId !== selectedCourse.course_id && (
                                <p className="mt-2 text-xs font-medium text-amber-600">
                                  Cần ít nhất một tester đánh giá
                                  &quot;Đạt&quot; trước khi có thể duyệt khóa
                                  học.
                                </p>
                              )}

                            {approveMessage && (
                              <p
                                className={`mt-2 text-xs font-medium ${
                                  approveMessage.type === "success"
                                    ? "text-emerald-600"
                                    : "text-red-500"
                                }`}
                              >
                                {approveMessage.text}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <BookOpen size={15} />
                            {selectedSubjects.length} môn học
                          </span>

                          <span className="inline-flex items-center gap-1.5">
                            <UsersRound size={15} />
                            {testers.length} tester
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 sm:p-7">
                    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                      <div className="flex items-start gap-3">
                        <CircleUserRound
                          size={20}
                          className="mt-0.5 shrink-0 text-blue-600"
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            Thông tin khóa học
                          </p>
                          <p className="mt-1.5 text-sm leading-6 text-slate-600">
                            {selectedCourse.description ||
                              "Không có mô tả khóa học."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* SUBJECT LIST */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <BookOpen size={20} className="text-blue-600" />
                        <h3 className="font-bold text-slate-900">
                          Danh sách môn học
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Các môn học thuộc khóa học đang được chọn
                      </p>
                    </div>

                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {selectedSubjects.length} môn
                    </span>
                  </div>

                  {selectedSubjects.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
                      <BookOpen size={30} className="mx-auto text-slate-300" />
                      <p className="mt-3 text-sm font-medium text-slate-600">
                        Khóa học chưa có môn học
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedSubjects.map((subject, index) => (
                        <div
                          key={subject.subject_id}
                          className="flex items-start gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-blue-200 hover:bg-blue-50/30"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-bold text-blue-600 shadow-sm">
                            {index + 1}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                              <h4 className="text-sm font-bold text-slate-900">
                                {subject.title}
                              </h4>
                            </div>

                            {subject.description && (
                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                {subject.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* TESTER */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <TestTube2 size={20} className="text-blue-600" />
                        <h3 className="font-bold text-slate-900">
                          Người học thử
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Gán tester và theo dõi kết quả kiểm thử do tester tự
                        chấm
                      </p>
                    </div>

                    <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                      {testers.length} tester
                    </span>
                  </div>

                  {testers.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
                      <UsersRound
                        size={30}
                        className="mx-auto text-slate-300"
                      />
                      <p className="mt-3 text-sm font-medium text-slate-600">
                        Chưa có tester
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {testers.map((tester) => {
                        const assignKey = `${tester.user_id}_${selectedCourseId}`;
                        const justAssigned = !!assignedMap[assignKey];
                        const isAssigning = assigningId === tester.user_id;
                        const message =
                          assignMessage?.testerId === tester.user_id
                            ? assignMessage
                            : null;

                        const status: TesterCourseStatus | undefined =
                          progressMap[tester.user_id];

                        const isEnrolled = justAssigned || !!status?.enrolled;

                        return (
                          <div
                            key={tester.user_id}
                            className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-600">
                                {tester.username
                                  .split(" ")
                                  .slice(-2)
                                  .map((word: string) => word.charAt(0))
                                  .join("")}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-900">
                                  {tester.username}
                                </p>
                                <p className="mt-0.5 truncate text-xs text-slate-500">
                                  {tester.email}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                                <UsersRound size={12} />
                                Người kiểm thử
                              </span>

                              <button
                                type="button"
                                disabled={isAssigning || isEnrolled}
                                onClick={() =>
                                  handleAssignTester(tester.user_id)
                                }
                                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                  isEnrolled
                                    ? "cursor-default bg-emerald-50 text-emerald-700"
                                    : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                                }`}
                              >
                                {isAssigning ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : isEnrolled ? (
                                  <CheckCircle2 size={13} />
                                ) : (
                                  <UserPlus size={13} />
                                )}

                                {isEnrolled
                                  ? "Đã gán"
                                  : isAssigning
                                    ? "Đang gán..."
                                    : "Gán"}
                              </button>
                            </div>

                            {message && (
                              <p
                                className={`mt-2 text-[11px] font-medium ${
                                  message.type === "success"
                                    ? "text-emerald-600"
                                    : "text-red-500"
                                }`}
                              >
                                {message.text}
                              </p>
                            )}

                            {/* STATUS */}
                            <div className="mt-3 border-t border-slate-100 pt-3">
                              {progressLoading && !status ? (
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                  <Loader2 size={12} className="animate-spin" />
                                  Đang tải tiến độ...
                                </div>
                              ) : status?.message && !status.enrolled ? (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-[11px] font-medium text-red-500">
                                  <AlertCircle size={12} />
                                  {status.message}
                                </span>
                              ) : !isEnrolled ? (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">
                                  Chưa đăng ký khóa này
                                </span>
                              ) : status?.is_completed ? (
                                <div className="space-y-2">
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                                    <Trophy size={12} />
                                    Đã hoàn thành (
                                    {Math.round(
                                      status.current_overall_progress,
                                    )}
                                    %)
                                  </span>

                                  {status.testing_course_status ===
                                  "APPROVED" ? (
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
                                        <CheckCircle2 size={12} />
                                        Tester đánh giá: Đạt
                                      </span>
                                    </div>
                                  ) : status.testing_course_status ===
                                    "REJECTED" ? (
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-[11px] font-bold text-red-600">
                                        <AlertCircle size={12} />
                                        Tester đánh giá: Không đạt
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                                      <Clock size={12} />
                                      Đang chờ tester chấm
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-600">
                                    <span className="inline-flex items-center gap-1">
                                      <Clock size={12} />
                                      Đang học
                                    </span>
                                    <span className="font-bold text-blue-600">
                                      {Math.round(
                                        status?.current_overall_progress ?? 0,
                                      )}
                                      %
                                    </span>
                                  </div>
                                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                    <div
                                      className="h-full rounded-full bg-blue-500 transition-all"
                                      style={{
                                        width: `${Math.min(
                                          100,
                                          Math.max(
                                            0,
                                            status?.current_overall_progress ??
                                              0,
                                          ),
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* NOTE */}
                <section className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5">
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      size={20}
                      className="mt-0.5 shrink-0 text-blue-600"
                    />
                    <div>
                      <p className="text-sm font-bold text-blue-800">
                        Thông tin hiển thị
                      </p>
                      <p className="mt-1 text-xs leading-5 text-blue-700">
                        Tester tự chấm kết quả kiểm thử (Đạt / Không đạt) khi
                        hoàn thành khóa học. Bên đây bạn chỉ xem kết quả và bấm
                        Duyệt để xác nhận đã xem qua.
                      </p>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

/* ============================================================
   MAIN EXPORT (Bọc trong Suspense để sửa lỗi Next.js Build)
   ============================================================ */

export default function CourseApprovalPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* HEADER */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#0066FF] to-[#0052cc] px-6 pb-24 pt-10 text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-cyan-200 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-white/80">
            <Link
              href="/training-management"
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 transition hover:bg-white/20"
            >
              <ArrowLeft size={14} />
              Quản lý đào tạo
            </Link>
            <ChevronRight size={12} className="opacity-50" />
            <span className="flex items-center gap-1.5 font-semibold text-white">
              <ShieldCheck size={14} />
              Duyệt khóa học
            </span>
          </div>

          <div className="mt-5 max-w-3xl">
            <h1 className="text-3xl font-black uppercase tracking-tight md:text-4xl">
              PHÊ DUYỆT KHÓA HỌC
            </h1>
            <p className="mt-3 text-sm font-medium leading-relaxed text-blue-100">
              Xem thông tin khóa học, gán tester, theo dõi tiến độ và xem kết
              quả kiểm thử do tester chấm.
            </p>
          </div>
        </div>
      </section>

      {/* Bọc component con trong Suspense */}
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center">
            <Loader2 size={32} className="animate-spin text-blue-600" />
          </div>
        }
      >
        <CourseApprovalContent />
      </Suspense>
    </div>
  );
}
