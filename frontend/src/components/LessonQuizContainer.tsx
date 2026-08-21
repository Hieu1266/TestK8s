'use client';

import { useState, useEffect } from 'react';
import {
    startQuizSubmissionAction,
    updateSubmissionDetailAction,
    submitQuizAction,
    getQuizStatusByLessonAction,
    getCourseInProgressCountAction,
} from '@/actions/getQuizSubmission';
import {
    QuizTakeResponse,
    QuestionType,
    QuizSubmitResponse,
    QuizSubmissionStatusResponse,
} from '@/types/quiz-submission';
import { SubmissionStatus } from '@/types/statuses';

// Với câu FILL_IN_BLANK, `essayText` lưu đáp án của (các) chỗ trống, nối với nhau
// bằng BLANK_ANSWER_DELIMITER khi câu hỏi có nhiều hơn 1 chỗ trống.
type AnswersMap = Record<string, { optionId?: string; essayText?: string }>;

// `is_peer_review` chưa có trong type QuizSubmissionStatusResponse gốc (backend mới bổ sung) —
// mở rộng cục bộ để không phải sửa file type dùng chung.
type StatusWithPeerReview = QuizSubmissionStatusResponse & { is_peer_review?: boolean | null };

const MIN_MEMBERS_FOR_PEER_REVIEW = 3;

// ---- Hỗ trợ câu hỏi điền khuyết (FILL_IN_BLANK) ----
// Chỗ trống trong đề bài được đánh dấu bằng một dãy gạch dưới liên tiếp (vd: "_____").
const BLANK_MARKER_REGEX = /_{3,}/g;
// Dùng để nối nhiều đáp án (nếu câu có nhiều hơn 1 chỗ trống) thành 1 chuỗi lưu vào essay_answer_text.
const BLANK_ANSWER_DELIMITER = '|||';

/** Tách nội dung câu hỏi thành các đoạn text xen kẽ chỗ trống. Số chỗ trống = số đoạn - 1. */
function splitByBlank(text: string): string[] {
    return (text || '').split(BLANK_MARKER_REGEX);
}

/** Với FILL_IN_BLANK, câu có chỗ trống thường được lưu trong body_content (question_title chỉ là tiêu đề chung như "Điền từ còn thiếu vào chỗ trống"). Ưu tiên body_content nếu có nội dung, nếu không mới dùng question_title. */
function getFillInBlankSourceText(question_title: string, body_content?: string | null): string {
    const trimmedBody = (body_content || '').trim();
    return trimmedBody ? trimmedBody : question_title;
}

