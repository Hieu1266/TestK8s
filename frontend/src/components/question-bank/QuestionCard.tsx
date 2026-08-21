"use client";

import { Question } from "@/types/questions-bank";

interface QuestionCardProps {
  question: Question;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  isEditLoading?: boolean;
}

export default function QuestionCard({
  question,
  index,
  onEdit,
  onDelete,
  isEditLoading = false,
}: QuestionCardProps) {
  // Chuẩn hóa loại câu hỏi
  const qType = String(question.question_type || "").toUpperCase();

  const isMultipleChoice = qType === "MULTIPLE_CHOICE" || qType === "TRẮC NGHIỆM";
  const isTrueFalse = qType === "TRUE_FALSE" || qType === "ĐÚNG / SAI" || qType === "ĐÚNG/SAI";
  const isFillInBlank = qType === "FILL_IN_BLANK" || qType === "FILL_IN_THE_BLANK" || qType === "ĐIỀN KHUYẾT";

  // Hàm xác định nhãn và màu sắc hiển thị
  const getTypeBadge = () => {
    if (isMultipleChoice) {
      return {
        label: "Trắc nghiệm",
        className: "bg-blue-50 text-blue-600 border border-blue-100",
      };
    }
    if (isTrueFalse) {
      return {
        label: "Đúng / Sai",
        className: "bg-emerald-50 text-emerald-600 border border-emerald-100",
      };
    }
    if (isFillInBlank) {
      return {
        label: "Điền khuyết",
        className: "bg-amber-50 text-amber-600 border border-amber-100",
      };
    }
    return {
      label: "Tự luận",
      className: "bg-purple-50 text-purple-600 border border-purple-100",
    };
  };

  const typeInfo = getTypeBadge();

  // Hiển thị phương án cho Trắc nghiệm & Đúng/Sai
  const showOptions = (isMultipleChoice || isTrueFalse) && question.options && question.options.length > 0;

  // Hiển thị đáp án cho câu hỏi Điền khuyết
  const showFillInBlankAnswers = isFillInBlank && question.options && question.options.length > 0;

  // Hiển thị rubric cho câu hỏi Tự luận (ESSAY)
  const isEssay = !isMultipleChoice && !isTrueFalse && !isFillInBlank;
  const showRubrics = isEssay && question.rubrics && question.rubrics.length > 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3 flex-1">
          {/* Header Badge: Số thứ tự, Loại câu hỏi, Điểm tối đa */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900 text-lg">
              Câu {index + 1}:
            </span>

            <span
              className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ${typeInfo.className}`}
            >
              {typeInfo.label}
            </span>

            <span className="rounded-md bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {question.max_points} điểm
            </span>
          </div>

          {/* Hiển thị nội dung rich text */}
          <div
            className="ck-content text-slate-800 text-base leading-relaxed overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: question.content }}
          />

          {/* Hiển thị danh sách câu trả lời cho Trắc nghiệm & Đúng/Sai */}
          {showOptions && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 pt-3 border-t border-slate-100">
              {question.options!.map((opt, optIdx) => (
                <div
                  key={opt.option_id || optIdx}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm ${opt.is_correct
                    ? "border-emerald-300 bg-emerald-50/50 text-emerald-900 font-medium"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${opt.is_correct
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-600"
                      }`}
                  >
                    {String.fromCharCode(65 + optIdx)}
                  </span>
                  <span className="flex-1">{opt.option_text}</span>
                  {opt.is_correct && (
                    <span className="text-xs text-emerald-600 font-semibold">
                      (Đúng)
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Hiển thị đáp án cho câu hỏi Điền khuyết */}
          {showFillInBlankAnswers && (
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Đáp án cần điền
              </span>
              <div className="flex flex-wrap gap-2">
                {question.options!.map((opt, optIdx) => (
                  <div
                    key={opt.option_id || optIdx}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50/60 text-amber-900 text-sm font-medium"
                  >
                    <span>{opt.option_text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hiển thị Rubric cho câu hỏi Tự luận */}
          {showRubrics && (
            <div className="mt-4 space-y-2 pt-3 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Thang đánh giá
              </span>
              {question.rubrics!.map((criterion, cIdx) => (
                <div
                  key={criterion.criteria_id || cIdx}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg border border-purple-100 bg-purple-50/40"
                >
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold shrink-0">
                    {cIdx + 1}
                  </span>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-800">
                        {criterion.title}
                      </span>
                      <span className="text-xs font-bold text-purple-700 whitespace-nowrap">
                        {criterion.max_score != null
                          ? `${criterion.max_score} điểm`
                          : criterion.percentage != null
                            ? `${criterion.percentage}%`
                            : ""}
                      </span>
                    </div>
                    {criterion.description && (
                      <p className="text-xs text-slate-600">{criterion.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nút hành động Sửa / Xóa */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            disabled={isEditLoading}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors disabled:opacity-50"
          >
            {isEditLoading ? "Đang tải..." : "Sửa"}
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}