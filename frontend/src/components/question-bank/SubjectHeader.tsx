"use client";

import { useRouter } from "next/navigation";
import { SubjectInfo } from "@/types/questions-bank";

interface Props {
  subject: SubjectInfo | null;
}

export default function SubjectHeader({ subject }: Props) {
  const router = useRouter();

  if (!subject) {
    return (
      <div className="w-full h-28 bg-slate-200/80 animate-pulse rounded-2xl" />
    );
  }

  return (
    <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-6 shadow-md">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => router.push("/instructor-management/questions-bank")}
          className="mb-4 flex items-center gap-2 text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded-xl transition backdrop-blur-sm"
        >
          ← Danh sách Môn học
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full uppercase tracking-wider">
            {subject.code || "NGÂN HÀNG CÂU HỎI"}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold mt-2">
          {subject.title}
        </h1>
      </div>
    </section>
  );
}