function normalizeBlankAnswer(text?: string | null): string {
    return (text || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Khối nút bắt đầu/làm lại bài thi — hiển thị 2 lựa chọn khi đề thi hỗ trợ chấm chéo. */
function StartQuizActions({
    isPeerReview,
    loading,
    canJoinPeerReview,
    inProgressCountLoading,
    inProgressCount,
    onStart,
    idleLabel,
}: {
    isPeerReview: boolean;
    loading: boolean;
    canJoinPeerReview: boolean;
    inProgressCountLoading: boolean;
    inProgressCount: number | null;
    onStart: (choosePeerReview: boolean) => void;
    idleLabel: string;
}) {
    if (!isPeerReview) {
        return (
            <button
                onClick={() => onStart(false)}
                disabled={loading}
                className="w-full bg-[#5B5FEF] hover:bg-[#4B4FEF] text-white text-sm font-bold py-3.5 rounded-full transition-transform hover:scale-[1.01] disabled:opacity-50"
            >
                {loading ? 'Đang chuẩn bị đề thi...' : idleLabel}
            </button>
        );
    }

    return (
        <div className="space-y-3 text-left">
            <p className="text-sm text-[#565A70] text-center">
                Đề thi này hỗ trợ chấm chéo. Chọn hình thức nộp bài phù hợp với bạn:
            </p>

            <button
                onClick={() => onStart(false)}
                disabled={loading}
                className="w-full bg-[#5B5FEF] hover:bg-[#4B4FEF] text-white text-sm font-bold py-3.5 rounded-full transition-transform hover:scale-[1.01] disabled:opacity-50"
            >
                {loading ? 'Đang chuẩn bị đề thi...' : 'Nộp bài cho giảng viên chấm'}
            </button>

            <button
                onClick={() => onStart(true)}
                disabled={loading || inProgressCountLoading || !canJoinPeerReview}
                title={
                    !inProgressCountLoading && !canJoinPeerReview
                        ? 'Cần tối thiểu 3 học viên đang học khóa này để mở chấm chéo'
                        : undefined
                }
                className="w-full bg-white hover:bg-[#F7F8FB] text-[#5B5FEF] border-2 border-[#5B5FEF] text-sm font-bold py-3.5 rounded-full transition-transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:border-[#D9DBE6] disabled:text-[#8A8FA3] disabled:hover:scale-100"
            >
                {inProgressCountLoading
                    ? 'Đang kiểm tra điều kiện chấm chéo...'
                    : loading
                        ? 'Đang chuẩn bị đề thi...'
                        : 'Tham gia chấm chéo'}
            </button>

            {!inProgressCountLoading && !canJoinPeerReview && (
                <p className="text-xs text-[#8A8FA3] text-center">
                    Khóa học cần có từ {MIN_MEMBERS_FOR_PEER_REVIEW} học viên đang học trở lên mới có thể tham gia chấm chéo
                    {inProgressCount !== null ? ` (hiện tại: ${inProgressCount})` : ''}.
                </p>
            )}
        </div>
    );
}

export function QuizSection({
    lessonId,
    courseId,
    isPeerReview,
    onQuizPassed,
    onNextLessonUnlocked,
    onQuizIdResolved,
}: {
    lessonId: string;
    courseId: string;
    isPeerReview: boolean;
    onQuizPassed?: (status?: string, isPass?: boolean) => void;
    /** 🎯 Gọi khi vừa nộp bài, backend đã mở khóa bài tiếp theo (next_lesson_unlocked = true)
     *  nhưng bài thi CHƯA chấm xong (status = SUBMITTED, đang chờ chấm chéo/giảng viên).
     *  Chỉ nên cập nhật UI mở khóa bài sau — KHÔNG đánh dấu bài hiện tại hoàn thành. */
    onNextLessonUnlocked?: (status?: string) => void;
    /** Báo cho component cha biết quiz_id của đề thi hiện tại (dùng để hiển thị PeerReviewSection ở ngoài). */
    /** Báo cho component cha biết quiz_id + trạng thái bài nộp hiện tại (dùng để hiển thị PeerReviewSection ở ngoài — chỉ hiện khi đã nộp bài). */
    onQuizIdResolved?: (quizId: string | null, status?: string | null) => void;
}) {
    // Trạng thái đã lưu (fetch từ server khi vào bài học)
    const [initialStatus, setInitialStatus] = useState<QuizSubmissionStatusResponse | null>(null);
    const [statusLoading, setStatusLoading] = useState(true);
    const [statusError, setStatusError] = useState<string | null>(null);

    // Trạng thái đang làm bài (dùng chung cho case bắt đầu mới hoặc tiếp tục IN_PROGRESS)
    const [quizData, setQuizData] = useState<QuizTakeResponse | null>(null);
    const [answers, setAnswers] = useState<AnswersMap>({});
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [savingDetailId, setSavingDetailId] = useState<string | null>(null);
    const [result, setResult] = useState<QuizSubmitResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Ghi nhớ chế độ được chọn khi bắt đầu (chấm chéo hay giảng viên chấm) để hiển thị đúng thông báo sau khi nộp
    const [startedAsPeerReview, setStartedAsPeerReview] = useState(false);

    // Số học viên đang học khóa (chỉ cần khi đề thi hỗ trợ chấm chéo)
    const [inProgressCount, setInProgressCount] = useState<number | null>(null);
    const [inProgressCountLoading, setInProgressCountLoading] = useState(false);

    const canJoinPeerReview =
        isPeerReview && inProgressCount !== null && inProgressCount >= MIN_MEMBERS_FOR_PEER_REVIEW;

    // ---- -1. Kiểm tra điều kiện tham gia chấm chéo (số học viên đang học khóa) ----
    useEffect(() => {
        let cancelled = false;

        if (!isPeerReview || !courseId) {
            setInProgressCount(null);
            return;
        }

        (async () => {
            setInProgressCountLoading(true);
            const res = await getCourseInProgressCountAction(courseId);
            if (!cancelled) {
                setInProgressCount(res.success ? res.data ?? 0 : 0);
            }
            setInProgressCountLoading(false);
        })();

        return () => {
            cancelled = true;
        };
    }, [isPeerReview, courseId]);

    // ---- 0. Fetch trạng thái bài thi đã lưu khi vào bài học ----
    useEffect(() => {
        let cancelled = false;

        async function fetchStatus() {
            setStatusLoading(true);
            setStatusError(null);
            setResult(null);
            setQuizData(null);
            setAnswers({});
            onQuizIdResolved?.(null, null);

            const res = await getQuizStatusByLessonAction(lessonId);
            if (cancelled) return;

            if (!res.success) {
                setStatusError(res.error || 'Không thể tải trạng thái bài thi.');
                setInitialStatus(null);
            } else {
                setInitialStatus(res.data ?? null);
                onQuizIdResolved?.(res.data?.quiz_id ?? null, res.data?.status ?? null);

                // Nếu đang làm dở -> prefill sẵn để hiển thị tiến trình đã lưu
                if (res.data?.status === SubmissionStatus.IN_PROGRESS) {
                    const prefilledAnswers: AnswersMap = {};
                    res.data.questions.forEach((q) => {
                        prefilledAnswers[q.detail_id] = {
                            optionId: q.selected_option_id ?? undefined,
                            essayText: q.essay_answer_text ?? undefined,
                        };
                    });

                    setAnswers(prefilledAnswers);
                    setQuizData({
                        submission_id: res.data.submission_id,
                        quiz_id: res.data.quiz_id,
                        title: res.data.title || '',
                        quiz_type: res.data.quiz_type as any,
                        attempt_number: res.data.attempt_number,
                        questions: res.data.questions.map((q) => ({
                            detail_id: q.detail_id,
                            question_id: q.question_id,
                            question_title: q.question_title,
                            question_type: q.question_type,
                            body_content: q.body_content ?? null,
                            max_points: q.max_points ?? null,
                            options: q.options.map((o) => ({
                                option_id: o.option_id,
                                option_text: o.option_text,
                            })),
                        })),
                    });
                }
            }
            setStatusLoading(false);
        }

        if (lessonId) fetchStatus();
        return () => {
            cancelled = true;
        };
    }, [lessonId]);

    // 1. Bắt đầu làm bài thi (dùng cho lần đầu hoặc "Làm lại")
    const handleStartQuiz = async (choosePeerReview: boolean = false) => {
        setLoading(true);
        setError(null);
        setResult(null);
        const res = await startQuizSubmissionAction(lessonId, choosePeerReview);
        setLoading(false);

        if (res.success && res.data) {
            setQuizData(res.data);
            setAnswers({});
            setInitialStatus(null); // Chuyển hẳn sang chế độ đang làm bài mới
            setStartedAsPeerReview(choosePeerReview);
            onQuizIdResolved?.(res.data.quiz_id, SubmissionStatus.IN_PROGRESS);
        } else {
            setError(res.error || 'Không thể tải đề thi.');
        }
    };

    // 2. Chọn đáp án Trắc nghiệm / Đúng Sai
    const handleSelectOption = async (detailId: string, optionId: string) => {
        setAnswers((prev) => ({ ...prev, [detailId]: { ...prev[detailId], optionId } }));
        setSavingDetailId(detailId);
        await updateSubmissionDetailAction(detailId, { selected_option_id: optionId });
        setSavingDetailId(null);
    };

    // 3. Nhập câu trả lời Tự luận
    const handleEssayBlur = async (detailId: string, text: string) => {
        setSavingDetailId(detailId);
        await updateSubmissionDetailAction(detailId, { essay_answer_text: text });
        setSavingDetailId(null);
    };

    // 3b. Nhập câu trả lời Điền khuyết (FILL_IN_BLANK) — cập nhật giá trị của 1 chỗ trống cụ thể
    const handleBlankChange = (detailId: string, blankIndex: number, value: string) => {
        setAnswers((prev) => {
            const currentValues = (prev[detailId]?.essayText ?? '').split(BLANK_ANSWER_DELIMITER);
            currentValues[blankIndex] = value;
            return {
                ...prev,
                [detailId]: { ...prev[detailId], essayText: currentValues.join(BLANK_ANSWER_DELIMITER) },
            };
        });
    };

    // Lưu đáp án điền khuyết xuống server khi rời khỏi input (blur)
    const handleBlankBlur = async (detailId: string) => {
        const text = answers[detailId]?.essayText ?? '';
        setSavingDetailId(detailId);
        await updateSubmissionDetailAction(detailId, { essay_answer_text: text });
        setSavingDetailId(null);
    };

    // 4. Nộp bài
    const handleSubmit = async () => {
        if (!quizData) return;
        setSubmitting(true);
        setError(null);

        const res = await submitQuizAction(quizData.submission_id);
        setSubmitting(false);

        if (res.success && res.data) {
            setResult(res.data);
            onQuizIdResolved?.(quizData.quiz_id, res.data.status);
            // 🎯 Backend chỉ set next_lesson_unlocked = true cho 2 trường hợp:
            //  (1) status = GRADED và is_passed = true -> đã thực sự hoàn thành bài học
            //      -> gọi onQuizPassed để vừa đánh dấu bài hiện tại COMPLETED vừa mở khóa bài sau.
            //  (2) status = SUBMITTED (đang chờ chấm chéo/giảng viên) -> chỉ mở khóa bài sau để
            //      học viên có thể học tiếp trong lúc chờ, bài hiện tại CHƯA hoàn thành
            //      -> chỉ gọi onNextLessonUnlocked, không được gọi onQuizPassed.
            if (
                res.data.status === SubmissionStatus.GRADED &&
                res.data.is_passed === true &&
                onQuizPassed
            ) {
                onQuizPassed(res.data.status, res.data.is_passed);
            } else if (res.data.next_lesson_unlocked && onNextLessonUnlocked) {
                onNextLessonUnlocked(res.data.status);
            }
        } else {
            setError(res.error || 'Nộp bài thất bại.');
        }
    };

    // ---------------- LOADING TRẠNG THÁI BAN ĐẦU ----------------
    if (statusLoading) {
        return (
            <div className="bg-white border border-[#ECEAF0] rounded-2xl p-8 text-center">
                <div className="w-6 h-6 mx-auto rounded-full border-2 border-[#E7E9F0] border-t-[#5B5FEF] animate-spin" />
                <p className="text-sm text-[#8A8FA3] mt-3">Đang kiểm tra trạng thái bài thi...</p>
            </div>
        );
    }

    // ---------------- MÀN HÌNH KẾT QUẢ (vừa nộp trong phiên hiện tại) ----------------
    if (result) {
        const isPendingGrading = result.status === 'SUBMITTED' || result.total_score === null || result.total_score === undefined;

        if (isPendingGrading) {
            return (
                <div className="bg-white border border-[#ECEAF0] rounded-2xl p-10 text-center space-y-5">
                    <div className="w-20 h-20 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center mx-auto text-3xl font-bold">⏳</div>
                    <h3 className="font-display text-2xl font-bold text-[#161826]">Đã nộp bài thành công!</h3>
                    <p className="text-sm text-[#565A70] max-w-lg mx-auto leading-relaxed">
                        {startedAsPeerReview
                            ? 'Bài làm của bạn chứa câu hỏi tự luận và sẽ được các bạn học viên khác trong khóa học chấm chéo. Kết quả sẽ được cập nhật sau khi hoàn tất.'
                            : 'Bài làm của bạn chứa câu hỏi tự luận và đang chờ giảng viên chấm điểm. Kết quả sẽ được cập nhật sau khi hoàn tất.'}
                    </p>
                    <div className="pt-2">
                        <span className="inline-block text-xs font-semibold text-[#D97706] bg-[#FFFBEB] border border-[#FDE68A] px-4 py-2 rounded-full">
                            {startedAsPeerReview ? 'Trạng thái: Đang chờ chấm chéo' : 'Trạng thái: Đang chờ chấm điểm'}
                        </span>
                    </div>
                </div>
            );
        }

        return (
            <div className="bg-white border border-[#ECEAF0] rounded-2xl p-10 text-center space-y-5">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto text-3xl font-bold ${result.is_passed ? 'bg-[#E6F8F3] text-[#12B886]' : 'bg-[#FDE8E8] text-[#E5484D]'}`}>
                    {result.is_passed ? '✓' : '✕'}
                </div>
                <h3 className="font-display text-2xl font-bold text-[#161826]">
                    {result.is_passed ? 'Chúc mừng! Bạn đã đạt bài kiểm tra' : 'Chưa đạt yêu cầu'}
                </h3>
                <p className="text-base text-[#565A70]">
                    Điểm số của bạn: <strong className="text-[#161826]">{result.total_score}</strong>
                </p>
                {result.next_lesson_unlocked && (
                    <p className="text-sm text-[#12B886] font-bold">Bài học tiếp theo đã được mở khóa!</p>
                )}

                {/* NÚT LÀM LẠI BÀI THI KHI CHƯA ĐẠT (VỪA NỘP XONG) */}
                {!result.is_passed && (
                    <div className="pt-2 max-w-sm mx-auto">
                        {error && <p className="text-sm text-[#E5484D] font-medium mb-2">{error}</p>}
                        <StartQuizActions
                            isPeerReview={isPeerReview}
                            loading={loading}
                            canJoinPeerReview={canJoinPeerReview}
                            inProgressCountLoading={inProgressCountLoading}
                            inProgressCount={inProgressCount}
                            onStart={handleStartQuiz}
                            idleLabel="Làm lại bài thi"
                        />
                    </div>
                )}
            </div>
        );
    }

    // ---------------- CHẾ ĐỘ CHỈ XEM: đã SUBMITTED hoặc GRADED ----------------
    if (initialStatus && (initialStatus.status === SubmissionStatus.SUBMITTED || initialStatus.status === SubmissionStatus.GRADED)) {
        const isGraded = initialStatus.status === SubmissionStatus.GRADED;
        const statusWithPeerReview = initialStatus as StatusWithPeerReview;
        const isSubmissionPeerReview = Boolean(statusWithPeerReview.is_peer_review);

        return (
            <div className="bg-white border border-[#ECEAF0] rounded-2xl p-8 space-y-7">
                <div className="border-b border-[#ECEAF0] pb-5 flex justify-between items-center">
                    <div>
                        <h3 className="font-display text-xl font-bold text-[#161826]">{initialStatus.title}</h3>
                        <span className="text-xs text-[#8A8FA3]">Lần thử: #{initialStatus.attempt_number}</span>
                    </div>
                    <span
                        className={`text-xs font-semibold px-4 py-2 rounded-full ${isGraded
                            ? initialStatus.is_passed
                                ? 'text-[#12B886] bg-[#E6F8F3] border border-[#B7EBDD]'
                                : 'text-[#E5484D] bg-[#FDE8E8] border border-[#F6C1C3]'
                            : 'text-[#D97706] bg-[#FFFBEB] border border-[#FDE68A]'
                            }`}
                    >
                        {isGraded
                            ? (initialStatus.is_passed ? 'Đã đạt' : 'Chưa đạt')
                            : isSubmissionPeerReview
                                ? 'Đang chờ chấm chéo'
                                : 'Đang chờ chấm điểm'}
                    </span>
                </div>

                {isGraded && (
                    <p className="text-base text-[#565A70]">
                        Điểm tổng: <strong className="text-[#161826]">{initialStatus.total_score}</strong>
                    </p>
                )}

                <div className="space-y-7">
                    {initialStatus.questions.map((q, idx) => (
                        <div key={q.detail_id} className="p-5 rounded-xl border border-[#F0F0F5] bg-[#FBFBFD] space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-[#161826]">
                                    Câu {idx + 1}: {q.question_title}
                                </span>
                                {isGraded && q.score_earned !== null && q.score_earned !== undefined && (
                                    <span className="text-sm font-bold text-[#5B5FEF]">
                                        {q.score_earned}/{q.max_points} điểm
                                    </span>
                                )}
                            </div>

                            {q.body_content && q.question_type !== QuestionType.FILL_IN_BLANK && (
                                <div className="text-sm text-[#565A70]" dangerouslySetInnerHTML={{ __html: q.body_content }} />
                            )}

                            {(q.question_type === QuestionType.MULTIPLE_CHOICE || q.question_type === QuestionType.TRUE_FALSE) && (
                                <div className="space-y-2.5 pt-1">
                                    {q.options.map((opt) => {
                                        const isSelected = q.selected_option_id === opt.option_id;
                                        let styleClass = 'border-[#ECEAF0] bg-white text-[#2B2D3D]';

                                        if (isGraded && opt.is_correct) {
                                            styleClass = 'border-[#12B886] bg-[#E6F8F3] text-[#0B8F63]';
                                        } else if (isGraded && isSelected && !opt.is_correct) {
                                            styleClass = 'border-[#E5484D] bg-[#FDE8E8] text-[#C4292E]';
                                        } else if (!isGraded && isSelected) {
                                            styleClass = 'border-[#5B5FEF] bg-[#EEF0FE] text-[#3F3FC9]';
                                        }

                                        return (
                                            <label
                                                key={opt.option_id}
                                                className={`flex items-center gap-3 p-3.5 rounded-lg border text-sm font-medium ${styleClass}`}
                                            >
                                                <input type="radio" checked={isSelected} disabled readOnly className="accent-[#5B5FEF] w-4 h-4" />
                                                <span>{opt.option_text}</span>
                                                {isGraded && opt.is_correct && (
                                                    <span className="ml-auto text-xs font-bold text-[#12B886]">Đáp án đúng</span>
                                                )}
                                            </label>
                                        );
                                    })}
                                </div>
                            )}

                            {q.question_type === QuestionType.ESSAY && (
                                <textarea
                                    rows={4}
                                    readOnly
                                    disabled
                                    value={q.essay_answer_text || 'Bạn chưa trả lời câu này.'}
                                    className="w-full text-sm p-3.5 bg-[#F7F8FB] border border-[#ECEAF0] rounded-xl text-[#565A70]"
                                />
                            )}

                            {q.question_type === QuestionType.FILL_IN_BLANK && (() => {
                                const parts = splitByBlank(getFillInBlankSourceText(q.question_title, q.body_content));
                                const blankCount = parts.length - 1;
                                const studentValues = (q.essay_answer_text ?? '').split(BLANK_ANSWER_DELIMITER);
                                // options[0].is_correct chỉ có giá trị khi bài đã được chấm (isGraded)
                                const correctOption = q.options.find((o) => o.is_correct);
                                const correctValues = correctOption
                                    ? correctOption.option_text.split(BLANK_ANSWER_DELIMITER)
                                    : [];

                                return (
                                    <div className="text-sm text-[#2B2D3D] leading-loose">
                                        {parts.map((part, i) => {
                                            const studentValue = studentValues[i] ?? '';
                                            const isBlankCorrect =
                                                isGraded &&
                                                normalizeBlankAnswer(studentValue) === normalizeBlankAnswer(correctValues[i]);

                                            let blankStyle = 'border-[#ECEAF0] bg-white text-[#2B2D3D]';
                                            if (isGraded) {
                                                blankStyle = isBlankCorrect
                                                    ? 'border-[#12B886] bg-[#E6F8F3] text-[#0B8F63]'
                                                    : 'border-[#E5484D] bg-[#FDE8E8] text-[#C4292E]';
                                            }

                                            return (
                                                <span key={i}>
                                                    {part}
                                                    {i < blankCount && (
                                                        <span
                                                            className={`inline-block mx-1 px-2.5 py-1 rounded-md border text-sm font-semibold ${blankStyle}`}
                                                        >
                                                            {studentValue || 'Bạn chưa trả lời'}
                                                        </span>
                                                    )}
                                                </span>
                                            );
                                        })}

                                        {isGraded && correctOption && (
                                            <p className="mt-2 text-xs font-semibold text-[#12B886]">
                                                Đáp án đúng: {correctOption.option_text}
                                            </p>
                                        )}
                                    </div>
                                );
                            })()}

                            {isGraded && q.teacher_feedback && (
                                <div className="text-sm text-[#565A70] bg-[#F7F8FB] border border-[#ECEAF0] rounded-lg p-3.5">
                                    <span className="font-bold text-[#161826]">Nhận xét của giảng viên: </span>
                                    {q.teacher_feedback}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* NÚT LÀM LẠI BÀI THI KHI XEM TRẠNG THÁI CŨ LÀ CHƯA ĐẠT */}
                {isGraded && !initialStatus.is_passed && (
                    <div className="pt-5 border-t border-[#ECEAF0] max-w-sm mx-auto">
                        {error && <p className="text-sm text-[#E5484D] font-medium mb-2">{error}</p>}
                        <StartQuizActions
                            isPeerReview={isPeerReview}
                            loading={loading}
                            canJoinPeerReview={canJoinPeerReview}
                            inProgressCountLoading={inProgressCountLoading}
                            inProgressCount={inProgressCount}
                            onStart={handleStartQuiz}
                            idleLabel="Làm lại bài thi"
                        />
                    </div>
                )}
            </div>
        );
    }

    // ---------------- MÀN HÌNH CHƯA LÀM BÀI (status = null) ----------------
    if (!quizData) {
        return (
            <div className="bg-white border border-[#ECEAF0] rounded-2xl p-10 space-y-5 max-w-xl mx-auto text-center">
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#FDF3DA] text-[#9A6B00] inline-block">
                    Bài kiểm tra đánh giá
                </span>
                <h3 className="font-display text-2xl font-bold text-[#161826]">Sẵn sàng làm bài kiểm tra</h3>
                {(error || statusError) && (
                    <p className="text-sm text-[#E5484D] font-medium">{error || statusError}</p>
                )}
                <StartQuizActions
                    isPeerReview={isPeerReview}
                    loading={loading}
                    canJoinPeerReview={canJoinPeerReview}
                    inProgressCountLoading={inProgressCountLoading}
                    inProgressCount={inProgressCount}
                    onStart={handleStartQuiz}
                    idleLabel="Bắt đầu làm bài"
                />
            </div>
        );
    }

    // ---------------- MÀN HÌNH ĐANG LÀM BÀI (mới bắt đầu hoặc IN_PROGRESS được khôi phục) ----------------
    return (
        <div className="bg-white border border-[#ECEAF0] rounded-2xl p-8 space-y-7">
            <div className="border-b border-[#ECEAF0] pb-5 flex justify-between items-center">
                <div>
                    <h3 className="font-display text-xl font-bold text-[#161826]">{quizData.title}</h3>
                    <span className="text-xs text-[#8A8FA3]">Lần thử: #{quizData.attempt_number}</span>
                </div>
                {submitting && <span className="text-sm text-[#5B5FEF] font-bold animate-pulse">Đang nộp bài...</span>}
            </div>

            <div className="space-y-7">
                {quizData.questions.map((q, idx) => (
                    <div key={q.detail_id} className="p-5 rounded-xl border border-[#F0F0F5] bg-[#FBFBFD] space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-[#161826]">
                                Câu {idx + 1}: {q.question_title}
                            </span>
                            {savingDetailId === q.detail_id && (
                                <span className="text-xs text-[#5B5FEF] font-semibold animate-pulse">Đang lưu...</span>
                            )}
                        </div>

                        {q.body_content && q.question_type !== QuestionType.FILL_IN_BLANK && (
                            <div className="text-sm text-[#565A70]" dangerouslySetInnerHTML={{ __html: q.body_content }} />
                        )}

                        {(q.question_type === QuestionType.MULTIPLE_CHOICE || q.question_type === QuestionType.TRUE_FALSE) && (
                            <div className="space-y-2.5 pt-1">
                                {q.options.map((opt) => {
                                    const isChecked = answers[q.detail_id]?.optionId === opt.option_id;
                                    return (
                                        <label
                                            key={opt.option_id}
                                            className={`flex items-center gap-3 p-3.5 rounded-lg border text-sm font-medium cursor-pointer transition-all ${isChecked
                                                ? 'border-[#5B5FEF] bg-[#EEF0FE] text-[#3F3FC9]'
                                                : 'border-[#ECEAF0] bg-white text-[#2B2D3D] hover:bg-[#FAFAFD]'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name={q.detail_id}
                                                value={opt.option_id}
                                                checked={isChecked}
                                                onChange={() => handleSelectOption(q.detail_id, opt.option_id)}
                                                className="accent-[#5B5FEF] w-4 h-4"
                                            />
                                            <span>{opt.option_text}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}

                        {q.question_type === QuestionType.ESSAY && (
                            <textarea
                                rows={4}
                                placeholder="Nhập câu trả lời của bạn vào đây..."
                                className="w-full text-sm p-3.5 bg-white border border-[#ECEAF0] rounded-xl focus:outline-none focus:border-[#5B5FEF]"
                                defaultValue={answers[q.detail_id]?.essayText || ''}
                                onBlur={(e) => handleEssayBlur(q.detail_id, e.target.value)}
                            />
                        )}

                        {q.question_type === QuestionType.FILL_IN_BLANK && (() => {
                            const parts = splitByBlank(getFillInBlankSourceText(q.question_title, q.body_content));
                            const blankCount = parts.length - 1;
                            const currentValues = (answers[q.detail_id]?.essayText ?? '').split(BLANK_ANSWER_DELIMITER);

                            return (
                                <div className="text-sm text-[#2B2D3D] leading-loose">
                                    {parts.map((part, i) => (
                                        <span key={i}>
                                            {part}
                                            {i < blankCount && (
                                                <input
                                                    type="text"
                                                    value={currentValues[i] ?? ''}
                                                    onChange={(e) => handleBlankChange(q.detail_id, i, e.target.value)}
                                                    onBlur={() => handleBlankBlur(q.detail_id)}
                                                    placeholder=""
                                                    className="inline-block w-40 mx-1 px-2 py-1 text-sm bg-white border border-b-2 border-[#ECEAF0] border-b-[#5B5FEF] rounded-md focus:outline-none focus:border-[#5B5FEF]"
                                                />
                                            )}
                                        </span>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                ))}
            </div>

            {error && <p className="text-sm text-[#E5484D] font-medium text-center">{error}</p>}

            <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-[#12B886] hover:bg-[#0EA275] text-white text-sm font-bold py-3.5 rounded-full transition-all disabled:opacity-50"
            >
                {submitting ? 'Đang gửi bài làm...' : 'Nộp bài thi'}
            </button>
        </div>
    );
}