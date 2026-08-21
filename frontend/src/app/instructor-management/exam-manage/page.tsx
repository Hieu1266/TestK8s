"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Loader2, AlertCircle, Search, X } from "lucide-react";
import { SubjectInfoWithQuizzes } from "@/types/subject";
import { getInstructorSubjectsWithQuizzesAction } from "@/actions/getSubject";

// Helper render badge trạng thái chuẩn theo Enum backend
const getStatusConfig = (statusId: string) => {
  switch (statusId) {
    case "SUBJECT_ACTIVE":
      return {
        label: "Đang giảng dạy",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
        dotColor: "bg-emerald-500",
      };
    case "SUBJECT_DEVELOPING":
      return {
        label: "Đang biên soạn",
        className: "bg-amber-50 text-amber-700 border-amber-200/80",
        dotColor: "bg-amber-500",
      };
    case "SUBJECT_SUSPENDED":
      return {
        label: "Tạm dừng",
        className: "bg-rose-50 text-rose-700 border-rose-200/80",
        dotColor: "bg-rose-500",
      };
    default:
      return {
        label: "Khác",
        className: "bg-slate-100 text-slate-700 border-slate-200",
        dotColor: "bg-slate-400",
      };
  }
};

const FILTER_STATUSES = [
  { value: "ALL", label: "Tất cả" },
  { value: "SUBJECT_ACTIVE", label: "Đang giảng dạy" },
  { value: "SUBJECT_DEVELOPING", label: "Đang biên soạn" },
  { value: "SUBJECT_SUSPENDED", label: "Tạm dừng" },
] as const;

export default function InstructorSubjectsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  const [subjects, setSubjects] = useState<SubjectInfoWithQuizzes[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dữ liệu API có debounce 400ms
  useEffect(() => {
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      getInstructorSubjectsWithQuizzesAction(searchTerm)
        .then((data) => setSubjects(data || []))
        .catch((err) => {
          console.error("Lỗi tải danh sách môn học:", err?.message || err);
          setError(err?.message || "Không thể tải danh sách môn học.");
        })
        .finally(() => setLoading(false));
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Lọc dữ liệu theo trạng thái ở client (vì API hiện tại chưa hỗ trợ filter status)
  const filteredSubjects = subjects.filter((subject) => {
    return selectedStatus === "ALL" || subject.status_id === selectedStatus;
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <Navbar />

      {/* Header Banner */}
      <section className="bg-gradient-to-r from-[#66CCFF] to-[#0066FF] text-white py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Link
                  href="/instructor-management"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1 rounded-full transition"
                >
                  ← Bàn làm việc
                </Link>
                <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
                  Cổng Giảng Viên
                </span>
              </div>

              <h1 className="text-3xl font-bold">Quản lý bài thi</h1>
              <p className="text-blue-100 text-sm mt-1">
                Danh sách các Môn học bạn phụ trách để tạo và quản lý đề thi.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 text-right shrink-0">
              <span className="text-xs text-blue-100 block font-medium">
                Tổng số Môn học
              </span>
              <span className="text-2xl font-extrabold">
                {subjects.length} Môn
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Bộ lọc và Tìm kiếm */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between gap-4">
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Tìm theo tên môn, mô tả..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-10 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0066FF] outline-none transition"
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

          <div className="flex flex-wrap gap-2">
            {FILTER_STATUSES.map((status) => (
              <button
                key={status.value}
                onClick={() => setSelectedStatus(status.value)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                  selectedStatus === status.value
                    ? "bg-[#0066FF] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        {/* Trạng thái Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <Loader2 size={32} className="animate-spin text-[#0066FF]" />
            <p className="text-sm font-semibold">
              Đang tải danh sách môn học...
            </p>
          </div>
        )}

        {/* Trạng thái Error */}
        {!loading && error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-700 text-sm flex items-center justify-center gap-2 shadow-sm">
            <AlertCircle size={20} />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Danh sách Môn học */}
        {!loading && !error && filteredSubjects.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
            <p className="text-slate-500 font-medium text-sm">
              Không tìm thấy môn học nào phù hợp với bộ lọc hiện tại.
            </p>
          </div>
        )}

        {!loading && !error && filteredSubjects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubjects.map((subject) => {
              const statusConfig = getStatusConfig(subject.status_id);

              return (
                <div
                  key={subject.subject_id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-[#0066FF] hover:shadow-lg transition flex flex-col justify-between overflow-hidden group relative"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-[#0066FF] opacity-0 group-hover:opacity-100 transition-opacity z-10" />

                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <h2 className="text-lg font-bold text-slate-800 group-hover:text-[#0066FF] transition line-clamp-2 pr-2">
                        {subject.title}
                      </h2>
                    </div>

                    {/* Status Badge */}
                    <div className="mb-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap w-fit ${statusConfig.className}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`}
                        />
                        {statusConfig.label}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 flex-1 leading-relaxed">
                      {subject.description || "Chưa có mô tả chi tiết."}
                    </p>

                    <div className="mt-6 pt-4 border-t border-slate-100">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center flex flex-col items-center gap-1">
                        <span className="text-sm text-slate-500 font-bold">
                          Đề thi
                        </span>
                        <span className="text-lg font-bold text-[#0066FF]">
                          {subject.total_quizzes || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end items-center">
                    <Link
                      href={`/instructor-management/exam-manage/${subject.subject_id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#0066FF] hover:text-blue-700 group-hover:translate-x-1 transition-transform"
                    >
                      Quản lý đề thi →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
