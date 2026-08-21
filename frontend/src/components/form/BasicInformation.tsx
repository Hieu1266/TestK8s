"use client";

interface Props {
  question: string;

  setQuestion: (value: string) => void;

  module: string;

  setModule: (value: string) => void;

  type: "Trắc nghiệm" | "Tự luận";

  setType: (value: "Trắc nghiệm" | "Tự luận") => void;

  difficulty: "Dễ" | "Trung bình" | "Khó";

  setDifficulty: (value: "Dễ" | "Trung bình" | "Khó") => void;

  modules: string[];
}

export default function BasicInformation({
  question,

  setQuestion,

  module,

  setModule,

  type,

  setType,

  difficulty,

  setDifficulty,

  modules,
}: Props) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-bold text-slate-800 mb-2">
          Nội dung câu hỏi
        </label>

        <textarea
          rows={4}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:border-[#0066FF]"
          placeholder="Nhập nội dung câu hỏi..."
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
            Module
          </label>

          <select
            value={module}
            onChange={(e) => setModule(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
          >
            {modules.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
            Loại câu hỏi
          </label>

          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
          >
            <option>Trắc nghiệm</option>

            <option>Tự luận</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
            Mức độ
          </label>

          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as any)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
          >
            <option>Dễ</option>

            <option>Trung bình</option>

            <option>Khó</option>
          </select>
        </div>
      </div>
    </div>
  );
}
