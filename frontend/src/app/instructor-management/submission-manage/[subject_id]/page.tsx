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
} from "lucide-react";
import { getQuizzesSummaryBySubjectAction } from "@/actions/getQuizSubmission";
import { QuizSubmissionSummary } from "@/types/quiz-submission";

export default function SubjectQuizzesSubmissionPage({
  params,
}: {
  params: Promise<{ subject_id: string }>;
}) {
  const { subject_id } = use(params);

  const [quizzes, setQuizzes] = useState<QuizSubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <Navbar />

      {/* Header section */}
      <section className="bg-gradient-to-r from-[#0052D4] via-[#0066FF] to-[#4364F7] text-white py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/instructor-management/submission-manage"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1 rounded-full mb-3 transition"
          >
            <ArrowLeft size={14} /> Chọn môn học khác
          </Link>
          <h1 className="text-3xl font-bold">Danh sách bài thi</h1>
        </div>
      </section>

      {/* Main content section */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        {/* Trạng thái Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
            <Loader2 size={32} className="animate-spin text-[#0066FF] mb-2" />
            <span className="text-xs text-slate-500 font-medium">
              Đang tải danh sách bài thi...
            </span>
          </div>
        )}

        {/* Trạng thái Báo lỗi */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-12 bg-red-50 rounded-2xl border border-red-200 text-center p-6">
            <AlertCircle size={36} className="text-red-500 mb-2" />
            <h3 className="text-sm font-bold text-red-700">Đã xảy ra lỗi</h3>
            <p className="text-xs text-red-600 mt-1 max-w-md">{error}</p>
          </div>
        )}

        {/* Trạng thái Danh sách trống */}
        {!loading && !error && quizzes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 text-center p-6">
            <Inbox size={40} className="text-slate-300 mb-2" />
            <h3 className="text-base font-bold text-slate-700">
              Chưa có bài thi nào
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Môn học này hiện chưa được khởi tạo bài thi nào.
            </p>
          </div>
        )}

        {/* Trạng thái Hiển thị danh sách Quizzes */}
        {!loading && !error && quizzes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quizzes.map((quiz) => (
              <div
                key={quiz.quiz_id}
                className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-blue-50 text-[#0066FF] border border-blue-100">
                      {quiz.quiz_type === "FIXED_QUESTION"
                        ? "Đề cố định"
                        : "Đề ngẫu nhiên"}
                    </span>
                    {quiz.pending_gradings > 0 && (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <AlertCircle size={12} /> Cần chấm:{" "}
                        {quiz.pending_gradings}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-slate-800 mb-2">
                    {quiz.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                    {quiz.description || "Không có mô tả cho bài thi này."}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-500 border-t border-slate-100 pt-3">
                    <span className="flex items-center gap-1">
                      <Clock size={14} /> {quiz.duration_minutes} phút
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText size={14} /> {quiz.total_submissions} lượt nộp
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={14} /> Đã chấm: {quiz.graded_count}
                    </span>
                  </div>
                  <Link
                    href={`/instructor-management/submission-manage/${subject_id}/${quiz.quiz_id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0066FF] text-white text-xs font-bold hover:bg-blue-700 transition"
                  >
                    Quản lý bài nộp <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
