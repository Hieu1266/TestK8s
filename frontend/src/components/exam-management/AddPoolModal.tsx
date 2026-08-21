"use client";

import { QuestionPool } from "@/types/exam-management";

interface AddPoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  availablePools: QuestionPool[];
  onAddPool: (pool: QuestionPool) => void;
}

export default function AddPoolModal({
  isOpen,
  onClose,
  availablePools,
  onAddPool,
}: AddPoolModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="text-lg font-bold text-slate-800">
            Chọn Kho câu hỏi (Pool)
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold"
          >
            ✕
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto space-y-2">
          {availablePools.map((pool) => (
            <div
              key={pool.pool_id}
              className="p-3 border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center justify-between transition"
            >
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  {pool.title}
                </h4>
                <p className="text-xs text-slate-400">{pool.description}</p>
              </div>
              <button
                onClick={() => onAddPool(pool)}
                className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold rounded-lg transition shrink-0"
              >
                + Thêm vào Quy tắc
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
