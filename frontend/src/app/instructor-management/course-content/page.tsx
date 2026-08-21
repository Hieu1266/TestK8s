"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { InstructorStatistics } from "@/types/statistic";
import { GeneralInfoInstructorSubject } from "@/types/subject";
import { fetchInstructorStatistics } from "@/actions/getStatistic";
import { getInstructorGeneralInfoAction } from "@/actions/getSubject";
import {
  Search,
  BookOpen,
  FolderKanban,
  ArrowRight,
  CheckCircle2,
  FileText,
  AlertCircle,
  Loader2,
  X,
  HelpCircle,
  Layers,
  Sparkles,
  BookMarked,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";

// Helper render badge trạng thái môn học
const getStatusBadge = (statusId: string) => {
  switch (statusId) {
    case "SUBJECT_ACTIVE":
      return {
        text: "Đang giảng dạy",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
        dotColor: "bg-emerald-500",
      };
    case "SUBJECT_DEVELOPING":
      return {
        text: "Đang biên soạn",
        className: "bg-amber-50 text-amber-700 border-amber-200/80",
        dotColor: "bg-amber-500",
      };
    case "SUBJECT_SUSPENDED":
      return {
        text: "Tạm dừng",
        className: "bg-rose-50 text-rose-700 border-rose-200/80",
        dotColor: "bg-rose-500",
      };
    default:
      return {
        text: "Khác",
        className: "bg-slate-100 text-slate-700 border-slate-200",
        dotColor: "bg-slate-400",
      };
  }
};

export default function CourseContentPage() {
  const router = useRouter();

  // State tìm kiếm
  const [searchTerm, setSearchTerm] = useState("");

  // States Thống kê
  const [stats, setStats] = useState<InstructorStatistics | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);

  // States Danh sách môn học
  const [subjects, setSubjects] = useState<GeneralInfoInstructorSubject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState<boolean>(true);
  const [errorSubjects, setErrorSubjects] = useState<string | null>(null);

  // 1. Fetch Thống kê
  useEffect(() => {
    setLoadingStats(true);
    fetchInstructorStatistics()
      .then((data) => {
        if (data) setStats(data);
      })
      .catch((err) =>
        console.error("Lỗi đồng bộ thống kê:", err?.message || err),
      )
      .finally(() => setLoadingStats(false));
  }, []);

  // 2. Fetch danh sách môn học phân công
  useEffect(() => {
    setLoadingSubjects(true);
    setErrorSubjects(null);

    const timer = setTimeout(() => {
      getInstructorGeneralInfoAction(searchTerm)
        .then((data) => setSubjects(data || []))
        .catch((err) => {
          console.error("Lỗi tải môn học:", err?.message || err);
          setErrorSubjects(
            err?.message || "Không thể tải danh sách môn học được phân công.",
          );
        })
        .finally(() => setLoadingSubjects(false));
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">
      <Navbar />

      {/* Hero Header Section - Tone màu Xanh Thương Hiệu Đồng Bộ */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#0052D4] via-[#0066FF] to-[#4364F7] text-white py-10 px-6 shadow-md">
        {/* Subtle Background Accent Blobs */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              {/* Điều hướng Quay về Dashboard & Badge */}
              <div className="flex items-center gap-3 mb-3">
                <Link
                  href="/instructor-management"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1 rounded-full transition backdrop-blur-md"
                >
                  <ArrowLeft size={13} /> Bàn làm việc
                </Link>
                <span className="text-xs font-bold uppercase tracking-wider bg-white/20 text-blue-50 px-3 py-1 rounded-full backdrop-blur-md">
                  Mô-đun Giảng dạy
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
                Môn Học Được Phân Công
              </h1>
              <p className="text-blue-100 mt-2 text-sm md:text-base max-w-2xl leading-relaxed">
                Quản lý tiến độ giảng dạy, biên soạn cấu trúc chương trình, tài
                liệu bài học và ngân hàng đề thi.
              </p>
            </div>

            {/* Quick Badge Summary */}
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-xl shrink-0 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center text-white font-bold text-xl">
                <BookMarked size={24} />
              </div>
              <div>
                <span className="text-xs text-blue-100 font-medium block">
                  Tổng môn học phụ trách
                </span>
                <span className="text-2xl font-extrabold text-white">
                  {loadingStats
                    ? "..."
                    : (stats?.total_subjects ?? subjects.length)}{" "}
                  Môn
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Khối Thống kê Trực quan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Tổng Môn */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Môn Đảm Nhận
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {loadingStats ? (
                  <Loader2 className="animate-spin text-slate-400" size={20} />
                ) : (
                  (stats?.total_subjects ?? 0)
                )}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center">
              <BookOpen size={22} />
            </div>
          </div>

          {/* Card 2: Tổng Module */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Tổng Số Module
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {loadingStats ? (
                  <Loader2 className="animate-spin text-slate-400" size={20} />
                ) : (
                  (stats?.total_modules ?? 0)
                )}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FolderKanban size={22} />
            </div>
          </div>

          {/* Card 3: Đang Giảng Dạy */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Đang Giảng Dạy
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {loadingStats ? (
                  <Loader2 className="animate-spin text-slate-400" size={20} />
                ) : (
                  (stats?.total_active_subject ?? 0)
                )}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={22} />
            </div>
          </div>

          {/* Card 4: Đang Biên Soạn */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Đang Biên Soạn
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {loadingStats ? (
                  <Loader2 className="animate-spin text-slate-400" size={20} />
                ) : (
                  (stats?.total_developing_subject ?? 0)
                )}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileText size={22} />
            </div>
          </div>
        </div>

        {/* Thanh Tìm kiếm & Lọc */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Tìm kiếm môn học theo tên môn hoặc mã môn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2.5 pl-11 pr-10 text-sm text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Trạng thái Loading */}
        {loadingSubjects && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <Loader2 size={32} className="animate-spin text-[#0066FF]" />
            <p className="text-sm font-semibold">
              Đang tải danh sách môn học...
            </p>
          </div>
        )}

        {/* Trạng thái Error */}
        {!loadingSubjects && errorSubjects && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-700 text-sm flex items-center justify-center gap-2 shadow-sm">
            <AlertCircle size={20} />
            <span className="font-medium">{errorSubjects}</span>
          </div>
        )}

        {/* Danh sách Môn học dạng Grid */}
        {!loadingSubjects && !errorSubjects && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {subjects.map((subject) => {
              const statusConfig = getStatusBadge(subject.status_id);

              return (
                <div
                  key={subject.subject_id}
                  className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-200 flex flex-col justify-between overflow-hidden relative"
                >
                  {/* Top Accent Bar khi hover */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-[#0066FF] opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="p-6 space-y-4">
                    {/* Header Card: Title & Status */}
                    <div className="flex justify-between items-start gap-3">
                      <h2
                        onClick={() =>
                          router.push(
                            `/instructor-management/course-content/${subject.subject_id}`,
                          )
                        }
                        className="text-lg font-bold text-slate-900 group-hover:text-[#0066FF] transition cursor-pointer line-clamp-2 leading-snug"
                      >
                        {subject.title}
                      </h2>

                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap shrink-0 ${statusConfig.className}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`}
                        />
                        {statusConfig.text}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-slate-500 text-xs sm:text-sm leading-relaxed line-clamp-2">
                      {subject.description ||
                        "Chưa có mô tả chi tiết cho môn học này."}
                    </p>

                    {/* Stats mini bar */}
                    <div className="pt-3 flex items-center gap-6 text-xs text-slate-600 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Layers size={16} className="text-[#0066FF]" />
                        <span>
                          <strong className="text-slate-900">
                            {subject.total_modules || 0}
                          </strong>{" "}
                          Modules
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Sparkles size={16} className="text-amber-500" />
                        <span>
                          <strong className="text-slate-900">
                            {subject.total_lessons || 0}
                          </strong>{" "}
                          Bài học
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Card Navigation Actions */}
                  <div className="bg-slate-50/80 px-6 py-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
                    <button
                      onClick={() =>
                        router.push(
                          `/instructor-management/questions-bank/${subject.subject_id}`,
                        )
                      }
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#0066FF] transition bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs"
                    >
                      <HelpCircle
                        size={14}
                        className="text-slate-400 group-hover:text-[#0066FF]"
                      />
                      Ngân hàng câu hỏi
                    </button>

                    <button
                      onClick={() =>
                        router.push(
                          `/instructor-management/course-content/${subject.subject_id}`,
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#0066FF] hover:text-blue-700 transition group-hover:translate-x-0.5"
                    >
                      Soạn nội dung & Đề cương
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loadingSubjects && !errorSubjects && subjects.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <AlertCircle size={28} />
            </div>
            <p className="text-sm font-semibold text-slate-700">
              {searchTerm
                ? `Không tìm thấy môn học nào khớp với từ khóa "${searchTerm}".`
                : "Bạn hiện chưa được phân công đảm nhận môn học nào."}
            </p>
            <p className="text-xs text-slate-400 max-w-sm">
              Vui lòng kiểm tra lại bộ lọc tìm kiếm hoặc liên hệ quản trị viên
              khoa/bộ môn.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
