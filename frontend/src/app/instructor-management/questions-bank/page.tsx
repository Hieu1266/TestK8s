"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Search,
  X,
  Layers,
  FileQuestion,
  Loader2,
  AlertCircle
} from "lucide-react";
import { SubjectInfoWithQuestions } from "@/types/subject";
import { getInstructorSubjectsWithQuestionsAction } from "@/actions/getSubject";

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

export default function QuestionBankPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  // States quản lý dữ liệu từ API
  const [subjects, setSubjects] = useState<SubjectInfoWithQuestions[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dữ liệu API có tích hợp debounce 400ms
  useEffect(() => {
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      getInstructorSubjectsWithQuestionsAction(searchTerm)
        .then((data) => setSubjects(data || []))
        .catch((err) => {
          console.error("Lỗi tải danh sách ngân hàng câu hỏi:", err?.message || err);
          setError("Không thể tải danh sách môn học. Vui lòng thử lại sau.");
        })
        .finally(() => setLoading(false));
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">
      <Navbar />

      {/* Hero Header Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#0052D4] via-[#0066FF] to-[#4364F7] text-white py-10 px-6 shadow-md">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Link
                  href="/instructor-management"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1 rounded-full transition backdrop-blur-md"
                >
                  <ArrowLeft size={13} /> Bàn làm việc
                </Link>
                <span className="text-xs font-bold uppercase tracking-wider bg-white/20 text-blue-50 px-3 py-1 rounded-full backdrop-blur-md">
                  Ngân Hàng Đề
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
                Ngân Hàng Câu Hỏi
              </h1>
              <p className="text-blue-100 mt-2 text-sm md:text-base max-w-2xl leading-relaxed">
                Chọn môn học để biên soạn, phân loại độ khó và quản lý bộ câu hỏi trắc nghiệm/tự luận.
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Thanh Tìm kiếm */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Tìm kiếm ngân hàng câu hỏi theo tên môn học..."
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
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <Loader2 size={32} className="animate-spin text-[#0066FF]" />
            <p className="text-sm font-semibold">Đang tải danh sách ngân hàng câu hỏi...</p>
          </div>
        )}

        {/* Trạng thái Error */}
        {!loading && error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-700 text-sm flex items-center justify-center gap-2 shadow-sm">
            <AlertCircle size={20} />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Danh sách Môn học (Render theo dữ liệu API) */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((subject) => {
              const statusConfig = getStatusBadge(subject.status_id);

              return (
                <div
                  key={subject.subject_id}
                  className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-200 flex flex-col justify-between overflow-hidden relative"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-[#0066FF] opacity-0 group-hover:opacity-100 transition-opacity z-10" />

                  <div className="p-6 space-y-4 flex-1 flex flex-col">
                    {/* Header: Title & Status */}
                    <div className="flex justify-between items-start gap-3">
                      <h3
                        onClick={() =>
                          router.push(
                            `/instructor-management/questions-bank/${subject.subject_id}`
                          )
                        }
                        className="text-lg font-bold text-slate-900 group-hover:text-[#0066FF] transition cursor-pointer line-clamp-2 leading-snug"
                      >
                        {subject.title}
                      </h3>
                    </div>

                    {/* Status Badge */}
                    <div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap shrink-0 ${statusConfig.className}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`}
                        />
                        {statusConfig.text}
                      </span>
                    </div>

                    <p className="text-slate-500 text-xs sm:text-sm leading-relaxed line-clamp-2 flex-1">
                      {subject.description || "Chưa có mô tả chi tiết cho môn học này."}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                      <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100/50 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-blue-600">
                          <HelpCircle size={15} />
                          <span className="text-xs font-semibold">Câu hỏi</span>
                        </div>
                        <span className="text-lg font-bold text-slate-900">
                          {subject.total_questions || 0}
                        </span>
                      </div>

                      <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Layers size={15} />
                          <span className="text-xs font-semibold">Modules</span>
                        </div>
                        <span className="text-lg font-bold text-slate-900">
                          {subject.total_modules || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <button
                      onClick={() =>
                        router.push(
                          `/instructor-management/questions-bank/${subject.subject_id}`
                        )
                      }
                      className="w-full bg-[#0066FF] hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-sm group-hover:shadow-md"
                    >
                      Quản lý câu hỏi
                      <ArrowRight
                        size={16}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && subjects.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <FileQuestion size={28} />
            </div>
            <p className="text-sm font-semibold text-slate-700">
              {searchTerm
                ? `Không tìm thấy môn học nào khớp với từ khóa "${searchTerm}".`
                : "Bạn hiện chưa được phân công đảm nhận môn học nào."}
            </p>
            <p className="text-xs text-slate-400 max-w-sm">
              Vui lòng thử lại với tên môn học khác.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}