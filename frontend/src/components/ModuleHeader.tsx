"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  subjectTitle: string;
  moduleTitle: string;
}

export default function ModuleHeader({ subjectTitle, moduleTitle }: Props) {
  const router = useRouter();

  return (
    <section className="bg-gradient-to-r from-[#66CCFF] to-[#0066FF] text-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-blue-100 hover:text-white transition"
        >
          <ArrowLeft size={18} />
          Quay lại Subject
        </button>

        <p className="mt-6 text-blue-100">Subject</p>

        <h2 className="text-2xl font-semibold">{subjectTitle}</h2>

        <h1 className="text-5xl font-bold mt-4">{moduleTitle}</h1>

        <p className="text-blue-100 mt-4 text-lg">
          Quản lý Lesson và Module Quiz của Module này.
        </p>
      </div>
    </section>
  );
}
