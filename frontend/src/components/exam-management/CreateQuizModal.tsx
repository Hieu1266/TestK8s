"use client";

import { useState } from "react";
import {
  Question,
  QuestionPool,
  QuizType,
  QuizPlacementType,
} from "@/types/exam-management";

interface Props {
  subjectId: string;
  isOpen: boolean;
  onClose: () => void;
  // Dữ liệu ngân hàng câu hỏi & pools có sẵn của Subject
  subjectQuestions: Question[];
  subjectPools: QuestionPool[];
  onSuccess: (newQuizData: any) => void;
}

export default function CreateQuizModal({
  subjectId,
  isOpen,
  onClose,
  subjectQuestions,
  subjectPools,
  onSuccess,
}: Props) {
  // --- Form States Cơ Bản ---
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [passingScore, setPassingScore] = useState(5.0);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [quizType, setQuizType] = useState<QuizType>("FIXED_QUESTION");
  const [placementType, setPlacementType] =
    useState<QuizPlacementType>("STANDALONE_LESSON");
  const [isActive, setIsActive] = useState(true);
  const [isPeerReview, setIsPeerReview] = useState(false);

  // --- State Chế độ 1: Cố định (FIXED_QUESTION) ---
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  // --- State Chế độ 2: Ngẫu nhiên (RANDOM_QUESTION) ---
  // Mặc định lưu danh sách các Rule dạng { pool_id, quantity }
  const [poolRules, setPoolRules] = useState<
    { pool_id: string; quantity: number }[]
  >([]);

  if (!isOpen) return null;

  // Toggle chọn câu hỏi cho đề cố định
  const handleToggleFixedQuestion = (qId: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId],
    );
  };

  // Cập nhật số lượng câu hỏi cần bốc cho một Question Pool
  const handlePoolQuantityChange = (poolId: string, quantity: number) => {
    setPoolRules((prevRules) => {
      const existing = prevRules.find((r) => r.pool_id === poolId);
      if (quantity <= 0) {
        // Nếu số lượng <= 0 thì loại bỏ pool này khỏi danh sách rule
        return prevRules.filter((r) => r.pool_id !== poolId);
      }
      if (existing) {
        return prevRules.map((r) =>
          r.pool_id === poolId ? { ...r, quantity } : r,
        );
      }
      return [...prevRules, { pool_id: poolId, quantity }];
    });
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation căn bản
    if (quizType === "FIXED_QUESTION" && selectedQuestionIds.length === 0) {
      alert("Vui lòng chọn ít nhất 1 câu hỏi cho bài thi cố định!");
      return;
    }
    if (quizType === "RANDOM_QUESTION" && poolRules.length === 0) {
      alert("Vui lòng cấu hình ít nhất 1 Rule bốc câu hỏi từ Question Pool!");
      return;
    }

    const payload = {
      subject_id: subjectId,
      title,
      description,
      duration_minutes: durationMinutes,
      passing_score: passingScore,
      max_attempts: maxAttempts,
      quiz_type: quizType,
      placement_type: placementType,
      is_active: isActive,
      is_peer_review: isPeerReview,
      // Đẩy đúng trường dữ liệu theo chế độ đã chọn
      quiz_questions: quizType === "FIXED_QUESTION" ? selectedQuestionIds : [],
      pool_rules: quizType === "RANDOM_QUESTION" ? poolRules : [],
    };

    onSuccess(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-slate-200 my-8">
        {/* Header Modal */}
        <div className="pb-4 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Tạo Bài Thi / Quiz Mới
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Subject ID:{" "}
              <span className="font-mono text-blue-600">{subjectId}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Thông tin cơ bản bài thi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên bài kiểm tra *
              </label>
              <input
                type="text"
                required
                placeholder="Vd: Kiểm tra Trắc nghiệm Chương 1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0066FF] outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mô tả bài thi
              </label>
              <textarea
                rows={2}
                placeholder="Nhập nội dung dặn dò sinh viên trước khi làm bài..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0066FF] outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Thời lượng (phút) *
              </label>
              <input
                type="number"
                min={1}
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0066FF] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Điểm đạt (Passing Score) *
              </label>
              <input
                type="number"
                step="0.5"
                min={0}
                max={10}
                required
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0066FF] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Số lần làm bài tối đa *
              </label>
              <input
                type="number"
                min={1}
                required
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0066FF] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Vị trí bài thi
              </label>
              <select
                value={placementType}
                onChange={(e) =>
                  setPlacementType(e.target.value as QuizPlacementType)
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0066FF] outline-none"
              >
                <option value="STANDALONE_LESSON">
                  📍 Độc lập (Standalone Lesson)
                </option>
                <option value="IN_LESSON">📖 Trong Bài học (In Lesson)</option>
                <option value="IN_VIDEO">📺 Chèn trong Video (In Video)</option>
              </select>
            </div>
          </div>

          {/* Cấu hình Trạng thái & Peer Review */}
          <div className="flex flex-wrap gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#0066FF] focus:ring-[#0066FF]"
              />
              Kích hoạt ngay (Active)
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={isPeerReview}
                onChange={(e) => setIsPeerReview(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#0066FF] focus:ring-[#0066FF]"
              />
              Cho phép chấm điểm chéo (Peer Review)
            </label>
          </div>

          {/* ================= CHỌN CẤU HÌNH LOẠI ĐỀ THI ================= */}
          <div className="space-y-4 pt-2 border-t border-slate-200">
            <label className="block text-sm font-bold text-slate-800">
              Phương thức cấu hình đề thi *
            </label>

            {/* Radio Tab Chọn Loại */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setQuizType("FIXED_QUESTION")}
                className={`p-4 rounded-xl border text-left transition ${quizType === "FIXED_QUESTION"
                    ? "border-[#0066FF] bg-blue-50/50 ring-2 ring-[#0066FF]/20"
                    : "border-slate-200 hover:bg-slate-50"
                  }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-slate-800">
                    📌 Đề thi Cố định
                  </span>
                  <input
                    type="radio"
                    checked={quizType === "FIXED_QUESTION"}
                    onChange={() => { }}
                    className="text-[#0066FF]"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Chọn trực tiếp từng câu hỏi cụ thể từ Ngân hàng câu hỏi của
                  môn học.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setQuizType("RANDOM_QUESTION")}
                className={`p-4 rounded-xl border text-left transition ${quizType === "RANDOM_QUESTION"
                    ? "border-purple-600 bg-purple-50/50 ring-2 ring-purple-600/20"
                    : "border-slate-200 hover:bg-slate-50"
                  }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-slate-800">
                    🔀 Đề thi Ngẫu nhiên
                  </span>
                  <input
                    type="radio"
                    checked={quizType === "RANDOM_QUESTION"}
                    onChange={() => { }}
                    className="text-purple-600"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Rút câu hỏi ngẫu nhiên từ các Question Pools theo số lượng quy
                  định.
                </p>
              </button>
            </div>

            {/* CHẾ ĐỘ 1: BẢNG CHỌN CÂU HỎI CỐ ĐỊNH */}
            {quizType === "FIXED_QUESTION" && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700 uppercase">
                    Chọn câu hỏi từ Ngân hàng Subject
                  </span>
                  <span className="text-xs font-bold text-[#0066FF]">
                    Đã chọn: {selectedQuestionIds.length} câu hỏi
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {subjectQuestions.map((q) => {
                    const isSelected = selectedQuestionIds.includes(
                      q.question_id,
                    );
                    return (
                      <div
                        key={q.question_id}
                        onClick={() => handleToggleFixedQuestion(q.question_id)}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${isSelected
                            ? "bg-white border-[#0066FF] shadow-sm"
                            : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => { }}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0066FF]"
                        />
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-800">
                            {q.question_title}
                          </p>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            Loại: {q.question_type} | Điểm: {q.max_points}đ
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CHẾ ĐỘ 2: BẢNG CHỌN POOLS VÀ SỐ LƯỢNG NGẪU NHIÊN */}
            {quizType === "RANDOM_QUESTION" && (
              <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-purple-900 uppercase">
                    Cấu hình Quy tắc rút câu hỏi (QuizPoolRule)
                  </span>
                  <span className="text-xs font-bold text-purple-700">
                    Tổng câu hỏi sẽ bốc:{" "}
                    {poolRules.reduce((acc, curr) => acc + curr.quantity, 0)}{" "}
                    câu
                  </span>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {subjectPools.map((pool) => {
                    const currentRule = poolRules.find(
                      (r) => r.pool_id === pool.pool_id,
                    );
                    const currentQty = currentRule ? currentRule.quantity : 0;
                    const maxAvailable = pool.questions?.length || 0;

                    return (
                      <div
                        key={pool.pool_id}
                        className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-4"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            {pool.title}
                          </p>
                          <span className="text-[11px] text-slate-400">
                            Kho hiện có:{" "}
                            <strong className="text-slate-700">
                              {maxAvailable}
                            </strong>{" "}
                            câu hỏi
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <label className="text-xs font-semibold text-slate-600">
                            Rút lấy:
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={maxAvailable}
                            value={currentQty}
                            onChange={(e) =>
                              handlePoolQuantityChange(
                                pool.pool_id,
                                Number(e.target.value),
                              )
                            }
                            className="w-20 px-2.5 py-1 border border-slate-300 rounded-lg text-xs text-center font-bold text-slate-800 focus:ring-2 focus:ring-purple-600 outline-none"
                          />
                          <span className="text-xs text-slate-500">câu</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Modal Actions */}
          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#0066FF] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              Tạo bài kiểm tra
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
