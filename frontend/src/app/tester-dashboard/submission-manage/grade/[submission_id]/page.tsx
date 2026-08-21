"use client";

import { use, useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import {
    Loader2,
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    User,
    Mail,
    FileText,
    Image as ImageIcon,
    Save,
    MessageSquare,
    Award,
} from "lucide-react";
import {
    getSubmissionDetailAction,
    updateSubmissionGradingAction,
} from "@/actions/getQuizSubmission";
import { QuizSubmissionDetail, QuestionGradingPayload } from "@/types/quiz-submission";

export default function TesterSubmissionDetailPage({
    params,
}: {
    params: Promise<{ submission_id: string }>;
}) {
    const { submission_id } = use(params);

    const [detail, setDetail] = useState<QuizSubmissionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // State lưu trữ dữ liệu chấm điểm cho từng câu
    const [gradings, setGradings] = useState<
        Record<string, { score: number; feedback: string }>
    >({});

    const fetchDetail = async () => {
        setLoading(true);
        setError(null);
        const res = await getSubmissionDetailAction(submission_id);
        if (res.success && res.data) {
            setDetail(res.data);

            // Khởi tạo state chấm điểm từ dữ liệu có sẵn
            const initialGradings: Record<string, { score: number; feedback: string }> = {};
            res.data.answers.forEach((ans) => {
                initialGradings[ans.detail_id] = {
                    score: ans.score_earned ?? 0,
                    feedback: ans.teacher_feedback || "",
                };
            });
            setGradings(initialGradings);
        } else {
            setError(res.error || "Không thể tải nội dung bài làm.");
        }
        setLoading(false);
    };

    useEffect(() => {
        if (submission_id) fetchDetail();
    }, [submission_id]);

    const handleScoreChange = (detailId: string, value: string) => {
        const score = parseFloat(value) || 0;
        setGradings((prev) => ({
            ...prev,
            [detailId]: { ...prev[detailId], score },
        }));
    };

    const handleFeedbackChange = (detailId: string, value: string) => {
        setGradings((prev) => ({
            ...prev,
            [detailId]: { ...prev[detailId], feedback: value },
        }));
    };

    const handleSaveGrading = async () => {
        if (!detail) return;
        setSaving(true);
        setError(null);
        setSuccessMsg(null);

        const payload: QuestionGradingPayload[] = detail.answers.map((ans) => ({
            detail_id: ans.detail_id,
            score_earned: gradings[ans.detail_id]?.score ?? 0,
            teacher_feedback: gradings[ans.detail_id]?.feedback || "",
        }));

        const res = await updateSubmissionGradingAction(submission_id, payload);

        if (res.success) {
            setSuccessMsg("Đã lưu điểm và nhận xét thành công!");
            await fetchDetail(); // Tải lại thông tin mới nhất
        } else {
            setError(res.error || "Lưu điểm thất bại");
        }
        setSaving(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-20">
            <Navbar />

            {/* Header Section - Đổi sang tone Blue chuyên nghiệp */}
            <section className="bg-blue-600 text-white py-6 px-4 sm:px-6 lg:px-8 border-b border-blue-700">
                <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <button
                            onClick={() => window.history.back()}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-100 hover:text-white bg-blue-700/50 hover:bg-blue-700 px-2.5 py-1 rounded-md transition-colors border border-blue-500/30 mb-2.5 cursor-pointer"
                        >
                            <ArrowLeft size={13} /> Quay lại
                        </button>
                        <h1 className="text-xl font-bold tracking-tight text-white">
                            Chấm điểm bài làm sinh viên
                        </h1>
                        {detail && (
                            <p className="text-blue-100 text-xs mt-0.5">
                                Bài thi: <span className="font-semibold text-white">{detail.quiz_title}</span>
                            </p>
                        )}
                    </div>

                    {/* Nút lưu điểm ở Header */}
                    {detail && (
                        <button
                            onClick={handleSaveGrading}
                            disabled={saving}
                            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors shadow-2xs disabled:opacity-50 cursor-pointer self-start sm:self-auto"
                        >
                            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                            Lưu kết quả chấm
                        </button>
                    )}
                </div>
            </section>

            <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Thông báo Lỗi / Thành công */}
                {error && (
                    <div className="mb-5 flex items-center gap-2.5 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-medium">
                        <AlertCircle size={16} className="text-rose-500 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {successMsg && (
                    <div className="mb-5 flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-medium">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                        <span>{successMsg}</span>
                    </div>
                )}

                {loading && (
                    <div className="flex items-center justify-center py-20 bg-white rounded-xl border border-slate-200">
                        <Loader2 size={20} className="animate-spin text-blue-600 mr-2" />
                        <span className="text-xs text-slate-500 font-medium">Đang tải chi tiết bài làm...</span>
                    </div>
                )}

                {!loading && detail && (
                    <div className="space-y-6">
                        {/* Card thông tin lượt nộp */}
                        <div className="bg-white rounded-xl border border-slate-200 p-5 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-2xs">
                            <div className="space-y-1">
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                    Sinh viên
                                </span>
                                <p className="font-semibold text-slate-900 flex items-center gap-1.5 text-sm">
                                    <User size={14} className="text-slate-400" /> {detail.username}
                                </p>
                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                    <Mail size={12} className="text-slate-400" /> {detail.email}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                    Trạng thái
                                </span>
                                <div className="mt-1">
                                    {detail.status === "GRADED" ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                                            <CheckCircle2 size={12} className="text-emerald-600" />
                                            Đã chấm điểm
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/70">
                                            <AlertCircle size={12} className="text-amber-600" />
                                            Chờ chấm điểm
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1 md:text-right">
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                    Điểm hiện tại
                                </span>
                                <p className="text-2xl font-bold font-mono text-blue-600">
                                    {detail.score !== null ? detail.score : "—"}
                                    <span className="text-xs font-normal text-slate-400 font-sans ml-1">
                                        / {detail.max_possible_score} đ
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* Danh sách câu hỏi */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <FileText size={16} className="text-blue-600" /> Chi tiết câu hỏi ({detail.answers.length})
                                </h2>
                            </div>

                            {detail.answers.map((ans, idx) => (
                                <div key={ans.detail_id || idx} className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                                        <div className="flex items-start gap-2.5">
                                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold border border-slate-200 shrink-0 mt-0.5">
                                                Câu {idx + 1}
                                            </span>
                                            <div
                                                className="text-slate-900 text-sm font-medium leading-relaxed [&>p]:m-0 [&>p]:inline"
                                                dangerouslySetInnerHTML={{ __html: ans.question_text }}
                                            />
                                        </div>

                                        {/* Ô nhập điểm trực tiếp */}
                                        <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-lg self-start">
                                            <Award size={14} className="text-slate-400" />
                                            <span className="text-xs text-slate-600 font-semibold">Điểm:</span>
                                            <input
                                                type="number"
                                                step="0.25"
                                                min="0"
                                                max={ans.max_score}
                                                value={gradings[ans.detail_id]?.score ?? 0}
                                                onChange={(e) => handleScoreChange(ans.detail_id, e.target.value)}
                                                className="w-14 text-center font-mono font-bold text-xs bg-white border border-slate-300 rounded py-0.5 px-1 text-blue-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                            />
                                            <span className="text-xs text-slate-400 font-medium">/ {ans.max_score}</span>
                                        </div>
                                    </div>

                                    {/* Trắc nghiệm */}
                                    {ans.options && ans.options.length > 0 && (
                                        <div className="space-y-2 my-3">
                                            {ans.options.map((opt) => {
                                                const selected = ans.selected_option_id === opt.option_id;
                                                const isCorrect = opt.is_correct;

                                                let optionStyle = "border-slate-200 bg-slate-50/50 text-slate-700";
                                                if (selected && isCorrect) optionStyle = "border-emerald-300 bg-emerald-50/60 text-emerald-900 font-medium";
                                                else if (selected && !isCorrect) optionStyle = "border-rose-300 bg-rose-50/60 text-rose-900";
                                                else if (isCorrect) optionStyle = "border-emerald-200 bg-emerald-50/30 text-emerald-800 font-medium";

                                                return (
                                                    <div
                                                        key={opt.option_id}
                                                        className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${optionStyle}`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span>{opt.option_text}</span>
                                                            {selected && (
                                                                <span className="text-[10px] bg-slate-800 text-white font-medium px-1.5 py-0.2 rounded">
                                                                    Sinh viên chọn
                                                                </span>
                                                            )}
                                                        </div>
                                                        {isCorrect && (
                                                            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                                                <CheckCircle2 size={13} /> Đáp án đúng
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Tự luận văn bản */}
                                    {ans.essay_answer_text && (
                                        <div className="mt-3 p-3 bg-slate-50/80 border border-slate-200/80 rounded-lg">
                                            <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                                                Bài làm tự luận:
                                            </span>
                                            <div
                                                className="text-xs text-slate-800 prose prose-sm max-w-none leading-relaxed"
                                                dangerouslySetInnerHTML={{ __html: ans.essay_answer_text }}
                                            />
                                        </div>
                                    )}

                                    {/* Tự luận đồ thị / bài vẽ */}
                                    {ans.graph_image_url && (
                                        <div className="mt-3 p-3 bg-slate-50/80 border border-slate-200/80 rounded-lg">
                                            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-2">
                                                <ImageIcon size={13} /> Hình vẽ / Đồ thị của sinh viên:
                                            </span>
                                            <img
                                                src={ans.graph_image_url}
                                                alt="Graph Submission"
                                                className="max-h-64 rounded border border-slate-200 bg-white object-contain"
                                            />
                                        </div>
                                    )}

                                    {/* Ô nhập nhận xét của Tester */}
                                    <div className="mt-4 pt-3 border-t border-slate-100">
                                        <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mb-1.5">
                                            <MessageSquare size={13} className="text-blue-600" /> Nhận xét của người chấm:
                                        </label>
                                        <textarea
                                            rows={2}
                                            placeholder="Nhập lời nhắn, góp ý hoặc giải thích cho sinh viên..."
                                            value={gradings[ans.detail_id]?.feedback || ""}
                                            onChange={(e) => handleFeedbackChange(ans.detail_id, e.target.value)}
                                            className="w-full text-xs p-2.5 bg-slate-50/50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 placeholder-slate-400 transition-all"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Nút Lưu ở cuối trang */}
                        <div className="flex justify-end pt-2">
                            <button
                                onClick={handleSaveGrading}
                                disabled={saving}
                                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-lg text-xs transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Lưu toàn bộ kết quả chấm
                            </button>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}