"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Question } from "@/types/questions-bank";
import {
  Plus,
  Trash2,
  X,
  HelpCircle,
  GripVertical,
  Percent,
  Divide,
  AlertTriangle,
  Highlighter,
  Check,
} from "lucide-react";

const RichTextEditor = dynamic(
  () => import("@/components/editors/RichTextEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="h-28 rounded-xl border border-slate-200 bg-slate-50 animate-pulse p-3 text-xs text-slate-400 flex items-center justify-center">
        Đang tải trình soạn thảo...
      </div>
    ),
  }
);

interface OptionItem {
  option_id: string;
  option_text: string;
  is_correct: boolean;
}

export interface RubricCriterionItem {
  criteria_id?: string;
  title: string;
  description: string;
  percentage: number;
  max_score?: number;
}

interface AddQuestionModalProps {
  open: boolean;
  subjectId: string;
  onClose: () => void;
  onSave: (question: Question) => void;
  editQuestion?: Question;
}

const roundToFixed = (num: number, decimals: number = 2): number => {
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
};

const reindexOptions = (opts: OptionItem[]): OptionItem[] => opts;

const DEFAULT_INITIAL_OPTIONS: OptionItem[] = [
  { option_id: "", option_text: "", is_correct: true },
  { option_id: "", option_text: "", is_correct: false },
];

const DEFAULT_RUBRICS: RubricCriterionItem[] = [
  { title: "Nội dung chính", description: "Nêu đầy đủ và chính xác các ý cốt lõi", percentage: 60, max_score: 6.0 },
  { title: "Lập luận & Trình bày", description: "Diễn đạt logic, rõ ràng, không sai chính tả", percentage: 40, max_score: 4.0 },
];

