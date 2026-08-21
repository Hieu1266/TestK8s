"use client";

import { BookOpen, FileQuestion } from "lucide-react";

interface Props {
  activeTab: "lesson" | "quiz";
  setActiveTab: (tab: "lesson" | "quiz") => void;
}

export default function ModuleTabs({ activeTab, setActiveTab }: Props) {
  return (
    <div className="flex flex-wrap gap-4 mb-8">
      <button
        onClick={() => setActiveTab("lesson")}
        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition ${
          activeTab === "lesson"
            ? "bg-[#0066FF] text-white shadow"
            : "bg-white hover:bg-slate-50"
        }`}
      >
        <BookOpen size={18} />
        Lessons
      </button>

      <button
        onClick={() => setActiveTab("quiz")}
        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition ${
          activeTab === "quiz"
            ? "bg-[#0066FF] text-white shadow"
            : "bg-white hover:bg-slate-50"
        }`}
      >
        <FileQuestion size={18} />
        Module Quiz
      </button>
    </div>
  );
}
