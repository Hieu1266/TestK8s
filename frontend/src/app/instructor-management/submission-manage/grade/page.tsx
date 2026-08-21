"use client";

import { use, useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { Loader2, ArrowLeft, CheckCircle2, AlertCircle, User, Mail, Clock, FileText, Image as ImageIcon } from "lucide-react";
import { getSubmissionDetailAction } from "@/actions/getQuizSubmission";
import { QuizSubmissionDetail } from "@/types/quiz-submission";

export default function SubmissionDetailPage({ params }: { params: Promise<{ submission_id: string }> }) {
    const { submission_id } = use(params);
    const [detail, setDetail] = useState<QuizSubmissionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchDetail() {
            setLoading(true);
            const res = await getSubmissionDetailAction(submission_id);
            if (res.success && res.data) setDetail(res.data);
            else setError(res.error || "Không thể tải chi tiết bài làm.");
            setLoading(false);
        }
        if (submission_id) fetchDetail();
    }, [submission_id]);

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800 pb-12">
            <Navbar />
            <section className="bg-gradient-to-r from-[#0052D4] via-[#0066FF] to-[#4364F7] text-white py-8 px-6">
                <div className="max-w-5xl mx-auto">
                    <button onClick={() => window.history.back()} className="inline-flex items-center gap-1 text-xs font-bold bg-white/10 px-3 py-1 rounded-full mb-3">
                        <ArrowLeft size={14} /> Quay lại
                    </button>
                    <h1 className="text-2xl font-bold">Chi tiết bài làm sinh viên</h1>
                    {detail && <p className="text-blue-100 text-xs mt-1">Bài thi: <span className="font-semibold text-white">{detail.quiz_title}</span></p>}
                </div>
            </section>

            <section className="max-w-5xl mx-auto px-6 py-8">
                {loading && (
                    <div className="flex justify-center py-20 bg-white rounded-2xl border">
                        <Loader2 size={32} className="animate-spin text-[#0066FF]" />
                    </div>
                )}

                {!loading && error && (
                    <div className="bg-red-50 p-6 rounded-2xl text-center text-red-600 border border-red-200">
                        <AlertCircle className="mx-auto mb-2" size={32} />
                        <p className="text-sm font-bold">{error}</p>
                    </div>
                )}

                {!loading && !error && detail && (
                    <div className="space-y-6">
                        {/* Cảnh báo bài thi đang làm */}
                        {detail.status === "IN_PROGRESS" && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl flex items-center gap-3">
                                <AlertCircle className="text-amber-600 shrink-0" size={20} />
                                <div>
                                    <p className="font-bold text-xs">Sinh viên đang làm bài</p>
                                    <p className="text-[11px] text-amber-700">Bài làm chưa được nộp. Điểm số và câu trả lời sẽ xuất hiện sau khi nộp bài.</p>
                                </div>
                            </div>
                        )}

                        {/* Tổng quan lượt làm */}
                        <div className="bg-white rounded-2xl border p-6 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-sm">
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Sinh viên</span>
                                <p className="font-bold text-slate-800 flex items-center gap-1.5 text-sm mt-1">
                                    <User size={15} className="text-slate-400" /> {detail.username}
                                </p>
                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                    <Mail size={13} className="text-slate-400" /> {detail.email}
                                </p>
                            </div>
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Thời gian nộp</span>
                                <p className="text-xs text-slate-700 flex items-center gap-1.5 mt-1">
                                    <Clock size={14} className="text-slate-400" />
                                    {detail.submitted_at ? new Date(detail.submitted_at).toLocaleString("vi-VN") : "Chưa nộp"}
                                </p>
                            </div>
                            <div className="md:text-right">
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Điểm tổng kết</span>
                                <p className="text-2xl font-extrabold text-[#0066FF]">
                                    {detail.score ?? "--"} <span className="text-xs font-normal text-slate-400">/ {detail.max_possible_score} đ</span>
                                </p>
                            </div>
                        </div>

                        {/* Danh sách câu hỏi */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <FileText size={18} className="text-[#0066FF]" /> Chi tiết câu hỏi ({detail.answers.length})
                            </h2>

                            {detail.answers.map((ans, idx) => (
                                <div key={ans.detail_id || idx} className="bg-white rounded-2xl border p-6 shadow-sm">
                                    <div className="flex justify-between items-start gap-4 mb-3">
                                        <h3 className="font-bold text-slate-800 text-sm flex items-start gap-2">
                                            <span className="bg-blue-50 text-[#0066FF] px-2 py-0.5 rounded-md text-xs font-bold border border-blue-100">
                                                Câu {idx + 1}
                                            </span>
                                            {ans.question_text}
                                        </h3>
                                        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 whitespace-nowrap">
                                            Điểm: {ans.score_earned ?? "--"} / {ans.max_score}
                                        </span>
                                    </div>

                                    {/* Lựa chọn Trắc nghiệm */}
                                    {ans.options && ans.options.length > 0 && (
                                        <div className="space-y-2 mt-4 pl-2">
                                            {ans.options.map((opt) => {
                                                const selected = ans.selected_option_id === opt.option_id;
                                                const isCorrect = opt.is_correct;

                                                let style = "border-slate-200 bg-slate-50/50 text-slate-700";
                                                if (selected && isCorrect) style = "border-emerald-300 bg-emerald-50 text-emerald-800 font-medium";
                                                else if (selected && !isCorrect) style = "border-red-300 bg-red-50 text-red-800";
                                                else if (isCorrect) style = "border-blue-200 bg-blue-50/60 text-blue-800 font-medium";

                                                return (
                                                    <div key={opt.option_id} className={`p-3 rounded-xl border text-xs flex items-center justify-between ${style}`}>
                                                        <div className="flex items-center gap-2">
                                                            <span>{opt.option_text}</span>
                                                            {selected && <span className="text-[10px] bg-slate-800 text-white px-1.5 py-0.5 rounded">Sinh viên chọn</span>}
                                                        </div>
                                                        {isCorrect && <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600"><CheckCircle2 size={14} /> Đáp án đúng</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Bài tự luận Tự luận Text */}
                                    {ans.essay_answer_text && (
                                        <div className="mt-3 p-3 bg-slate-50 border rounded-xl text-xs">
                                            <span className="font-bold text-slate-400 block mb-1">Tự luận:</span>
                                            <div dangerouslySetInnerHTML={{ __html: ans.essay_answer_text }} />
                                        </div>
                                    )}

                                    {/* Bài tự luận Đồ thị / Đồ họa */}
                                    {ans.graph_image_url && (
                                        <div className="mt-3 p-3 bg-slate-50 border rounded-xl">
                                            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mb-2">
                                                <ImageIcon size={13} /> Hình vẽ / Đồ thị:
                                            </span>
                                            <img src={ans.graph_image_url} alt="Graph answer" className="max-h-64 rounded-lg border bg-white object-contain" />
                                        </div>
                                    )}

                                    {/* Nhận xét của Giảng viên */}
                                    {ans.teacher_feedback && (
                                        <div className="mt-3 text-xs bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-xl">
                                            <span className="font-bold">Nhận xét: </span>{ans.teacher_feedback}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}