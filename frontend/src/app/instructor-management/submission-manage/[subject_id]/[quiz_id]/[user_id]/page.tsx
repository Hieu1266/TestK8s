"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Loader2, ArrowLeft, CheckCircle2, Clock, AlertCircle, ChevronRight, Inbox } from "lucide-react";
import { getUserSubmissionsByQuizAction } from "@/actions/getQuizSubmission";
import { UserSubmissionItem } from "@/types/quiz-submission";
export default function UserSubmissionsPage({
    params,
}: {
    params: Promise<{ subject_id: string; quiz_id: string; user_id: string }>;
}) {
    const { subject_id, quiz_id, user_id } = use(params);

    const [submissions, setSubmissions] = useState<UserSubmissionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchSubmissions() {
            setLoading(true);
            setError(null);
            const res = await getUserSubmissionsByQuizAction(quiz_id, user_id);
            if (res.success && res.data) {
                setSubmissions(res.data);
            } else {
                setError(res.error || "Không thể lấy các lượt nộp bài.");
            }
            setLoading(false);
        }

        if (quiz_id && user_id) fetchSubmissions();
    }, [quiz_id, user_id]);

    const renderStatusBadge = (status: UserSubmissionItem["status"]) => {
        switch (status) {
            case "GRADED":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={12} /> Đã chấm
                    </span>
                );
            case "SUBMITTED":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertCircle size={12} /> Cần chấm
                    </span>
                );
            case "IN_PROGRESS":
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <Clock size={12} /> Đang làm
                    </span>
                );
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800">
            <Navbar />

            <section className="bg-gradient-to-r from-[#0052D4] via-[#0066FF] to-[#4364F7] text-white py-10 px-6">
                <div className="max-w-7xl mx-auto">
                    <Link
                        href={`/instructor-management/submission-manage/${subject_id}/${quiz_id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1 rounded-full mb-3 transition"
                    >
                        <ArrowLeft size={14} /> Quay lại danh sách học viên
                    </Link>
                    <h1 className="text-3xl font-bold">Lịch sử lượt nộp của học viên</h1>
                    <p className="text-blue-100 text-sm mt-1">
                        User ID: <span className="font-mono text-cyan-200">{user_id}</span>
                    </p>
                </div>
            </section>

            <section className="max-w-7xl mx-auto px-6 py-8">
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
                        <Loader2 size={32} className="animate-spin text-[#0066FF] mb-2" />
                        <span className="text-xs text-slate-500 font-medium">Đang tải các lượt nộp...</span>
                    </div>
                )}

                {!loading && error && (
                    <div className="flex flex-col items-center justify-center py-12 bg-red-50 rounded-2xl border border-red-200 text-center p-6">
                        <AlertCircle size={36} className="text-red-500 mb-2" />
                        <h3 className="text-sm font-bold text-red-700">Đã xảy ra lỗi</h3>
                        <p className="text-xs text-red-600 mt-1">{error}</p>
                    </div>
                )}

                {!loading && !error && submissions.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 text-center p-6">
                        <Inbox size={40} className="text-slate-300 mb-2" />
                        <h3 className="text-base font-bold text-slate-700">Chưa có lượt nộp nào</h3>
                        <p className="text-xs text-slate-500 mt-1">Học viên này chưa nộp bài lần nào.</p>
                    </div>
                )}

                {!loading && !error && submissions.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="py-3.5 px-6">Lượt</th>
                                        <th className="py-3.5 px-6">Bắt đầu làm</th>
                                        <th className="py-3.5 px-6">Thời gian nộp</th>
                                        <th className="py-3.5 px-6">Trạng thái</th>
                                        <th className="py-3.5 px-6">Điểm số</th>
                                        <th className="py-3.5 px-6 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {submissions.map((item, index) => (
                                        <tr key={item.submission_id} className="hover:bg-slate-50/80 transition">
                                            <td className="py-4 px-6 font-bold text-slate-700">
                                                Lượt #{submissions.length - index}
                                            </td>
                                            <td className="py-4 px-6 text-slate-600">
                                                {new Date(item.started_at).toLocaleString("vi-VN")}
                                            </td>
                                            <td className="py-4 px-6 text-slate-600">
                                                {item.submitted_at
                                                    ? new Date(item.submitted_at).toLocaleString("vi-VN")
                                                    : "--"}
                                            </td>
                                            <td className="py-4 px-6">
                                                {renderStatusBadge(item.status)}
                                            </td>
                                            <td className="py-4 px-6 font-bold text-slate-800 text-sm">
                                                {item.total_score !== null
                                                    ? `${item.total_score} / ${item.max_score === 0 ? '--' : item.max_score}`
                                                    : "--"}
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <Link
                                                    href={`/instructor-management/submission-manage/grade/${item.submission_id}`}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0066FF] text-white font-semibold hover:bg-blue-700 transition"
                                                >
                                                    {item.status === "SUBMITTED" ? "Chấm bài" : "Xem chi tiết"}
                                                    <ChevronRight size={14} />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}