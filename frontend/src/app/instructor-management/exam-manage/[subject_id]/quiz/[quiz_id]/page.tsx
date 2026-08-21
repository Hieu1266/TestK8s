"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { QuizDetail, Question, QuestionPool } from "@/types/exam-management";
import { getQuestionsBySubjectAction } from "@/actions/getQuestions";
import { getPoolsBySubjectAction } from "@/actions/getQuestionPools";
import {
  getQuizDetailAction,
  addFixedQuestionsAction,
  removeFixedQuestionAction,
  reorderFixedQuestionsAction,
  updateFixedQuestionTriggerAction,
  addPoolRuleAction,
  updatePoolRuleAction,
} from "@/actions/getQuizzes";

export default function QuizConfigPage({
  params,
}: {
  params: Promise<{ subject_id: string; quiz_id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { subject_id: subjectId, quiz_id: quizId } = resolvedParams;

  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State hỗ trợ Drag & Drop Native
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Dùng cho FIXED_QUESTION
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [videoTriggerSeconds, setVideoTriggerSeconds] = useState<number | "">(
    "",
  );
  const [triggerDrafts, setTriggerDrafts] = useState<
    Record<string, number | "">
  >({});

  // Dùng cho RANDOM_QUESTION
  const [subjectPools, setSubjectPools] = useState<QuestionPool[]>([]);
  const [addPoolId, setAddPoolId] = useState("");
  const [addPoolQuantity, setAddPoolQuantity] = useState(1);
  const [ruleQuantityDrafts, setRuleQuantityDrafts] = useState<
    Record<string, number>
  >({});

  const [busy, setBusy] = useState(false);

  // Tải dữ liệu ban đầu
  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const detail = await getQuizDetailAction(quizId);
      setQuiz(detail);

      if (detail?.quiz_type === "FIXED_QUESTION") {
        const questions = await getQuestionsBySubjectAction(subjectId);
        setBankQuestions(questions);
      } else if (detail?.quiz_type === "RANDOM_QUESTION") {
        const pools = await getPoolsBySubjectAction(subjectId);
        setSubjectPools(pools);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Không thể tải dữ liệu cấu hình đề thi.");
    } finally {
      setLoading(false);
    }
  }, [subjectId, quizId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (quiz?.pool_rules) {
      const drafts: Record<string, number> = {};
      quiz.pool_rules.forEach((r) => (drafts[r.rule_id] = r.quantity));
      setRuleQuantityDrafts(drafts);
    }
  }, [quiz?.pool_rules]);

  useEffect(() => {
    if (quiz?.fixed_questions) {
      const drafts: Record<string, number | ""> = {};
      quiz.fixed_questions.forEach((q) => {
        drafts[q.question_id] = q.video_trigger_seconds ?? "";
      });
      setTriggerDrafts(drafts);
    }
  }, [quiz?.fixed_questions]);

  // ============ FIXED_QUESTION handlers (Optimistic UI) ============
  const assignedQuestionIds = new Set(
    (quiz?.fixed_questions || []).map((q) => q.question_id),
  );
  const availableQuestions = bankQuestions.filter(
    (q) => !assignedQuestionIds.has(q.question_id),
  );

  const handleToggleAdd = (qId: string) => {
    setSelectedToAdd((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId],
    );
  };

  const handleAddSelectedQuestions = async () => {
    if (selectedToAdd.length === 0 || !quiz) return;
    setBusy(true);

    const triggerValue =
      quiz.placement_type === "IN_VIDEO" && videoTriggerSeconds !== ""
        ? Number(videoTriggerSeconds)
        : null;
    const result = await addFixedQuestionsAction(
      quizId,
      selectedToAdd,
      triggerValue,
    );
    setBusy(false);

    if (!result.success) {
      alert(result.error || "Thêm câu hỏi thất bại.");
      return;
    }

    // Tối ưu UI: Cập nhật state local ngay mà không gọi fetchData()
    const addedQuestions = bankQuestions.filter((q) =>
      selectedToAdd.includes(q.question_id),
    );
    const newFixedQuestions = [
      ...quiz.fixed_questions,
      ...addedQuestions.map((q, idx) => ({
        question_id: q.question_id,
        order_index: quiz.fixed_questions.length + idx + 1,
        video_trigger_seconds: triggerValue,
        question: q,
      })),
    ];

    setQuiz({ ...quiz, fixed_questions: newFixedQuestions });
    setSelectedToAdd([]);
    setVideoTriggerSeconds("");
  };

  const handleRemoveQuestion = async (questionId: string) => {
    if (!confirm("Xóa câu hỏi này khỏi đề thi?") || !quiz) return;

    // Optimistic Update
    const previousQuestions = quiz.fixed_questions;
    setQuiz({
      ...quiz,
      fixed_questions: quiz.fixed_questions.filter(
        (q) => q.question_id !== questionId,
      ),
    });

    setBusy(true);
    const result = await removeFixedQuestionAction(quizId, questionId);
    setBusy(false);

    if (!result.success) {
      alert(result.error || "Xóa câu hỏi thất bại.");
      setQuiz({ ...quiz, fixed_questions: previousQuestions }); // Rollback nếu lỗi
    }
  };

  // 🟢 KÉO THẢ (DRAG & DROP) HANDLERS
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Cho phép drop
  };

  const handleDrop = async (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex || !quiz) return;

    const list = [...quiz.fixed_questions].sort(
      (a, b) => a.order_index - b.order_index,
    );
    const [draggedItem] = list.splice(draggedIndex, 1);
    list.splice(targetIndex, 0, draggedItem);

    // Cập nhật lại order_index mới
    const reorderedList = list.map((q, idx) => ({
      ...q,
      order_index: idx + 1,
    }));

    // Optimistic Update local state
    setQuiz({ ...quiz, fixed_questions: reorderedList });
    setDraggedIndex(null);

    // Gửi thứ tự mới lên backend ngầm
    const orderedIds = reorderedList.map((q) => q.question_id);
    const result = await reorderFixedQuestionsAction(quizId, orderedIds);

    if (!result.success) {
      alert(result.error || "Sắp xếp thất bại trên máy chủ.");
      await fetchData(); // Rollback bằng cách fetch lại dữ liệu chuẩn
    }
  };

  const handleSaveTrigger = async (questionId: string) => {
    const value = triggerDrafts[questionId];
    if (value === "" || value === undefined || value < 0) {
      alert("Vui lòng nhập mốc giây hợp lệ (>= 0).");
      return;
    }
    setBusy(true);
    const result = await updateFixedQuestionTriggerAction(
      quizId,
      questionId,
      Number(value),
    );
    setBusy(false);

    if (!result.success) {
      alert(result.error || "Cập nhật thời gian thất bại.");
      return;
    }

    // Cập nhật local state
    if (quiz) {
      setQuiz({
        ...quiz,
        fixed_questions: quiz.fixed_questions.map((q) =>
          q.question_id === questionId
            ? { ...q, video_trigger_seconds: Number(value) }
            : q,
        ),
      });
    }
  };

  // ============ RANDOM_QUESTION handlers ============
  const assignedPoolIds = new Set(
    (quiz?.pool_rules || []).map((r) => r.pool_id),
  );
  const availablePools = subjectPools.filter(
    (p) => !assignedPoolIds.has(p.pool_id),
  );

  const handleAddPoolRule = async () => {
    if (!addPoolId) return;
    const pool = subjectPools.find((p) => p.pool_id === addPoolId);
    if (pool && addPoolQuantity > pool.total_questions) {
      alert(
        `Pool "${pool.title}" chỉ có ${pool.total_questions} câu hỏi, không đủ để bốc ${addPoolQuantity} câu.`,
      );
      return;
    }
    setBusy(true);
    const result = await addPoolRuleAction(quizId, addPoolId, addPoolQuantity);
    setBusy(false);

    if (!result.success) {
      alert(result.error || "Thêm luật pool thất bại.");
      return;
    }
    setAddPoolId("");
    setAddPoolQuantity(1);
    await fetchData();
  };

  const handleUpdateRuleQuantity = async (
    ruleId: string,
    poolTotal: number,
  ) => {
    const newQuantity = ruleQuantityDrafts[ruleId];
    if (!newQuantity || newQuantity < 1) return;
    if (newQuantity > poolTotal) {
      alert(
        `Pool này chỉ có ${poolTotal} câu hỏi, không đủ để bốc ${newQuantity} câu.`,
      );
      return;
    }
    setBusy(true);
    const result = await updatePoolRuleAction(quizId, ruleId, newQuantity);
    setBusy(false);

    if (!result.success) {
      alert(result.error || "Cập nhật số lượng thất bại.");
      return;
    }

    if (quiz) {
      setQuiz({
        ...quiz,
        pool_rules: quiz.pool_rules.map((r) =>
          r.rule_id === ruleId ? { ...r, quantity: newQuantity } : r,
        ),
      });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm("Xóa luật cấu hình pool này khỏi đề thi?") || !quiz) return;

    const previousRules = quiz.pool_rules;
    setQuiz({
      ...quiz,
      pool_rules: quiz.pool_rules.filter((r) => r.rule_id !== ruleId),
    });

    setBusy(true);
    const result = await deletePoolRuleAction(quizId, ruleId);
    setBusy(false);

    if (!result.success) {
      alert(result.error || "Xóa luật pool thất bại.");
      setQuiz({ ...quiz, pool_rules: previousRules });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-500 text-base">
        Đang tải dữ liệu cấu hình đề thi...
      </div>
    );
  }

  if (errorMessage || !quiz) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center max-w-md">
          <p className="text-base text-rose-600">
            {errorMessage || "Không tìm thấy đề thi."}
          </p>
          <button
            onClick={() =>
              router.push(`/instructor-management/exam-manage/${subjectId}`)
            }
            className="mt-4 text-sm font-bold text-blue-600 hover:underline"
          >
            Quay lại danh sách đề thi
          </button>
        </div>
      </div>
    );
  }

  const sortedFixedQuestions = [...quiz.fixed_questions].sort(
    (a, b) => a.order_index - b.order_index,
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <Navbar />

      <section className="bg-slate-900 text-white py-6 px-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() =>
              router.push(`/instructor-management/exam-manage/${subjectId}`)
            }
            className="text-sm text-slate-400 hover:text-white transition mb-3 font-bold"
          >
            ← Quay lại Danh sách Đề thi
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs px-2.5 py-1 rounded font-bold ${
                quiz.quiz_type === "FIXED_QUESTION"
                  ? "bg-blue-600"
                  : "bg-purple-600"
              }`}
            >
              {quiz.quiz_type === "FIXED_QUESTION"
                ? "Đề Cố Định"
                : "Đề Ngẫu Nhiên"}
            </span>
          </div>
          <h1 className="text-3xl font-bold">{quiz.title}</h1>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {quiz.quiz_type === "FIXED_QUESTION" ? (
          <>
            {/* Danh sách câu hỏi đã gán (Hỗ trợ Kéo & Thả Native) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold">
                    Danh sách Câu hỏi trong Đề ({sortedFixedQuestions.length})
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    💡 Giữ biểu tượng <span className="font-bold">⋮⋮</span> để
                    kéo và thả câu hỏi để thay đổi thứ tự.
                  </p>
                </div>
                <p className="text-sm text-slate-500">
                  Tổng điểm:{" "}
                  <span className="font-bold text-[#0066FF]">
                    {sortedFixedQuestions
                      .reduce((sum, q) => sum + (q.question.max_points || 0), 0)
                      .toFixed(1)}{" "}
                    pts
                  </span>
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {sortedFixedQuestions.length === 0 ? (
                  <p className="p-6 text-center text-base text-slate-400">
                    Chưa có câu hỏi nào trong đề thi.
                  </p>
                ) : (
                  sortedFixedQuestions.map((q, idx) => (
                    <div
                      key={q.question_id}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(idx)}
                      className={`p-5 flex items-start justify-between gap-4 transition cursor-default ${
                        draggedIndex === idx
                          ? "opacity-30 bg-blue-50 border-2 border-dashed border-blue-400"
                          : "hover:bg-slate-50/80"
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Tay nắm Kéo thả */}
                        <div
                          title="Kéo để di chuyển"
                          className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600 flex items-center justify-center select-none"
                        >
                          <span className="text-xl leading-none">⋮⋮</span>
                        </div>

                        <span className="w-8 h-8 shrink-0 bg-slate-100 text-slate-600 font-bold rounded-lg text-sm flex items-center justify-center">
                          {idx + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          {/* 🟢 FIXED: Hiển thị định dạng HTML cho tiêu đề & nội dung câu hỏi */}
                          <div
                            className="text-base font-bold text-slate-900 prose prose-slate max-w-none"
                            dangerouslySetInnerHTML={{
                              __html: q.question.question_title,
                            }}
                          />

                          {q.question.body_content && (
                            <div
                              className="text-sm text-slate-600 mt-1 leading-relaxed prose prose-slate max-w-none"
                              dangerouslySetInnerHTML={{
                                __html: q.question.body_content,
                              }}
                            />
                          )}

                          <span className="text-xs text-slate-400 mt-2 block font-medium">
                            {q.question.question_type} · {q.question.max_points}{" "}
                            điểm
                          </span>

                          {quiz.placement_type === "IN_VIDEO" && (
                            <div className="flex items-center gap-2 mt-3 bg-slate-50 p-2 rounded-xl border border-slate-200 w-fit">
                              <label className="text-xs font-semibold text-slate-700">
                                Mốc giây kích hoạt video:
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={triggerDrafts[q.question_id] ?? ""}
                                onChange={(e) =>
                                  setTriggerDrafts((prev) => ({
                                    ...prev,
                                    [q.question_id]:
                                      e.target.value === ""
                                        ? ""
                                        : Number(e.target.value),
                                  }))
                                }
                                className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-xs outline-none bg-white"
                              />
                              <button
                                disabled={busy}
                                onClick={() => handleSaveTrigger(q.question_id)}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition"
                              >
                                Lưu
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          disabled={busy}
                          onClick={() => handleRemoveQuestion(q.question_id)}
                          className="px-3 py-1.5 text-xs font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Chọn thêm câu hỏi từ Ngân hàng câu hỏi */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <h2 className="text-lg font-bold">
                Thêm câu hỏi từ Ngân hàng câu hỏi
              </h2>

              {quiz.placement_type === "IN_VIDEO" && (
                <div className="max-w-xs">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Mốc giây kích hoạt trong video (cho các câu chọn lần này)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={videoTriggerSeconds}
                    onChange={(e) =>
                      setVideoTriggerSeconds(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none"
                    placeholder="Vd: 120"
                  />
                </div>
              )}

              <div className="max-h-[32rem] overflow-y-auto space-y-2 pr-1">
                {availableQuestions.length === 0 ? (
                  <p className="text-base text-slate-400 text-center py-6">
                    Không còn câu hỏi nào khác trong Ngân hàng câu hỏi để thêm.
                  </p>
                ) : (
                  availableQuestions.map((q) => {
                    const checked = selectedToAdd.includes(q.question_id);
                    return (
                      <div
                        key={q.question_id}
                        onClick={() => handleToggleAdd(q.question_id)}
                        className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition ${
                          checked
                            ? "bg-blue-50/60 border-[#0066FF]"
                            : "bg-white border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}}
                          className="mt-1.5 h-4 w-4"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between gap-3">
                            {/* 🟢 FIXED: Hiển thị định dạng HTML ở ngân hàng câu hỏi */}
                            <div
                              className="text-base font-bold text-slate-800 prose prose-slate max-w-none"
                              dangerouslySetInnerHTML={{
                                __html: q.question_title,
                              }}
                            />
                            <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded shrink-0 h-fit">
                              {q.question_type}
                            </span>
                          </div>
                          {q.body_content && (
                            <div
                              className="text-sm text-slate-600 mt-1 leading-relaxed prose prose-slate max-w-none"
                              dangerouslySetInnerHTML={{
                                __html: q.body_content,
                              }}
                            />
                          )}
                          <span className="text-xs text-emerald-600 font-semibold mt-1 block">
                            {q.max_points} điểm
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <span className="text-sm font-semibold text-slate-600">
                  Đã chọn: {selectedToAdd.length}
                </span>
                <button
                  onClick={handleAddSelectedQuestions}
                  disabled={busy || selectedToAdd.length === 0}
                  className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 text-sm font-bold rounded-xl transition disabled:opacity-50"
                >
                  Thêm vào đề thi
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Danh sách luật pool đã gán */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="p-5 border-b border-slate-100">
                <h2 className="text-lg font-bold">
                  Quy tắc sinh đề Ngẫu nhiên ({quiz.pool_rules.length})
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Tổng câu hỏi sẽ bốc:{" "}
                  {quiz.pool_rules.reduce((sum, r) => sum + r.quantity, 0)} câu
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                {quiz.pool_rules.length === 0 ? (
                  <p className="p-6 text-center text-base text-slate-400">
                    Chưa có pool nào được gán cho đề thi này.
                  </p>
                ) : (
                  quiz.pool_rules.map((rule) => (
                    <div
                      key={rule.rule_id}
                      className="p-5 flex items-center justify-between gap-4"
                    >
                      <div>
                        <h4 className="text-base font-bold">
                          {rule.pool_title}
                        </h4>
                        <span className="text-sm text-slate-400">
                          Pool có {rule.pool_total_questions} câu hỏi
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={rule.pool_total_questions}
                          value={
                            ruleQuantityDrafts[rule.rule_id] ?? rule.quantity
                          }
                          onChange={(e) =>
                            setRuleQuantityDrafts((prev) => ({
                              ...prev,
                              [rule.rule_id]: Number(e.target.value),
                            }))
                          }
                          className="w-24 px-2.5 py-2 border border-slate-300 rounded-lg text-base outline-none"
                        />
                        <button
                          disabled={busy}
                          onClick={() =>
                            handleUpdateRuleQuantity(
                              rule.rule_id,
                              rule.pool_total_questions,
                            )
                          }
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-sm font-bold rounded-lg transition"
                        >
                          Lưu
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => handleDeleteRule(rule.rule_id)}
                          className="px-3.5 py-2 text-sm font-semibold text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Gán thêm 1 pool mới */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <h2 className="text-lg font-bold">
                Gán thêm Kho câu hỏi (Pool) vào đề thi
              </h2>

              {availablePools.length === 0 ? (
                <p className="text-base text-slate-400">
                  Không còn pool nào khác của môn học để gán thêm (hoặc chưa có
                  pool nào — tạo ở tab "Kho câu hỏi").
                </p>
              ) : (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[240px]">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Chọn Pool
                    </label>
                    <select
                      value={addPoolId}
                      onChange={(e) => setAddPoolId(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-base outline-none bg-white"
                    >
                      <option value="">-- Chọn pool --</option>
                      {availablePools.map((p) => (
                        <option key={p.pool_id} value={p.pool_id}>
                          {p.title} ({p.total_questions} câu hỏi)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-36">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Số lượng bốc
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={addPoolQuantity}
                      onChange={(e) =>
                        setAddPoolQuantity(Number(e.target.value) || 1)
                      }
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-base outline-none"
                    />
                  </div>
                  <button
                    onClick={handleAddPoolRule}
                    disabled={busy || !addPoolId}
                    className="px-5 py-2.5 bg-purple-600 text-white hover:bg-purple-700 text-sm font-bold rounded-xl transition disabled:opacity-50"
                  >
                    Gán vào đề thi
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
