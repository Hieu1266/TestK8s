"use client";

interface Props {
  guideline: string;
  setGuideline: (value: string) => void;
}

export default function EssayEditor({ guideline, setGuideline }: Props) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <div className="mb-5">
          <h3 className="text-lg font-bold text-amber-900">
            Hướng dẫn chấm bài
          </h3>

          <p className="text-sm text-amber-700 mt-1">
            Nội dung này chỉ dành cho giảng viên khi chấm bài.
          </p>
        </div>

        <textarea
          rows={8}
          value={guideline}
          onChange={(e) => setGuideline(e.target.value)}
          placeholder="Ví dụ:

- Nêu đúng định nghĩa (2 điểm)
- Giải thích nguyên lý (4 điểm)
- Đưa ví dụ minh họa (2 điểm)
- Kết luận (2 điểm)"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 resize-none focus:outline-none focus:border-[#0066FF]"
        />
      </div>

      <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
        <p className="text-sm text-[#0066FF]">
          💡 Hướng dẫn chấm sẽ không hiển thị cho sinh viên.
        </p>
      </div>
    </div>
  );
}
