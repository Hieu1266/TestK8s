"use client";

import { CauHoi } from "@/types/questions-bank";

interface Props {
  questions: CauHoi[];
}

export default function StatisticCards({ questions }: Props) {
  const total = questions.length;

  const tracNghiem = questions.filter(
    (q) => q.loaiCauHoi === "Trắc nghiệm",
  ).length;

  const tuLuan = questions.filter((q) => q.loaiCauHoi === "Tự luận").length;

  const topics = new Set(questions.flatMap((q) => q.chuDe)).size;

  return (
    <section className="max-w-7xl mx-auto px-6 -mt-16 mb-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl shadow-md border p-6 text-center">
          <div className="text-3xl font-extrabold text-[#0066FF]">{total}</div>

          <div className="text-xs text-slate-500 mt-2">Tổng câu hỏi</div>
        </div>

        <div className="bg-white rounded-2xl shadow-md border p-6 text-center">
          <div className="text-3xl font-extrabold text-blue-500">
            {tracNghiem}
          </div>

          <div className="text-xs text-slate-500 mt-2">Trắc nghiệm</div>
        </div>

        <div className="bg-white rounded-2xl shadow-md border p-6 text-center">
          <div className="text-3xl font-extrabold text-amber-500">{tuLuan}</div>

          <div className="text-xs text-slate-500 mt-2">Tự luận</div>
        </div>

        <div className="bg-white rounded-2xl shadow-md border p-6 text-center">
          <div className="text-3xl font-extrabold text-emerald-500">
            {topics}
          </div>

          <div className="text-xs text-slate-500 mt-2">Chủ đề</div>
        </div>
      </div>
    </section>
  );
}
