'use client';

import { useEffect, useState } from 'react';
import {
    getMyPeerReviewAssignmentsAction,
    getPeerReviewAssignmentDetailAction,
    submitPeerReviewEvaluationAction,
} from '@/actions/getPeerReview';
import {
    MyAssignment,
    AssignmentDetail,
    ReviewStatus,
    EvaluationItemPayload,
} from '@/types/peer-review';

type ScoreDraft = { score: string; feedback: string };

function round2(value: number): number {
    return Math.round(value * 100) / 100;
}

export default function PeerReviewSection({
    quizId,
    onReviewSubmitted,
}: {
    quizId: string;
    /** Gọi sau khi nộp 1 lượt chấm chéo. `isAllAssignmentsCompleted` = true khi đây là
     *  lượt cuối cùng còn PENDING (không còn bài nào chờ chấm) — dùng để phân biệt với
     *  các lượt chấm giữa chừng, tránh cha component cập nhật tiến độ quá sớm. */
    onReviewSubmitted?: (isAllAssignmentsCompleted: boolean) => void;
}) {
    const [assignments, setAssignments] = useState<MyAssignment[] | null>(null);
    const [listLoading, setListLoading] = useState(true);
    const [listError, setListError] = useState<string | null>(null);

    const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);

    // 🎯 Trả về danh sách vừa tải để nơi gọi (onCompleted) có thể kiểm tra ngay
    // còn PENDING hay không, thay vì đọc state `assignments` có thể chưa kịp cập nhật.
    async function loadAssignments(): Promise<MyAssignment[] | null> {
        setListLoading(true);
        setListError(null);
        const res = await getMyPeerReviewAssignmentsAction(quizId);
        let fetched: MyAssignment[] | null = null;
        if (res.success) {
            fetched = res.data ?? [];
            setAssignments(fetched);
        } else {
            setListError(res.error || 'Không thể tải danh sách bài chấm chéo.');
        }
        setListLoading(false);
        return fetched;
    }

    useEffect(() => {
        if (quizId) loadAssignments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quizId]);

    if (activeAssignmentId) {
        return (
            <AssignmentGrading
                assignmentId={activeAssignmentId}
                onBack={() => setActiveAssignmentId(null)}
                onCompleted={async () => {
                    setActiveAssignmentId(null);
                    // Chờ tải lại xong rồi mới kiểm tra, tránh đọc state `assignments` cũ
                    // (setState không đồng bộ) — đây là nguyên nhân khiến trước đây coi
                    // MỌI lượt nộp là "lượt cuối".
                    const updated = await loadAssignments();
                    const stillHasPending = (updated ?? []).some(
                        (a) => a.status === ReviewStatus.PENDING
                    );
                    onReviewSubmitted?.(!stillHasPending);
                }}
            />
        );
    }

    if (listLoading) {
        return (
            <div className="bg-white border border-[#ECEAF0] rounded-2xl p-8 text-center">
                <div className="w-6 h-6 mx-auto rounded-full border-2 border-[#E7E9F0] border-t-[#5B5FEF] animate-spin" />
                <p className="text-sm text-[#8A8FA3] mt-3">Đang tải danh sách bài chấm chéo...</p>
            </div>
        );
    }

    if (listError) {
        return (
            <div className="bg-white border border-[#ECEAF0] rounded-2xl p-8 text-center">
                <p className="text-sm text-[#E5484D] font-medium">{listError}</p>
            </div>
        );
    }

    if (!assignments || assignments.length === 0) {
        return (
            <div className="bg-white border border-[#ECEAF0] rounded-2xl p-8 text-center space-y-2">
                <h3 className="font-display text-lg font-bold text-[#161826]">Chưa có bài nào được giao</h3>
                <p className="text-sm text-[#8A8FA3]">
                    Bài sẽ được tự động phân công khi đủ tối thiểu 3 học viên tham gia chấm chéo cho đề thi này.
                </p>
            </div>
        );
    }

    const pending = assignments.filter((a) => a.status === ReviewStatus.PENDING);
    const completed = assignments.filter((a) => a.status === ReviewStatus.COMPLETED);

    return (
        <div className="bg-white border border-[#ECEAF0] rounded-2xl p-8 space-y-6">
            <h3 className="font-display text-xl font-bold text-[#161826]">Bài chấm chéo được giao</h3>

            {pending.length > 0 && (
                <div className="space-y-3">
                    <span className="text-xs font-bold text-[#9A6B00] uppercase tracking-wide">
                        Cần chấm ({pending.length})
                    </span>
                    {pending.map((a) => (
                        <button
                            key={a.assignment_id}
                            onClick={() => setActiveAssignmentId(a.assignment_id)}
                            className="w-full text-left p-4 rounded-xl border border-[#ECEAF0] hover:border-[#5B5FEF] hover:bg-[#F7F8FB] transition-colors flex items-center justify-between"
                        >
                            <span className="text-sm font-semibold text-[#2B2D3D]">
                                Bài nộp #{a.submission_id.slice(0, 8)}
                            </span>
                            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
                                Chờ chấm
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {completed.length > 0 && (
                <div className="space-y-3">
                    <span className="text-xs font-bold text-[#8A8FA3] uppercase tracking-wide">
                        Đã chấm ({completed.length})
                    </span>
                    {completed.map((a) => (
                        <div
                            key={a.assignment_id}
                            className="w-full p-4 rounded-xl border border-[#F0F0F5] bg-[#FBFBFD] flex items-center justify-between"
                        >
                            <span className="text-sm font-semibold text-[#565A70]">
                                Bài nộp #{a.submission_id.slice(0, 8)}
                            </span>
                            <span className="text-xs font-bold text-[#12B886]">
                                Đã cho {a.final_score_given} điểm
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function AssignmentGrading({
    assignmentId,
    onBack,
    onCompleted,
}: {
    assignmentId: string;
    onBack: () => void;
    onCompleted: () => void;
}) {
    const [detail, setDetail] = useState<AssignmentDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [scores, setScores] = useState<Record<string, ScoreDraft>>({});
    const [generalComment, setGeneralComment] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            const res = await getPeerReviewAssignmentDetailAction(assignmentId);
            if (cancelled) return;

            if (res.success && res.data) {
                setDetail(res.data);
                const initial: Record<string, ScoreDraft> = {};
                res.data.answers.forEach((answer) => {
                    answer.rubric_criterias.forEach((criteria) => {
                        initial[criteria.criteria_id] = { score: '', feedback: '' };
                    });
                });
                setScores(initial);
            } else {
                setError(res.error || 'Không thể tải chi tiết bài cần chấm.');
            }
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [assignmentId]);

    const handleSubmit = async () => {
        if (!detail) return;

        const criteriaMaxMap: Record<string, number> = {};
        detail.answers.forEach((answer) => {
            answer.rubric_criterias.forEach((criteria) => {
                criteriaMaxMap[criteria.criteria_id] = round2((answer.max_points || 0) * (criteria.percentage / 100));
            });
        });

        const evaluations: EvaluationItemPayload[] = [];
        for (const [criteriaId, draft] of Object.entries(scores)) {
            if (draft.score.trim() === '') {
                setError('Vui lòng chấm điểm đầy đủ tất cả các tiêu chí trước khi nộp.');
                return;
            }
            const scoreValue = Number(draft.score);
            const maxForCriteria = criteriaMaxMap[criteriaId] ?? Infinity;
            if (Number.isNaN(scoreValue) || scoreValue < 0 || scoreValue > maxForCriteria) {
                setError(`Điểm cho một tiêu chí không hợp lệ (0 - ${maxForCriteria}).`);
                return;
            }
            evaluations.push({
                criteria_id: criteriaId,
                score: scoreValue,
                feedback: draft.feedback || undefined,
            });
        }

        setSubmitting(true);
        setError(null);
        const res = await submitPeerReviewEvaluationAction(assignmentId, {
            evaluations,
            general_comment: generalComment || undefined,
        });
        setSubmitting(false);

        if (res.success) {
            onCompleted();
        } else {
            setError(res.error || 'Nộp kết quả chấm chéo thất bại.');
        }
    };

    if (loading) {
        return (
            <div className="bg-white border border-[#ECEAF0] rounded-2xl p-8 text-center">
                <div className="w-6 h-6 mx-auto rounded-full border-2 border-[#E7E9F0] border-t-[#5B5FEF] animate-spin" />
                <p className="text-sm text-[#8A8FA3] mt-3">Đang tải bài làm cần chấm...</p>
            </div>
        );
    }

    if (error && !detail) {
        return (
            <div className="bg-white border border-[#ECEAF0] rounded-2xl p-8 text-center space-y-4">
                <p className="text-sm text-[#E5484D] font-medium">{error}</p>
                <button onClick={onBack} className="text-sm font-bold text-[#5B5FEF]">
                    &larr; Quay lại danh sách
                </button>
            </div>
        );
    }

    if (!detail) return null;

    return (
        <div className="bg-white border border-[#ECEAF0] rounded-2xl p-8 space-y-7">
            <div className="border-b border-[#ECEAF0] pb-5 flex items-center justify-between">
                <div>
                    <button onClick={onBack} className="text-xs font-bold text-[#5B5FEF] mb-1">
                        &larr; Quay lại danh sách
                    </button>
                    <h3 className="font-display text-xl font-bold text-[#161826]">{detail.quiz_title}</h3>
                </div>
            </div>

            <div className="space-y-7">
                {detail.answers.map((answer, idx) => (
                    <div key={answer.question_id} className="p-5 rounded-xl border border-[#F0F0F5] bg-[#FBFBFD] space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-[#161826]">
                                Câu {idx + 1}: {answer.question_title}
                            </span>
                            <span className="text-xs text-[#8A8FA3]">Tối đa {answer.max_points} điểm</span>
                        </div>

                        {answer.body_content && (
                            <div className="text-sm text-[#565A70]" dangerouslySetInnerHTML={{ __html: answer.body_content }} />
                        )}

                        <div className="w-full text-sm p-3.5 bg-white border border-[#ECEAF0] rounded-xl text-[#2B2D3D] whitespace-pre-wrap">
                            {answer.essay_answer_text || 'Học viên chưa trả lời câu này.'}
                        </div>

                        {answer.graph_image_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={answer.graph_image_url} alt="Đồ thị bài làm" className="rounded-lg border border-[#ECEAF0]" />
                        )}

                        <div className="space-y-3 pt-2">
                            {answer.rubric_criterias.map((criteria) => {
                                const criteriaMaxScore = round2((answer.max_points || 0) * (criteria.percentage / 100));
                                return (
                                    <div key={criteria.criteria_id} className="p-4 rounded-lg border border-[#ECEAF0] space-y-2.5">
                                        <div className="flex justify-between items-start gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-[#2B2D3D]">{criteria.title}</p>
                                                {criteria.description && (
                                                    <p className="text-xs text-[#8A8FA3] mt-0.5">{criteria.description}</p>
                                                )}
                                            </div>
                                            <span className="text-xs font-bold text-[#5B5FEF] shrink-0">
                                                {criteria.percentage}%
                                            </span>
                                        </div>

                                        <input
                                            type="number"
                                            min={0}
                                            max={criteriaMaxScore}
                                            step="0.1"
                                            placeholder={`Điểm cho tiêu chí này (tối đa ${criteriaMaxScore})`}
                                            value={scores[criteria.criteria_id]?.score ?? ''}
                                            onChange={(e) => {
                                                let raw = e.target.value;
                                                if (raw !== '') {
                                                    const num = Number(raw);
                                                    if (!Number.isNaN(num)) {
                                                        if (num > criteriaMaxScore) raw = String(criteriaMaxScore);
                                                        if (num < 0) raw = '0';
                                                    }
                                                }
                                                setScores((prev) => ({
                                                    ...prev,
                                                    [criteria.criteria_id]: {
                                                        ...prev[criteria.criteria_id],
                                                        score: raw,
                                                    },
                                                }));
                                            }}
                                            className="w-full text-sm p-2.5 border border-[#ECEAF0] rounded-lg focus:outline-none focus:border-[#5B5FEF]"
                                        />
                                        <p className="text-xs text-[#8A8FA3]">
                                            Tối đa {criteriaMaxScore} điểm (= {answer.max_points} điểm câu hỏi × {criteria.percentage}%).
                                        </p>

                                        <textarea
                                            rows={2}
                                            placeholder="Nhận xét cho tiêu chí này (không bắt buộc)"
                                            value={scores[criteria.criteria_id]?.feedback ?? ''}
                                            onChange={(e) =>
                                                setScores((prev) => ({
                                                    ...prev,
                                                    [criteria.criteria_id]: {
                                                        ...prev[criteria.criteria_id],
                                                        feedback: e.target.value,
                                                    },
                                                }))
                                            }
                                            className="w-full text-sm p-2.5 border border-[#ECEAF0] rounded-lg focus:outline-none focus:border-[#5B5FEF]"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="space-y-2">
                <label className="text-sm font-bold text-[#161826]">Nhận xét tổng quan (không bắt buộc)</label>
                <textarea
                    rows={3}
                    placeholder="Nhận xét chung về bài làm..."
                    value={generalComment}
                    onChange={(e) => setGeneralComment(e.target.value)}
                    className="w-full text-sm p-3.5 border border-[#ECEAF0] rounded-xl focus:outline-none focus:border-[#5B5FEF]"
                />
            </div>

            {error && <p className="text-sm text-[#E5484D] font-medium text-center">{error}</p>}

            <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-[#12B886] hover:bg-[#0EA275] text-white text-sm font-bold py-3.5 rounded-full transition-all disabled:opacity-50"
            >
                {submitting ? 'Đang nộp kết quả chấm...' : 'Nộp kết quả chấm bài'}
            </button>
        </div>
    );
}