"use client";

import { Plus } from "lucide-react";
import ModuleQuizCard from "./ModuleQuizCard";
import EmptyState from "./EmptyState";

interface Quiz {
  quiz_id: string;

  title: string;

  description: string;

  duration_minutes: number;

  passing_score: number;

  max_attempts: number;

  is_active: boolean;
}

interface Props {
  quizzes: Quiz[];
}

export default function ModuleQuizList({ quizzes }: Props) {
  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold">Module Quiz</h2>

          <p className="text-slate-500 mt-1">
            Quản lý bài kiểm tra của Module.
          </p>
        </div>

        <button className="bg-[#0066FF] text-white rounded-xl px-5 py-3 flex items-center gap-2 hover:bg-blue-700 transition">
          <Plus size={18} />
          New Quiz
        </button>
      </div>

      {quizzes.length === 0 ? (
        <EmptyState
          title="Chưa có Quiz"
          description="Hãy tạo bài kiểm tra đầu tiên cho Module."
        />
      ) : (
        <div className="space-y-6">
          {quizzes.map((quiz) => (
            <ModuleQuizCard key={quiz.quiz_id} quiz={quiz} />
          ))}
        </div>
      )}
    </>
  );
}
