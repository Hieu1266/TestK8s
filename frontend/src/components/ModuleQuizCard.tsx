"use client";

import {
  Clock3,
  Trophy,
  RotateCcw,
  CheckCircle2,
  Pencil,
  Trash2,
} from "lucide-react";

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
  quiz: Quiz;
}

export default function ModuleQuizCard({ quiz }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow hover:shadow-xl transition p-6">
      <div className="flex justify-between">
        <div>
          <h2 className="text-2xl font-bold">{quiz.title}</h2>

          <p className="text-slate-500 mt-2">{quiz.description}</p>
        </div>

        <div className="flex gap-3">
          <button>
            <Pencil className="text-blue-600" />
          </button>

          <button>
            <Trash2 className="text-red-500" />
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6 mt-8">
        <div className="flex items-center gap-2">
          <Clock3 size={18} />
          {quiz.duration_minutes} min
        </div>

        <div className="flex items-center gap-2">
          <Trophy size={18} />
          Pass {quiz.passing_score}%
        </div>

        <div className="flex items-center gap-2">
          <RotateCcw size={18} />
          {quiz.max_attempts} Attempts
        </div>

        <div>
          {quiz.is_active ? (
            <span className="bg-green-100 text-green-700 rounded-full px-3 py-1 text-sm inline-flex items-center gap-1">
              <CheckCircle2 size={16} />
              Active
            </span>
          ) : (
            <span className="bg-slate-200 text-slate-600 rounded-full px-3 py-1 text-sm">
              Inactive
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
