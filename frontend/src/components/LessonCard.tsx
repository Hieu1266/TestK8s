"use client";
import Link from "next/link";
import {
  Clock3,
  Video,
  FileText,
  Pencil,
  Trash2,
  ArrowRight,
} from "lucide-react";

interface Lesson {
  lesson_id: string;
  title: string;
  duration_minutes: number;
  video_url?: string;
  is_optional: boolean;
  order_index: number;
}

interface Props {
  lesson: Lesson;
  subjectId: string;
  moduleId: string;
}

export default function LessonCard({ lesson, subjectId, moduleId }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow hover:shadow-xl transition p-6">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-sm font-semibold text-[#0066FF]">
            Lesson {lesson.order_index.toString().padStart(2, "0")}
          </span>

          <h2 className="text-2xl font-bold mt-2">{lesson.title}</h2>
        </div>

        <div className="flex gap-3">
          <button className="text-blue-600 hover:text-blue-800">
            <Pencil size={20} />
          </button>

          <button className="text-red-500 hover:text-red-700">
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-6 mt-6 text-slate-600">
        <div className="flex items-center gap-2">
          <Clock3 size={18} />
          {lesson.duration_minutes} Minutes
        </div>

        <div className="flex items-center gap-2">
          {lesson.video_url ? (
            <>
              <Video size={18} />
              Video Lesson
            </>
          ) : (
            <>
              <FileText size={18} />
              Text Lesson
            </>
          )}
        </div>

        {lesson.is_optional && (
          <span className="bg-yellow-100 text-yellow-700 rounded-full px-3 py-1 text-sm">
            Optional
          </span>
        )}
      </div>

      <div className="flex justify-end mt-8">
        <Link
          href={`/instructor-management/course-content/${subjectId}/modules/${moduleId}/lessons/${lesson.lesson_id}`}
          className="flex items-center gap-2 text-[#0066FF] font-semibold hover:gap-3 transition-all"
        >
          Open Lesson
          <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}
