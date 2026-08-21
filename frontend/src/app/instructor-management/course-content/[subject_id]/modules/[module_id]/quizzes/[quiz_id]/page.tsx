"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  ArrowLeft,
  CheckCircle2,
  Search,
  HelpCircle,
  Trash2,
  Save,
  CheckSquare,
  Square,
  Layers,
} from "lucide-react";

interface Question {
  question_id: string;
  module_id: string;
  content: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  options_count: number;
}

// Giả lập Question Bank lọc theo module_id
const MOCK_MODULE_QUESTION_BANK: Question[] = [
  {
    question_id: "mq-201",
    module_id: "mod-1",
    content: "Thành phần nào đảm nhận việc định tuyến trong Module này?",
    difficulty: "EASY",
    options_count: 4,
  },
  {
    question_id: "mq-202",
    module_id: "mod-1",
    content: "Cách khởi tạo một instance điều hướng chuẩn theo kiến trúc?",
    difficulty: "MEDIUM",
    options_count: 4,
  },
  {
    question_id: "mq-203",
    module_id: "mod-1",
    content: "Tại sao nên tách biệt logic quản lý state trong Module?",
    difficulty: "HARD",
    options_count: 4,
  },
];

export default function ModuleQuizQuestionSelectorPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = (params.subject_id as string) || "";
  const moduleId = (params.module_id as string) || "";
  const quizId = (params.quiz_id as string) || "";

  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([
    "mq-201",
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("ALL");

  // Lọc chỉ những câu hỏi thuộc Module hiện tại
  const availableQuestions = MOCK_MODULE_QUESTION_BANK.filter((q) => {
    const isRightModule = q.module_id === moduleId || moduleId === "";
    const matchesSearch = q.content
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesDiff =
      difficultyFilter === "ALL" || q.difficulty === difficultyFilter;
    return isRightModule && matchesSearch && matchesDiff;
  });

  const toggleSelectQuestion = (id: string) => {
    if (selectedQuestionIds.includes(id)) {
      setSelectedQuestionIds(selectedQuestionIds.filter((qId) => qId !== id));
    } else {
      setSelectedQuestionIds([...selectedQuestionIds, id]);
    }
  };

  const handleSaveQuiz = () => {
    alert(`Đã lưu ${selectedQuestionIds.length} câu hỏi vào Quiz của Module!`);
    router.push(
      `/instructor-management/course-content/${subjectId}/modules/${moduleId}/quizzes`,
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Header Navigation */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <button
              onClick={() =>
                router.push(
                  `/instructor-management/course-content/${subjectId}/modules/${moduleId}/quizzes`,
                )
              }
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition mb-2"
            >
              <ArrowLeft size={18} />
              Quay lại danh sách Quiz Module
            </button>
            <h1 className="text-2xl font-bold text-slate-900">
              Chọn Câu Hỏi Cho Quiz ({quizId})
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              <Layers size={14} className="text-blue-600" />
              Chỉ hiển thị câu hỏi thuộc Module:{" "}
              <span className="font-bold text-blue-600">{moduleId}</span>
            </p>
          </div>

          <button
            onClick={handleSaveQuiz}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
          >
            <Save size={18} />
            Lưu Quiz Module ({selectedQuestionIds.length} câu)
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* CỘT TRÁI: NGÂN HÀNG CÂU HỎI MODULE */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle size={18} className="text-blue-600" />
                Ngân Hàng Câu Hỏi Theo Module
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                Khả dụng: {availableQuestions.length} câu
              </span>
            </div>

            {/* Tim kiem & Loc */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Tìm nội dung câu hỏi trong module..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium outline-none"
              >
                <option value="ALL">Tất cả độ khó</option>
                <option value="EASY">Dễ</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HARD">Khó</option>
              </select>
            </div>

            {/* Question List */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {availableQuestions.map((q) => {
                const isSelected = selectedQuestionIds.includes(q.question_id);

                return (
                  <div
                    key={q.question_id}
                    onClick={() => toggleSelectQuestion(q.question_id)}
                    className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/40"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <button className="mt-0.5 text-blue-600">
                      {isSelected ? (
                        <CheckSquare size={18} />
                      ) : (
                        <Square size={18} className="text-slate-300" />
                      )}
                    </button>

                    <div className="space-y-1 flex-1">
                      <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                        {q.content}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            q.difficulty === "EASY"
                              ? "bg-emerald-100 text-emerald-700"
                              : q.difficulty === "MEDIUM"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {q.difficulty}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {q.options_count} lựa chọn
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CỘT PHẢI: CÂU HỎI ĐÃ CHỌN */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4 h-fit">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" />
                Câu Hỏi Đã Chọn
              </h2>
              <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                {selectedQuestionIds.length} câu
              </span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {selectedQuestionIds.map((id, index) => {
                const question = MOCK_MODULE_QUESTION_BANK.find(
                  (q) => q.question_id === id,
                );
                if (!question) return null;

                return (
                  <div
                    key={id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <span className="font-bold text-blue-600">
                        Câu {index + 1}:
                      </span>
                      <p className="text-slate-700 font-medium">
                        {question.content}
                      </p>
                    </div>

                    <button
                      onClick={() => toggleSelectQuestion(id)}
                      className="text-slate-400 hover:text-rose-600 p-1 shrink-0 transition"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}

              {selectedQuestionIds.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Chưa chọn câu hỏi nào cho bài Quiz này.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
