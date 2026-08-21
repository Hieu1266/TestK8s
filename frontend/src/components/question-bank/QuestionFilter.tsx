"use client";

import { Search, Plus, Sparkles } from "lucide-react";

interface QuestionFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedType: string;
  onTypeChange: (value: string) => void;
  onAddQuestion: () => void;
  onGenerateAuto?: () => void;
}

export default function QuestionFilter({
  searchTerm,
  onSearchChange,
  selectedType,
  onTypeChange,
  onAddQuestion,
  onGenerateAuto,
}: QuestionFilterProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Bộ lọc Tìm kiếm & Loại câu hỏi */}
      <div className="flex flex-1 flex-col sm:flex-row items-center gap-3">
        {/* Ô tìm kiếm */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm kiếm nội dung câu hỏi..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-4 py-2 text-xs focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
          />
        </div>

        {/* Chọn loại câu hỏi (Chuẩn hóa khớp Enum Backend) */}
        <select
          value={selectedType}
          onChange={(e) => onTypeChange(e.target.value)}
          className="w-full sm:w-48 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition cursor-pointer"
        >
          <option value="">Tất cả loại câu hỏi</option>
          <option value="MULTIPLE_CHOICE">Trắc nghiệm</option>
          <option value="TRUE_FALSE">Đúng / Sai</option>
          <option value="FILL_IN_BLANK">Điền khuyết</option>
          <option value="ESSAY">Tự luận</option>
        </select>
      </div>

      {/* Cụm Nút hành động */}
      <div className="flex items-center gap-2 shrink-0">
        {onGenerateAuto && (
          <button
            type="button"
            onClick={onGenerateAuto}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3.5 py-2 rounded-xl text-xs transition shadow-sm"
          >
            Tạo câu điền khuyết tự động
          </button>
        )}

        <button
          type="button"
          onClick={onAddQuestion}
          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3.5 py-2 rounded-xl text-xs transition shadow-sm"
        >
          <Plus size={15} /> Thêm câu hỏi
        </button>
      </div>
    </div>
  );
}