"use client";

import { useState, useEffect, useCallback } from "react";
import { Question, QuestionPool } from "@/types/exam-management";
import { getQuestionsBySubjectAction } from "@/actions/getQuestions";
import {
  getPoolsBySubjectAction,
  createPoolAction,
  deletePoolAction,
  setPoolQuestionsAction,
} from "@/actions/getQuestionPools";

interface Props {
  subjectId: string;
}

export default function QuestionPoolManager({ subjectId }: Props) {
  const [subjectQuestions, setSubjectQuestions] = useState<Question[]>([]);
  const [pools, setPools] = useState<QuestionPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedPool, setSelectedPool] = useState<QuestionPool | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newPoolTitle, setNewPoolTitle] = useState("");
  const [newPoolDesc, setNewPoolDesc] = useState("");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [questionsData, poolsData] = await Promise.all([
        getQuestionsBySubjectAction(subjectId),
        getPoolsBySubjectAction(subjectId),
      ]);
      setSubjectQuestions(questionsData);
      setPools(poolsData);
    } catch (err: any) {
      setErrorMessage(err.message || "Không thể tải dữ liệu ngân hàng câu hỏi / kho câu hỏi.");
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoolTitle.trim()) return;
    setSubmitting(true);
    const result = await createPoolAction({
      subject_id: subjectId,
      title: newPoolTitle.trim(),
      description: newPoolDesc,
    });
    setSubmitting(false);

    if (!result.success) {
      alert(result.error || "Tạo pool thất bại.");
      return;
    }

    setNewPoolTitle("");
    setNewPoolDesc("");
    setIsCreateModalOpen(false);
    await fetchAll();
  };

  const handleDeletePool = async (pool: QuestionPool) => {
    if (!confirm(`Xóa kho câu hỏi "${pool.title}"? Các đề thi Random đang dùng pool này có thể bị ảnh hưởng.`)) return;
    const result = await deletePoolAction(pool.pool_id);
    if (!result.success) {
      alert(result.error || "Xóa pool thất bại.");
      return;
    }
    setPools((prev) => prev.filter((p) => p.pool_id !== pool.pool_id));
  };

  const handleOpenAssignModal = (pool: QuestionPool) => {
    setSelectedPool(pool);
    setSelectedQuestionIds(pool.question_ids || []);
    setIsAssignModalOpen(true);
  };

  const handleToggleQuestion = (qId: string) => {
    setSelectedQuestionIds((prev) => (prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]));
  };

  const handleSaveAssignedQuestions = async () => {
    if (!selectedPool) return;
    setSubmitting(true);
    const result = await setPoolQuestionsAction(selectedPool.pool_id, selectedQuestionIds);
    setSubmitting(false);

    if (!result.success) {
      alert(result.error || "Cập nhật câu hỏi trong pool thất bại.");
      return;
    }

    setPools((prev) =>
      prev.map((p) =>
        p.pool_id === selectedPool.pool_id
          ? { ...p, question_ids: selectedQuestionIds, total_questions: selectedQuestionIds.length }
          : p
      )
    );
    setIsAssignModalOpen(false);
  };

  if (loading) {
    return <div className="py-12 text-center text-slate-400 text-sm">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Quản lý Kho câu hỏi (Question Pools)</h2>
          <p className="text-xs text-slate-500 mt-1">
            Gom nhóm các câu hỏi từ Ngân hàng câu hỏi của Subject để phục vụ rút đề ngẫu nhiên (Random Quiz Rules).
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2.5 bg-[#0066FF] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm shrink-0"
        >
          ➕ Tạo Pool Mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pools.map((pool) => (
          <div
            key={pool.pool_id}
            className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:border-blue-300 transition shadow-sm"
          >
            <div>
              <div className="flex justify-between items-start gap-2 mb-2">
                <h3 className="text-base font-bold text-slate-800">{pool.title}</h3>
                <span className="text-[11px] font-mono bg-blue-50 text-[#0066FF] font-bold px-2 py-0.5 rounded-md border border-blue-100 shrink-0">
                  {pool.total_questions} câu hỏi
                </span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                {pool.description || "Chưa có mô tả cho kho câu hỏi này."}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
              <span className="text-[10px] text-slate-400 font-mono">ID: {pool.pool_id}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenAssignModal(pool)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-[#0066FF] hover:text-white text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  ⚙️ Thêm / Bớt câu hỏi
                </button>
                <button
                  onClick={() => handleDeletePool(pool)}
                  className="px-3 py-2 bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}

        {pools.length === 0 && (
          <p className="text-sm text-slate-400 col-span-2 text-center py-8">
            Chưa có kho câu hỏi nào. Nhấn "Tạo Pool Mới" để bắt đầu.
          </p>
        )}
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Tạo Question Pool Mới</h3>
            <form onSubmit={handleCreatePool} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên Pool *</label>
                <input
                  type="text"
                  required
                  placeholder="Vd: Ngân hàng câu hỏi Chương 1 - Dễ"
                  value={newPoolTitle}
                  onChange={(e) => setNewPoolTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0066FF] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả kho câu hỏi</label>
                <textarea
                  rows={3}
                  placeholder="Ghi chú về mức độ khó, phạm vi kiến thức..."
                  value={newPoolDesc}
                  onChange={(e) => setNewPoolDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0066FF] outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#0066FF] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  {submitting ? "Đang tạo..." : "Xác nhận Tạo Pool"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAssignModalOpen && selectedPool && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="pb-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">
                Chọn câu hỏi cho Pool: <span className="text-[#0066FF]">{selectedPool.title}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Tích chọn các câu hỏi thuộc Ngân hàng câu hỏi Subject để gán vào Pool này.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {subjectQuestions.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  Chưa có câu hỏi nào trong Ngân hàng câu hỏi của Subject này.
                </p>
              ) : (
                subjectQuestions.map((q) => {
                  const isChecked = selectedQuestionIds.includes(q.question_id);
                  return (
                    <label
                      key={q.question_id}
                      onClick={() => handleToggleQuestion(q.question_id)}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${isChecked ? "bg-blue-50/60 border-[#0066FF]" : "bg-white border-slate-200 hover:bg-slate-50"
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => { }}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0066FF] focus:ring-[#0066FF]"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{q.question_title}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                            {q.question_type}
                          </span>
                        </div>
                        {q.body_content && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1">{q.body_content}</p>
                        )}
                        <span className="text-[11px] font-semibold text-emerald-600 mt-1 block">
                          Điểm tối đa: {q.max_points}đ
                        </span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-600">
                Đã chọn: <strong className="text-[#0066FF]">{selectedQuestionIds.length}</strong> /{" "}
                {subjectQuestions.length} câu hỏi
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveAssignedQuestions}
                  disabled={submitting}
                  className="px-5 py-2 bg-[#0066FF] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
                >
                  {submitting ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}