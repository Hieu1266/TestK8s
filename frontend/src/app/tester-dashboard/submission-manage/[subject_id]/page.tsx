"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  Loader2,
  ArrowLeft,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Inbox,
  Search,
  Filter,
  CheckSquare,
} from "lucide-react";
import { getQuizzesSummaryBySubjectAction } from "@/actions/getQuizSubmission";
import { QuizSubmissionSummary } from "@/types/quiz-submission";

export default function TesterSubjectQuizzesPage({
  params,
}: {
  params: Promise<{ subject_id: string }>;
}) {
  const { subject_id } = use(params);

  const [quizzes, setQuizzes] = useState<QuizSubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States cho bộ lọc và tìm kiếm
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<
    "ALL" | "FIXED_QUESTION" | "RANDOM"
  >("ALL");
  const [filterStatus, setFilterStatus] = useState<
    "ALL" | "PENDING" | "COMPLETED"
  >("ALL");

  useEffect(() => {
    async function fetchQuizzes() {
      setLoading(true);
      setError(null);

      const result = await getQuizzesSummaryBySubjectAction(subject_id);

      if (result.success && result.data) {
        setQuizzes(result.data);
      } else {
        setError(result.error || "Không thể tải danh sách bài thi.");
      }

      setLoading(false);
    }

    if (subject_id) {
      fetchQuizzes();
    }
  }, [subject_id]);

  // Xử lý logic lọc dữ liệu
  const filteredQuizzes = quizzes.filter((quiz) => {
    // Lọc theo từ khóa
    const matchSearch = quiz.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    // Lọc theo loại đề
    const matchType = filterType === "ALL" || quiz.quiz_type === filterType;

    // Lọc theo trạng thái chấm
    let matchStatus = true;
    if (filterStatus === "PENDING") {
      matchStatus = quiz.pending_gradings > 0;
    } else if (filterStatus === "COMPLETED") {
      matchStatus = quiz.pending_gradings === 0;
    }

    return matchSearch && matchType && matchStatus;
  });

  return (
    <div className="min-h-screen bg-[#F7F8FB] text-slate-800">
      <Navbar />

      {/* =====================================================
                HEADER
            ===================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 text-white">
        {/* Background decoration */}
        <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-20 bottom-[-120px] h-72 w-72 rounded-full bg-blue-300/20 blur-3xl" />

        <div className="relative mx-auto w-full max-w-[1600px] px-4 py-8 md:px-8 lg:px-12">
          <Link
            href="/tester-dashboard/submission-manage"
            className="group mb-5 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-all hover:border-white/30 hover:bg-white/20"
          >
            <ArrowLeft
              size={15}
              className="transition-transform group-hover:-translate-x-0.5"
            />
            Chọn môn học khác
          </Link>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-100">
                  Tester
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Danh sách bài thi
              </h1>

              <p className="mt-2 text-sm text-blue-50">
                Quản lý và chấm các bài nộp của môn học
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
                MAIN
            ===================================================== */}
      <main className="mx-auto w-full max-w-[1600px] px-4 py-8 md:px-8 lg:px-12">
        {/* LOADING */}
        {loading && (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
              <Loader2 size={25} className="animate-spin text-blue-500" />
            </div>
            <span className="text-sm font-semibold text-slate-700">
              Đang tải danh sách bài thi...
            </span>
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
            <div className="mx-auto flex max-w-lg flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
                <AlertCircle size={28} className="text-red-500" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Đã xảy ra lỗi
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-500">{error}</p>
            </div>
          </div>
        )}

        {/* EMPTY/NO QUIZZES OVERALL */}
        {!loading && !error && quizzes.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
            <div className="mx-auto flex max-w-md flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
                <Inbox size={32} className="text-slate-300" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Chưa có bài thi nào
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-500">
                Môn học này hiện chưa được khởi tạo bài thi nào.
              </p>
            </div>
          </div>
        )}

        {/* QUIZ LIST & FILTERS */}
        {!loading && !error && quizzes.length > 0 && (
          <>
            {/* Filters & Header */}
            <div className="mb-6 flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Các bài thi
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Tìm thấy {filteredQuizzes.length} / {quizzes.length} bài thi
                </p>
              </div>

              <div className="flex flex-col flex-wrap gap-3 sm:flex-row sm:items-center">
                {/* Search input */}
                <div className="relative w-full sm:w-56 lg:w-64">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="Tìm tên bài thi..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm font-medium text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                {/* Filter dropdown - Loại đề */}
                <div className="relative w-full sm:w-40">
                  <Filter
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={14}
                  />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm font-medium text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="ALL">Loại đề</option>
                    <option value="FIXED_QUESTION">Cố định</option>
                    <option value="RANDOM">Ngẫu nhiên</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <ChevronRight size={14} className="rotate-90" />
                  </div>
                </div>

                {/* Filter dropdown - Trạng thái chấm */}
                <div className="relative w-full sm:w-40">
                  <CheckSquare
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={14}
                  />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm font-medium text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="ALL">Trạng thái</option>
                    <option value="PENDING">Cần chấm</option>
                    <option value="COMPLETED">Đã chấm xong</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <ChevronRight size={14} className="rotate-90" />
                  </div>
                </div>
              </div>
            </div>

            {/* Nếu tìm kiếm không ra kết quả */}
            {filteredQuizzes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center bg-white shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Không tìm thấy bài thi nào phù hợp với bộ lọc.
                </p>
              </div>
            ) : (
              /* Lưới Card */
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredQuizzes.map((quiz) => (
                  <div
                    key={quiz.quiz_id}
                    className="group flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/50"
                  >
                    {/* Card content */}
                    <div className="p-4">
                      {/* Tags */}
                      <div className="mb-3 flex min-h-[26px] items-start justify-between gap-2">
                        <span className="inline-flex items-center rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-600">
                          {quiz.quiz_type === "FIXED_QUESTION"
                            ? "ĐỀ CỐ ĐỊNH"
                            : "ĐỀ NGẪU NHIÊN"}
                        </span>

                        {quiz.pending_gradings > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">
                            <AlertCircle size={10} />
                            Cần chấm: {quiz.pending_gradings}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="line-clamp-2 text-base font-bold leading-6 text-slate-800 transition-colors group-hover:text-blue-600">
                        {quiz.title}
                      </h3>

                      {/* Description */}
                      <p className="mt-1.5 line-clamp-2 min-h-[36px] text-[11px] leading-5 text-slate-500">
                        {quiz.description || "Không có mô tả cho bài thi này."}
                      </p>

                      {/* Stats */}
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-slate-500 shadow-sm">
                            <Clock size={12} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-medium text-slate-400">
                              Thời gian
                            </p>
                            <p className="mt-0.5 text-[11px] font-bold text-slate-700">
                              {quiz.duration_minutes} phút
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-slate-500 shadow-sm">
                            <FileText size={12} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-medium text-slate-400">
                              Bài nộp
                            </p>
                            <p className="mt-0.5 text-[11px] font-bold text-slate-700">
                              {quiz.total_submissions} lượt
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card footer */}
                    <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3">
                      <div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle2 size={12} />
                          Đã chấm: {quiz.graded_count}
                        </span>
                      </div>

                      <Link
                        href={`/tester-dashboard/submission-manage/${subject_id}/${quiz.quiz_id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-[11px] font-bold text-white shadow-sm shadow-blue-200 transition-all hover:bg-blue-700 hover:shadow-md active:scale-[0.98]"
                      >
                        Quản lý
                        <ChevronRight
                          size={12}
                          className="transition-transform group-hover:translate-x-0.5"
                        />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
