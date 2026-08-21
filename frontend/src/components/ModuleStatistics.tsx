"use client";

import { BookOpen, FileQuestion } from "lucide-react";

interface Props {
  lessonCount: number;
  quizCount: number;
}

export default function ModuleStatistics({ lessonCount, quizCount }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div className="bg-white rounded-2xl shadow p-6">
        <BookOpen size={34} className="text-[#0066FF]" />

        <p className="text-slate-500 mt-3">Lessons</p>

        <h2 className="text-3xl font-bold text-[#0066FF] mt-2">
          {lessonCount}
        </h2>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <FileQuestion size={34} className="text-[#0066FF]" />

        <p className="text-slate-500 mt-3">Module Quiz</p>

        <h2 className="text-3xl font-bold text-[#0066FF] mt-2">{quizCount}</h2>
      </div>
    </div>
  );
}
