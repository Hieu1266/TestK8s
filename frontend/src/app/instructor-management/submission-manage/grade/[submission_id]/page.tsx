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
    Clock,
    FileText,
    Image as ImageIcon,
    Save,
    MessageSquare,
} from "lucide-react";
import {
    getSubmissionDetailAction,
    updateSubmissionGradingAction,
} from "@/actions/getQuizSubmission";
import { QuizSubmissionDetail, QuestionGradingPayload, QuestionType } from "@/types/quiz-submission";

// ---- Hỗ trợ hiển thị câu hỏi điền khuyết (FILL_IN_BLANK) ----
// Chỗ trống trong đề bài được đánh dấu bằng một dãy gạch dưới liên tiếp (vd: "_____").
const BLANK_MARKER_REGEX = /_{3,}/g;
// Dùng để tách nhiều đáp án (nếu câu có nhiều hơn 1 chỗ trống) đã được nối khi lưu essay_answer_text.
const BLANK_ANSWER_DELIMITER = "|||";

/** Tách nội dung câu hỏi thành các đoạn text xen kẽ chỗ trống. Số chỗ trống = số đoạn - 1. */
function splitByBlank(text: string): string[] {
    return (text || "").split(BLANK_MARKER_REGEX);
}

/** Câu điền khuyết thường lưu nội dung có chỗ trống ở body_content (question_text chỉ là nhãn chung). */
function getFillInBlankSourceText(questionText: string, bodyContent?: string | null): string {
    const trimmedBody = (bodyContent || "").trim();
    return trimmedBody ? trimmedBody : questionText;
}

