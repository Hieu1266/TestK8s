"use client";

import { Plus } from "lucide-react";
import LessonCard from "./LessonCard";
import EmptyState from "./EmptyState";

interface Lesson {
  lesson_id: string;
  title: string;
  duration_minutes: number;
  video_url?: string;
  is_optional: boolean;
  order_index: number;
}

interface Props {
  lessons: Lesson[];
  subjectId: string;
  moduleId: string;
}

export default function LessonTimeline({
  lessons,
  subjectId,
  moduleId,
}: Props) {
  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Lessons</h2>

          <p className="text-slate-500 mt-1">
            Quản lý toàn bộ bài học của Module.
          </p>
        </div>

        <button className="bg-[#0066FF] text-white px-5 py-3 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition">
          <Plus size={18} />
          New Lesson
        </button>
      </div>

      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-1 bg-blue-100 rounded-full" />

        <div className="space-y-8">
          {lessons.length === 0 && (
            <EmptyState
              title="Chưa có Lesson"
              description="Nhấn 'New Lesson' để tạo bài học đầu tiên."
            />
          )}
          {lessons.map((lesson) => (
            <div key={lesson.lesson_id} className="relative pl-16">
              <div className="absolute left-3 top-10 w-6 h-6 rounded-full bg-[#0066FF] border-4 border-white shadow" />

              <LessonCard
                lesson={lesson}
                subjectId={subjectId}
                moduleId={moduleId}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