export default function AddQuestionModal({
  open,
  subjectId,
  onClose,
  onSave,
  editQuestion,
}: AddQuestionModalProps) {
  const [content, setContent] = useState("");
  const [questionType, setQuestionType] = useState<string>("MULTIPLE_CHOICE");
  const [maxPoints, setMaxPoints] = useState<number>(10.0);
  const [options, setOptions] = useState<OptionItem[]>(DEFAULT_INITIAL_OPTIONS);
  const [rubrics, setRubrics] = useState<RubricCriterionItem[]>(DEFAULT_RUBRICS);

  // Đáp án ô khuyết
  const [blankAnswer, setBlankAnswer] = useState<string>("");

  useEffect(() => {
    if (editQuestion) {
      setContent(editQuestion.content || "");

      const rawType = editQuestion.question_type || "MULTIPLE_CHOICE";
      const normalizedType = String(rawType).toUpperCase();
      setQuestionType(normalizedType);

      const currentMaxPoints = editQuestion.max_points && editQuestion.max_points > 0 ? editQuestion.max_points : 10.0;
      setMaxPoints(currentMaxPoints);

      const qOptions = (editQuestion as unknown as { options?: OptionItem[] }).options;
      if (qOptions && qOptions.length > 0) {
        setOptions(reindexOptions(qOptions));
        if (normalizedType === "FILL_IN_BLANK") {
          setBlankAnswer(qOptions[0]?.option_text || "");
        }
      } else {
        setOptions(DEFAULT_INITIAL_OPTIONS);
        setBlankAnswer("");
      }

      const qRubrics = (editQuestion as unknown as { rubrics?: any[]; rubric_criteria?: any[] }).rubrics
        || (editQuestion as unknown as { rubrics?: any[]; rubric_criteria?: any[] }).rubric_criteria;

      if (qRubrics && Array.isArray(qRubrics) && qRubrics.length > 0) {
        setRubrics(
          qRubrics.map((r) => {
            let pct = Number(r.percentage ?? r.percent) || 0;
            let score = Number(r.max_score) || 0;

            if (pct === 0 && score > 0 && currentMaxPoints > 0) {
              pct = roundToFixed((score / currentMaxPoints) * 100, 1);
            }
            if (score === 0 && pct > 0 && currentMaxPoints > 0) {
              score = roundToFixed((pct * currentMaxPoints) / 100, 2);
            }

            return {
              criteria_id: r.criteria_id,
              title: r.title || "",
              description: r.description || "",
              percentage: pct,
              max_score: score,
            };
          })
        );
      } else {
        setRubrics(DEFAULT_RUBRICS);
      }
    } else {
      setContent("");
      setQuestionType("MULTIPLE_CHOICE");
      setMaxPoints(10.0);
      setOptions(DEFAULT_INITIAL_OPTIONS);
      setRubrics(DEFAULT_RUBRICS);
      setBlankAnswer("");
    }
  }, [editQuestion, open]);

  if (!open) return null;

  const totalPercentage = roundToFixed(
    rubrics.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0),
    1
  );
  const isPercentageValid = Math.abs(totalPercentage - 100) < 0.01;

  const handleMaxPointsChange = (newMax: number) => {
    setMaxPoints(newMax);
    setRubrics((prevRubrics) =>
      prevRubrics.map((item) => ({
        ...item,
        max_score: roundToFixed(((item.percentage || 0) * newMax) / 100, 2),
      }))
    );
  };

  const handleTypeChange = (type: string) => {
    const upperType = type.toUpperCase();
    setQuestionType(upperType);

    if (upperType === "TRUE_FALSE") {
      setOptions([
        { option_id: "", option_text: "Đúng", is_correct: true },
        { option_id: "", option_text: "Sai", is_correct: false },
      ]);
    } else if (upperType === "MULTIPLE_CHOICE" && options.length < 2) {
      setOptions(DEFAULT_INITIAL_OPTIONS);
    }
  };

  /**
   * Xử lý tô đen chữ:
   * 1. Lấy từ/cụm từ đang được bôi đen và gán vào đáp án khuyết (blankAnswer).
   * 2. Thay thế vị trí từ được bôi đen trong nội dung câu hỏi (content) thành "_____".
   */
  const handleCaptureSelectedText = () => {
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString().trim() : "";

    if (!selectedText) {
      alert("Vui lòng bôi đen từ/cụm từ cần làm ô khuyết trong câu hỏi trước khi bấm nút này!");
      return;
    }

    // 1. Lưu từ tô đen vào đáp án đúng
    setBlankAnswer(selectedText);

    // 2. Thay thế từ/cụm từ được tô đen trong HTML content bằng '_____'
    if (content.includes(selectedText)) {
      const updatedContent = content.replace(selectedText, "_____");
      setContent(updatedContent);
    }
  };

  // Handlers Trắc nghiệm
  const handleOptionChange = (index: number, text: string) => {
    setOptions((prev) => prev.map((opt, i) => (i === index ? { ...opt, option_text: text } : opt)));
  };

  const handleSelectCorrect = (index: number) => {
    setOptions((prev) => prev.map((opt, i) => ({ ...opt, is_correct: i === index })));
  };

  const handleAddOption = () => {
    setOptions((prev) => [...prev, { option_id: "", option_text: "", is_correct: false }]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return alert("Cần tối thiểu 2 phương án!");
    setOptions((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      const reindexed = reindexOptions(filtered);
      if (!reindexed.some((o) => o.is_correct) && reindexed.length > 0) {
        reindexed[0].is_correct = true;
      }
      return reindexed;
    });
  };

  // Handlers Rubric
  const handleAddCriterion = () => {
    const remaining = Math.max(0, roundToFixed(100 - totalPercentage, 1));
    const calculatedScore = roundToFixed((remaining * maxPoints) / 100, 2);
    setRubrics([
      ...rubrics,
      { title: "", description: "", percentage: remaining, max_score: calculatedScore },
    ]);
  };

  const handleRemoveCriterion = (index: number) => {
    if (rubrics.length <= 1) return alert("Thang điểm Rubric cần có ít nhất 1 tiêu chí!");
    setRubrics(rubrics.filter((_, i) => i !== index));
  };

  const handleCriterionChange = (index: number, field: keyof RubricCriterionItem, value: any) => {
    setRubrics(
      rubrics.map((item, i) => {
        if (i !== index) return item;

        if (field === "percentage") {
          const newPct = parseFloat(value) || 0;
          return {
            ...item,
            percentage: newPct,
            max_score: roundToFixed((newPct * maxPoints) / 100, 2),
          };
        }

        return { ...item, [field]: value };
      })
    );
  };

  const handleScoreDirectChange = (index: number, inputScore: number) => {
    if (maxPoints <= 0) return;
    const calculatedPct = roundToFixed((inputScore / maxPoints) * 100, 1);

    setRubrics(
      rubrics.map((item, i) =>
        i === index
          ? {
            ...item,
            percentage: Math.min(100, Math.max(0, calculatedPct)),
            max_score: inputScore,
          }
          : item
      )
    );
  };

  const handleDistributeEqually = () => {
    if (rubrics.length === 0) return;
    const basePct = Math.floor(100 / rubrics.length);
    const remainder = roundToFixed(100 - basePct * rubrics.length, 1);

    setRubrics(
      rubrics.map((item, idx) => {
        const pct = idx === 0 ? roundToFixed(basePct + remainder, 1) : basePct;
        return {
          ...item,
          percentage: pct,
          max_score: roundToFixed((pct * maxPoints) / 100, 2),
        };
      })
    );
  };

  // Submit Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanContent = content.replace(/<[^>]*>/g, "").trim();
    if (!cleanContent) return alert("Vui lòng nhập nội dung câu hỏi!");

    const normalizedType = questionType.toUpperCase();
    let finalOptions: OptionItem[] = [];

    if (normalizedType === "FILL_IN_BLANK") {
      if (!blankAnswer.trim()) {
        return alert("Vui lòng nhập hoặc tô đen chọn đáp án khuyết!");
      }
      const existingOptId = options[0]?.option_id || "";
      finalOptions = [{ option_id: existingOptId, option_text: blankAnswer.trim(), is_correct: true }];
    } else if (normalizedType === "MULTIPLE_CHOICE" || normalizedType === "TRUE_FALSE") {
      if (options.length < 2) return alert("Câu hỏi yêu cầu ít nhất 2 phương án!");
      if (options.some((opt) => !opt.option_text.trim())) return alert("Vui lòng nhập đầy đủ nội dung phương án!");
      finalOptions = options;
    }

    if (normalizedType === "ESSAY") {
      if (rubrics.length === 0) return alert("Vui lòng thêm ít nhất 1 tiêu chí Rubric!");
      if (rubrics.some((r) => !r.title.trim())) return alert("Vui lòng nhập tên tiêu chí Rubric!");
      if (!isPercentageValid) return alert(`Tổng trọng số các tiêu chí phải bằng 100%! (Hiện tại là ${totalPercentage}%)`);
    }

    const payload: any = {
      ...(editQuestion?.question_id ? { question_id: editQuestion.question_id } : {}),
      subject_id: subjectId,
      question_type: normalizedType,
      content: content,
      max_points: maxPoints,
      ...(normalizedType === "ESSAY"
        ? {
          rubrics: rubrics.map((r) => {
            const pct = Number(r.percentage) || 0;
            const maxScore = roundToFixed((pct * maxPoints) / 100, 2);
            return {
              ...(r.criteria_id ? { criteria_id: r.criteria_id } : {}),
              title: r.title,
              description: r.description || "",
              percentage: pct,
              percent: pct,
              max_score: maxScore,
            };
          }),
        }
        : { options: finalOptions }),
    };

    onSave(payload as unknown as Question);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl max-h-[92vh] flex flex-col border border-slate-100">

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3.5 bg-slate-50/60 shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-2 text-slate-800">
            <HelpCircle className="text-emerald-600" size={18} />
            <h2 className="text-sm font-bold text-slate-800">
              {editQuestion ? "Cập nhật câu hỏi" : "Thêm câu hỏi mới"}
            </h2>
          </div>
          <button onClick={onClose} type="button" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Nội dung câu hỏi */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Nội dung câu hỏi <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <GripVertical size={12} /> Nắm góc dưới để kéo giãn
              </span>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-auto min-h-[130px] max-h-[350px]">
              <RichTextEditor value={content} onChange={setContent} />
            </div>
          </div>

          {/* Loại câu hỏi & Điểm tối đa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Loại câu hỏi</label>
              <select
                value={questionType}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white cursor-pointer"
              >
                <option value="MULTIPLE_CHOICE">Trắc nghiệm (MULTIPLE_CHOICE)</option>
                <option value="TRUE_FALSE">Đúng / Sai (TRUE_FALSE)</option>
                <option value="FILL_IN_BLANK">Điền khuyết (FILL_IN_BLANK)</option>
                <option value="ESSAY">Tự luận (ESSAY)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Điểm tối đa</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="10"
                value={maxPoints}
                onChange={(e) => handleMaxPointsChange(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <hr className="border-slate-100 my-1" />

          {/* LOẠI CÂU HỎI: FILL_IN_BLANK */}
          {questionType === "FILL_IN_BLANK" ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  Đáp án cho ô khuyết <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()} // Giữ vùng tô đen không bị mất focus
                  onClick={handleCaptureSelectedText}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg transition active:scale-95"
                  title="Tô đen chữ trong câu hỏi phía trên rồi nhấn nút này"
                >
                  <Highlighter size={13} />
                  Tự tạo ô khuyết từ chữ tô đen
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    <Check size={14} />
                  </div>
                  <input
                    type="text"
                    value={blankAnswer}
                    onChange={(e) => setBlankAnswer(e.target.value)}
                    placeholder="Nhập từ khuyết hoặc tô đen chữ ở trên rồi chọn 'Tự tạo ô khuyết từ chữ tô đen'..."
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <p className="text-[11px] text-slate-400 italic pl-9">
                  Hướng dẫn: Bôi đen từ cần ẩn trong câu hỏi $\rightarrow$ Nhấn nút <strong className="text-amber-700">Tự tạo ô khuyết từ chữ tô đen</strong>. Từ đó sẽ chuyển thành <code className="text-slate-700 bg-slate-200 px-1 rounded">_____</code> và tự lưu vào ô đáp án.
                </p>
              </div>
            </div>
          ) : questionType === "MULTIPLE_CHOICE" || questionType === "TRUE_FALSE" ? (
            /* TRẮC NGHIỆM / ĐÚNG SAI */
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-slate-700">Phương án trả lời</label>
              <div className="space-y-2">
                {options.map((opt, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2.5 p-1.5 rounded-xl border ${opt.is_correct ? "border-emerald-500 bg-emerald-50/40" : "border-slate-200"
                      }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectCorrect(index)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition ${opt.is_correct ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      title="Đánh dấu đáp án đúng"
                    >
                      {String.fromCharCode(65 + index)}
                    </button>
                    <input
                      type="text"
                      value={opt.option_text}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Phương án ${String.fromCharCode(65 + index)}...`}
                      className="flex-1 bg-transparent text-xs font-medium focus:outline-none px-1"
                    />
                    {options.length > 2 && questionType !== "TRUE_FALSE" && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(index)}
                        className="text-slate-300 hover:text-rose-500 p-1 transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {questionType !== "TRUE_FALSE" && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 pt-0.5"
                >
                  <Plus size={14} /> Thêm phương án
                </button>
              )}
            </div>
          ) : (
            /* RUBRIC TỰ LUẬN */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">Thang điểm Rubric chi tiết</label>
                <span className="text-[10px] text-slate-400">Có thể sửa % hoặc gõ trực tiếp số điểm</span>
              </div>

              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-3">
                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                  {rubrics.map((criterion, index) => (
                    <div key={index} className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={criterion.title}
                          onChange={(e) => handleCriterionChange(index, "title", e.target.value)}
                          placeholder={`Tiêu chí ${index + 1}...`}
                          className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-800"
                        />

                        {/* Ô Tỷ lệ % */}
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={criterion.percentage}
                            onChange={(e) => handleCriterionChange(index, "percentage", e.target.value)}
                            className="w-11 text-center bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                          />
                          <Percent size={11} className="text-slate-400" />
                        </div>

                        {/* Ô Điểm tối đa */}
                        <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
                          <input
                            type="number"
                            min="0"
                            max={maxPoints}
                            step="0.25"
                            value={criterion.max_score ?? roundToFixed(((criterion.percentage || 0) * maxPoints) / 100, 2)}
                            onChange={(e) => handleScoreDirectChange(index, parseFloat(e.target.value) || 0)}
                            className="w-12 text-center bg-transparent text-xs font-bold text-emerald-700 focus:outline-none"
                          />
                          <span className="text-[10px] font-bold text-emerald-600">đ</span>
                        </div>

                        {rubrics.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCriterion(index)}
                            className="text-slate-300 hover:text-rose-500 p-1 transition"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={criterion.description}
                        onChange={(e) => handleCriterionChange(index, "description", e.target.value)}
                        placeholder="Mô tả chi tiết yêu cầu..."
                        className="w-full bg-slate-50/70 border border-slate-100 rounded-lg px-2.5 py-1 text-[11px] text-slate-600"
                      />
                    </div>
                  ))}
                </div>

                {/* Footer Rubric */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddCriterion}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition"
                    >
                      <Plus size={13} /> Thêm tiêu chí
                    </button>
                    <button
                      type="button"
                      onClick={handleDistributeEqually}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-white px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
                    >
                      <Divide size={13} /> Chia đều %
                    </button>
                  </div>

                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${isPercentageValid
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-600 border-rose-200"
                      }`}
                  >
                    {!isPercentageValid && <AlertTriangle size={13} />}
                    <span>Tổng: {totalPercentage}% / 100%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition"
            >
              Lưu câu hỏi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}