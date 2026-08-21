"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  ArrowLeft,
  Plus,
  HelpCircle,
  Clock,
  Trash2,
  Edit3,
  ArrowRight,
} from "lucide-react";

interface Quiz {
  quiz_id: string;
  title: string;
  duration_minutes: number;
  total_questions: number;
  passing_score: number;
  status: "active" | "draft";
}

const MOCK_MODULE_QUIZZES: Quiz[] = [
  {
    quiz_id: "mod-quiz-01",
    title: "Kiểm tra nhanh Module 1: Khái niệm cơ bản",
    duration_minutes: 15,
    total_questions: 5,
    passing_score: 5,
    status: "active",
  },
];

export default function ModuleQuizzesPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = (params.subject_id as string) || "";
  const moduleId = (params.module_id as string) || "";

  const [quizzes, setQuizzes] = useState<Quiz[]>(MOCK_MODULE_QUIZZES);
  const [showModal, setShowModal] = useState(false);

  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(15);
  const [passingScore, setPassingScore] = useState(5);

  const handleCreateQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newQuiz: Quiz = {
      quiz_id: `mod-quiz-${Date.now()}`,
      title,
      duration_minutes: Number(duration),
      total_questions: 0,
      passing_score: Number(passingScore),
      status: "draft",
    };

    setQuizzes([...quizzes, newQuiz]);
    setShowModal(false);
    setTitle("");

    router.push(
      `/instructor-management/course-content/${subjectId}/modules/${moduleId}/quizzes/${newQuiz.quiz_id}`,
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="space-y-4">
          <button
            onClick={() =>
              router.push(
                `/instructor-management/course-content/${subjectId}/modules/${moduleId}`,
              )
            }
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition"
          >
            <ArrowLeft size={18} />
            Quay lại chi tiết Module
          </button>

          <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  Subject: {subjectId}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                  Module: {moduleId}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
                Bài Kiểm Tra Thuộc Module
              </h1>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
            >
              <Plus size={18} />
              Tạo Quiz Cho Module
            </button>
          </div>
        </div>

        {/* Danh sách Quiz */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quizzes.map((quiz) => (
            <div
              key={quiz.quiz_id}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="text-lg font-bold text-slate-800 line-clamp-2">
                    {quiz.title}
                  </h3>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                      quiz.status === "active"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {quiz.status === "active" ? "Đã xuất bản" : "Bản nháp"}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-medium text-slate-500 pt-1">
                  <span className="flex items-center gap-1">
                    <Clock size={14} className="text-blue-500" />
                    {quiz.duration_minutes} phút
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <HelpCircle size={14} className="text-indigo-500" />
                    {quiz.total_questions} câu hỏi
                  </span>
                  <span>•</span>
                  <span>Điểm qua: {quiz.passing_score}/10</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <button className="text-slate-400 hover:text-rose-600 p-1.5 transition">
                  <Trash2 size={16} />
                </button>

                <button
                  onClick={() =>
                    router.push(
                      `/instructor-management/course-content/${subjectId}/modules/${moduleId}/quizzes/${quiz.quiz_id}`,
                    )
                  }
                  className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition"
                >
                  <Edit3 size={14} />
                  Chọn câu hỏi ({quiz.total_questions})
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modal Tạo Quiz */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Tạo Quiz Mới Cho Module
            </h3>
            <form onSubmit={handleCreateQuiz} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên bài Quiz *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Quiz ôn tập Module 1..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Thời gian (Phút)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Điểm đạt (Thang 10)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={passingScore}
                    onChange={(e) => setPassingScore(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition"
                >
                  Tiếp tục chọn câu hỏi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