function normalizeBlankAnswer(text?: string | null): string {
    return (text || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export default function SubmissionDetailPage({
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
        <div className="min-h-screen bg-slate-100 text-slate-800 pb-20">
            <Navbar />

            {/* Header */}
            <section className="bg-gradient-to-r from-[#0052D4] via-[#0066FF] to-[#4364F7] text-white py-8 px-6">
                <div className="max-w-5xl mx-auto flex justify-between items-end">
                    <div>
                        <button
                            onClick={() => window.history.back()}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1 rounded-full mb-3 transition cursor-pointer"
                        >
                            <ArrowLeft size={14} /> Quay lại
                        </button>
                        <h1 className="text-2xl font-bold">Chấm điểm bài làm sinh viên</h1>
                        {detail && (
                            <p className="text-blue-100 text-xs mt-1">
                                Bài thi: <span className="font-semibold text-white">{detail.quiz_title}</span>
                            </p>
                        )}
                    </div>

                    {/* Nút lưu điểm ở Header */}
                    {detail && (
                        <button
                            onClick={handleSaveGrading}
                            disabled={saving}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-md transition disabled:opacity-50 cursor-pointer"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Lưu kết quả chấm
                        </button>
                    )}
                </div>
            </section>

            <section className="max-w-5xl mx-auto px-6 py-8">
                {/* Thông báo Lỗi / Thành công */}
                {error && (
                    <div className="mb-6 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-medium">
                        <AlertCircle size={18} className="text-red-500 shrink-0" />
                        {error}
                    </div>
                )}

                {successMsg && (
                    <div className="mb-6 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs font-medium">
                        <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                        {successMsg}
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
                        <Loader2 size={32} className="animate-spin text-[#0066FF] mb-2" />
                        <span className="text-xs text-slate-500 font-medium">Đang tải chi tiết bài làm...</span>
                    </div>
                )}

                {!loading && detail && (
                    <div className="space-y-6">
                        {/* Card thông tin lượt nộp */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-sm">
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Sinh viên</span>
                                <p className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                                    <User size={15} className="text-slate-400" /> {detail.username}
                                </p>
                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                    <Mail size={13} className="text-slate-400" /> {detail.email}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Trạng thái</span>
                                <div className="mt-1">
                                    <span
                                        className={`inline-block text-xs px-2.5 py-1 rounded-full font-bold ${detail.status === "GRADED"
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-amber-100 text-amber-700"
                                            }`}
                                    >
                                        {detail.status === "GRADED" ? "Đã chấm điểm" : "Chờ chấm điểm"}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1 md:text-right">
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Điểm hiện tại</span>
                                <p className="text-2xl font-extrabold text-[#0066FF]">
                                    {detail.score !== null ? detail.score : "--"}
                                    <span className="text-xs font-normal text-slate-400">
                                        {" "}
                                        / {detail.max_possible_score} đ
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* Danh sách câu hỏi */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <FileText size={18} className="text-[#0066FF]" /> Chi tiết câu hỏi ({detail.answers.length})
                            </h2>

                            {detail.answers.map((ans, idx) => (
                                <div key={ans.detail_id || idx} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                    <div className="flex justify-between items-start gap-4 mb-3">
                                        <div className="font-bold text-slate-800 text-sm flex items-start gap-2">
                                            <span className="bg-blue-50 text-[#0066FF] px-2 py-0.5 rounded-md text-xs font-bold border border-blue-100 shrink-0 mt-0.5">
                                                Câu {idx + 1}
                                            </span>
                                            <div
                                                className="text-slate-800 text-sm font-semibold [&>p]:m-0 [&>p]:inline"
                                                dangerouslySetInnerHTML={{ __html: ans.question_text }}
                                            />
                                        </div>

                                        {/* Ô nhập điểm trực tiếp */}
                                        <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                                            <span className="text-xs text-slate-500 font-bold">Điểm:</span>
                                            <input
                                                type="number"
                                                step="0.25"
                                                min="0"
                                                max={ans.max_score}
                                                value={gradings[ans.detail_id]?.score ?? 0}
                                                onChange={(e) => handleScoreChange(ans.detail_id, e.target.value)}
                                                className="w-16 text-center font-bold text-sm bg-white border border-slate-300 rounded-lg py-0.5 px-1 text-[#0066FF] focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className="text-xs text-slate-400 font-semibold">/ {ans.max_score}</span>
                                        </div>
                                    </div>

                                    {/* Trắc nghiệm */}
                                    {ans.question_type !== QuestionType.FILL_IN_BLANK && ans.options && ans.options.length > 0 && (
                                        <div className="space-y-2 mt-4 pl-2">
                                            {ans.options.map((opt) => {
                                                const selected = ans.selected_option_id === opt.option_id;
                                                const isCorrect = opt.is_correct;

                                                let optionStyle = "border-slate-200 bg-slate-50/50 text-slate-700";
                                                if (selected && isCorrect) optionStyle = "border-emerald-300 bg-emerald-50 text-emerald-800 font-medium";
                                                else if (selected && !isCorrect) optionStyle = "border-red-300 bg-red-50 text-red-800";
                                                else if (isCorrect) optionStyle = "border-blue-200 bg-blue-50/60 text-blue-800 font-medium";

                                                return (
                                                    <div
                                                        key={opt.option_id}
                                                        className={`p-3 rounded-xl border text-xs flex items-center justify-between ${optionStyle}`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span>{opt.option_text}</span>
                                                            {selected && (
                                                                <span className="text-[10px] bg-slate-800 text-white px-1.5 py-0.5 rounded">
                                                                    Sinh viên chọn
                                                                </span>
                                                            )}
                                                        </div>
                                                        {isCorrect && (
                                                            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                                                                <CheckCircle2 size={14} /> Đáp án đúng
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Điền khuyết */}
                                    {ans.question_type === QuestionType.FILL_IN_BLANK && (() => {
                                        const parts = splitByBlank(getFillInBlankSourceText(ans.question_text, ans.body_content));
                                        const blankCount = parts.length - 1;
                                        const studentValues = (ans.essay_answer_text ?? "").split(BLANK_ANSWER_DELIMITER);
                                        const correctOption = ans.options.find((o) => o.is_correct);
                                        const correctValues = correctOption
                                            ? correctOption.option_text.split(BLANK_ANSWER_DELIMITER)
                                            : [];

                                        return (
                                            <div className="mt-4 pl-2">
                                                <div className="text-sm text-slate-700 leading-loose">
                                                    {parts.map((part, i) => {
                                                        const studentValue = studentValues[i] ?? "";
                                                        const isBlankCorrect =
                                                            normalizeBlankAnswer(studentValue) === normalizeBlankAnswer(correctValues[i]);

                                                        let blankStyle = "border-slate-200 bg-slate-50/50 text-slate-700";
                                                        if (studentValue) {
                                                            blankStyle = isBlankCorrect
                                                                ? "border-emerald-300 bg-emerald-50 text-emerald-800 font-medium"
                                                                : "border-red-300 bg-red-50 text-red-800 font-medium";
                                                        }

                                                        return (
                                                            <span key={i}>
                                                                {part}
                                                                {i < blankCount && (
                                                                    <span
                                                                        className={`inline-block mx-1 px-2.5 py-1 rounded-lg border text-xs ${blankStyle}`}
                                                                    >
                                                                        {studentValue || "Chưa trả lời"}
                                                                    </span>
                                                                )}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                                {correctOption && (
                                                    <p className="mt-2 flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                                                        <CheckCircle2 size={13} /> Đáp án đúng: {correctOption.option_text}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* Tự luận văn bản */}
                                    {ans.essay_answer_text && ans.question_type !== QuestionType.FILL_IN_BLANK && (
                                        <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                            <span className="text-[11px] font-bold text-slate-400 block mb-1">Bài làm tự luận:</span>
                                            <div
                                                className="text-xs text-slate-800 prose prose-sm max-w-none"
                                                dangerouslySetInnerHTML={{ __html: ans.essay_answer_text }}
                                            />
                                        </div>
                                    )}

                                    {/* Tự luận đồ thị / bài vẽ */}
                                    {ans.graph_image_url && (
                                        <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mb-2">
                                                <ImageIcon size={13} /> Hình vẽ / Đồ thị của sinh viên:
                                            </span>
                                            <img
                                                src={ans.graph_image_url}
                                                alt="Graph Submission"
                                                className="max-h-64 rounded-lg border border-slate-200 bg-white object-contain"
                                            />
                                        </div>
                                    )}

                                    {/* Ô nhập nhận xét của Giảng viên */}
                                    <div className="mt-4 pt-3 border-t border-slate-100">
                                        <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-1.5">
                                            <MessageSquare size={13} className="text-[#0066FF]" /> Nhận xét của giảng viên:
                                        </label>
                                        <textarea
                                            rows={2}
                                            placeholder="Nhập lời nhắn, góp ý hoặc giải thích cho sinh viên..."
                                            value={gradings[ans.detail_id]?.feedback || ""}
                                            onChange={(e) => handleFeedbackChange(ans.detail_id, e.target.value)}
                                            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 placeholder-slate-400"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Nút Lưu ở cuối trang */}
                        <div className="flex justify-end pt-4">
                            <button
                                onClick={handleSaveGrading}
                                disabled={saving}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                Lưu toàn bộ kết quả chấm
                            </button>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}