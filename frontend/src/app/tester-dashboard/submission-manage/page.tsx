"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Loader2, AlertCircle, Search, X, FileCheck, ChevronRight, Inbox, ArrowLeft } from "lucide-react";
import { getTesterAssignedSubjectsAction, TesterSubjectSummary } from "@/actions/getTesterSubject";
import { getTotalQuizzesBySubjectAction } from "@/actions/getQuizzes";

export default function TesterSubmissionManageSubjectsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [subjects, setSubjects] = useState<TesterSubjectSummary[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        const timer = setTimeout(() => {
            getTesterAssignedSubjectsAction(searchTerm)
                .then(async (res) => {
                    if (res.success) {
                        const list = res.data || [];
                        // Môn học nằm ở Course Service, còn số lượng bài thi nằm ở Quiz Service
                        // (khác microservice) nên phải gọi bổ sung API get-total-quizzes cho từng môn.
                        const withQuizCount = await Promise.all(
                            list.map(async (sub) => ({
                                ...sub,
                                total_quizzes: await getTotalQuizzesBySubjectAction(sub.subject_id),
                            }))
                        );
                        setSubjects(withQuizCount);
                        setError(null);
                    } else {
                        setError(res.error || "Không thể tải danh sách môn học được giao.");
                    }
                })
                .finally(() => setLoading(false));
        }, 400);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-20">
            <Navbar />

            {/* Header Banner */}
            <section className="bg-blue-600 text-white py-6 px-4 sm:px-6 lg:px-8 border-b border-blue-700">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2.5">
                                <Link
                                    href="/tester-dashboard"
                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-100 hover:text-white bg-blue-700/50 hover:bg-blue-700 px-2.5 py-1 rounded-md transition-colors border border-blue-500/30 cursor-pointer"
                                >
                                    <ArrowLeft size={13} /> Bàn làm việc
                                </Link>
                                <span className="text-[11px] font-semibold uppercase tracking-wider bg-blue-700/40 text-blue-100 px-2.5 py-1 rounded-md border border-blue-500/30">
                                    Bài thi được giao
                                </span>
                            </div>
                            <h1 className="text-xl font-bold tracking-tight text-white">Chấm điểm bài thi</h1>
                            <p className="text-blue-100 text-xs mt-0.5">
                                Bước 1: Chọn môn học bạn được Giảng viên phân công để xem các bài thi cần chấm điểm.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
                {/* Tìm kiếm */}
                <div className="bg-white p-4 rounded-xl shadow-2xs border border-slate-200 flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Tìm theo tên môn học..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-2.5 text-slate-500 bg-white rounded-xl border border-slate-200 shadow-2xs">
                        <Loader2 size={22} className="animate-spin text-blue-600" />
                        <p className="text-xs font-medium text-slate-500">Đang tải danh sách môn học...</p>
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-center text-rose-700 text-xs font-medium flex items-center justify-center gap-2">
                        <AlertCircle size={16} className="text-rose-500 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Empty */}
                {!loading && !error && subjects.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-200 text-center p-6 shadow-2xs">
                        <Inbox size={36} className="text-slate-300 mb-2" />
                        <h3 className="text-sm font-bold text-slate-700">Chưa được giao môn học nào</h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Bạn chưa được Giảng viên phân công môn học nào để chấm điểm.
                        </p>
                    </div>
                )}

                {/* Dynamic List */}
                {!loading && !error && subjects.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {subjects.map((sub) => (
                            <div
                                key={sub.subject_id}
                                className="bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group shadow-2xs"
                            >
                                <div className="p-5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                            <FileCheck size={18} />
                                        </div>
                                        <h2 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">
                                            {sub.title}
                                        </h2>
                                    </div>
                                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                        {sub.description || "Chưa có mô tả môn học."}
                                    </p>

                                    <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                                        <span className="text-slate-500">Tổng bài thi:</span>
                                        <span className="font-bold font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                                            {sub.total_quizzes || 0} bài
                                        </span>
                                    </div>
                                </div>

                                <Link
                                    href={`/tester-dashboard/submission-manage/${sub.subject_id}`}
                                    className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 text-xs font-semibold text-blue-600 hover:bg-blue-50/60 flex items-center justify-between transition-colors"
                                >
                                    <span>Chọn bài thi cần chấm</span>
                                    <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
