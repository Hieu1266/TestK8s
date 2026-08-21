"use client";

import { Question } from "@/types/exam-management";

interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableQuestions: Question[];
  selectedQuestions: Question[];
  onToggleSelect: (q: Question) => void;
}

export default function AddQuestionModal({
  isOpen,
  onClose,
  availableQuestions,
  selectedQuestions,
  onToggleSelect,
}: AddQuestionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="text-lg font-bold text-slate-800">
            Chọn câu hỏi từ Ngân hàng
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold"
          >
            ✕
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
          {availableQuestions.map((q) => {
            const isSelected = selectedQuestions.some(
              (item) => item.question_id === q.question_id,
            );
            return (
              <div
                key={q.question_id}
                className="py-3 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {q.question_title}
                  </p>
                  <span className="text-[10px] font-mono text-slate-400">
                    Loại: {q.question_type} | Mặc định: {q.max_points} pts
                  </span>
                </div>
                <button
                  onClick={() => onToggleSelect(q)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${isSelected
                      ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
                      : "bg-blue-50 text-[#0066FF] hover:bg-blue-100"
                    }`}
                >
                  {isSelected ? "Bỏ chọn" : "+ Chọn"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#0066FF] text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition"
          >
            Hoàn tất
          </button>
        </div>
      </div>
    </div>
  );
}
