"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  ArrowLeft,
  CheckCircle2,
  Search,
  Filter,
  HelpCircle,
  Plus,
  Trash2,
  Save,
  CheckSquare,
  Square,
  Sparkles,
} from "lucide-react";

interface Question {
  question_id: string;
  subject_id: string;
  content: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  options_count: number;
}

// Giả lập Question Bank lọc theo subject_id
const MOCK_QUESTION_BANK: Question[] = [
  {
    question_id: "q-101",
    subject_id: "CT101",
    content:
      "Đâu là ưu điểm chính của kiến trúc Microservices so với Monolith?",
    difficulty: "EASY",
    options_count: 4,
  },
  {
    question_id: "q-102",
    subject_id: "CT101",
    content:
      "Phương thức HTTP nào được dùng để cập nhật một phần dữ liệu tài nguyên?",
    difficulty: "EASY",
    options_count: 4,
  },
  {
    question_id: "q-103",
    subject_id: "CT101",
    content:
      "Cấu trúc JWT Token gồm có bao nhiêu phần chính được phân cách bởi dấu chấm?",
    difficulty: "MEDIUM",
    options_count: 4,
  },
  {
    question_id: "q-104",
    subject_id: "CT101",
    content: "Giải thích cơ chế Circuit Breaker trong Microservices Pattern?",
    difficulty: "HARD",
    options_count: 4,
  },
];

export default function QuizQuestionSelectorPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = (params.subject_id as string) || "";
  const quizId = (params.quiz_id as string) || "";

  // Danh sách ID các câu hỏi ĐÃ ĐƯỢC CHỌN cho Quiz này
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([
    "q-101",
  ]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("ALL");

  // Lọc Question Bank theo subject_id hiện tại & bộ lọc search
  const availableQuestions = MOCK_QUESTION_BANK.filter((q) => {
    const isRightSubject = q.subject_id === subjectId || subjectId === "";
    const matchesSearch = q.content
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesDiff =
      difficultyFilter === "ALL" || q.difficulty === difficultyFilter;
    return isRightSubject && matchesSearch && matchesDiff;
  });

  const toggleSelectQuestion = (id: string) => {
    if (selectedQuestionIds.includes(id)) {
      setSelectedQuestionIds(selectedQuestionIds.filter((qId) => qId !== id));
    } else {
      setSelectedQuestionIds([...selectedQuestionIds, id]);
    }
  };

  const handleSaveQuiz = () => {
    alert(`Đã lưu ${selectedQuestionIds.length} câu hỏi vào Quiz!`);
    router.push(`/instructor-management/course-content/${subjectId}/quizzes`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Top Action Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <button
              onClick={() =>
                router.push(
                  `/instructor-management/course-content/${subjectId}/quizzes`,
                )
              }
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition mb-2"
            >
              <ArrowLeft size={18} />
              Quay lại danh sách Quiz
            </button>
            <h1 className="text-2xl font-bold text-slate-900">
              Chọn Câu Hỏi Cho Bài Thi ({quizId})
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Dữ liệu lấy từ Ngân hàng câu hỏi thuộc môn:{" "}
              <span className="font-bold text-blue-600">{subjectId}</span>
            </p>
          </div>

          <button
            onClick={handleSaveQuiz}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
          >
            <Save size={18} />
            Lưu Cấu Hình Bài Thi ({selectedQuestionIds.length} câu)
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* CỘT TRÁI: DANH SÁCH CÂU HỎI TỪ QUESTION BANK */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle size={18} className="text-blue-600" />
                Ngân Hàng Câu Hỏi Môn Học
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                Khả dụng: {availableQuestions.length} câu
              </span>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Tìm nội dung câu hỏi..."
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

            {/* Questions List */}
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

          {/* CỘT PHẢI: DANH SÁCH CÂU HỎI ĐÃ ĐƯỢC CHỌN VÀO QUIZ */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4 h-fit">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" />
                Câu Hỏi Đã Chọn Trong Bài Thi
              </h2>
              <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                {selectedQuestionIds.length} câu
              </span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {selectedQuestionIds.map((id, index) => {
                const question = MOCK_QUESTION_BANK.find(
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
                      title="Bỏ chọn câu này"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}

              {selectedQuestionIds.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Chưa chọn câu hỏi nào. Hãy tick chọn ở danh sách bên trái.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
