
"use client";
import { useRouter } from "next/navigation";


type CourseHeaderBarProps = {
  courseTitle: string;
  progressPercent: number;
};



/** Thanh header đen trên cùng: tên khóa học, thanh tiến độ và nút rời lớp */
export default function CourseHeaderBar({ courseTitle, progressPercent }: CourseHeaderBarProps) {
  const router = useRouter();
  const handleLeaveCourse = () => {
    router.back(); // Quay lại trang liền trước trong lịch sử trình duyệt
  };
  
  
  return (
    <div className="bg-[#12141C] text-white px-6 py-3.5 flex justify-between items-center border-b border-white/10 shadow-md">
      <div className="flex items-center gap-3 min-w-0 pr-4">
        <span className="bg-[#5B5FEF] text-white text-[11px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wide shrink-0">
          Khóa học
        </span>
        <h1 className="text-base sm:text-lg font-bold text-white truncate" title={courseTitle}>
          {courseTitle}
        </h1>
      </div>

      <div className="flex items-center gap-6 shrink-0">
        {progressPercent >= 100 ? (
          <div className="hidden sm:flex items-center gap-2 bg-[#12B886]/15 text-[#3DDCA4] px-4 py-2 rounded-xl border border-[#12B886]/30">
            <span className="text-xs font-extrabold uppercase tracking-wide">Đã hoàn thành khóa học</span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
            <span className="text-xs font-semibold text-white/80">Tiến độ:</span>
            <div className="w-40 h-2.5 bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(90deg, #5B5FEF 0%, #12B886 100%)',
                }}
              />
            </div>
            <span className="text-xs font-extrabold text-[#12B886] tabular-nums w-10 text-right">
              {progressPercent}%
            </span>
          </div>
        )}

        

        <button
          type="button"
          onClick={handleLeaveCourse}
          className="text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer hover:bg-red-500/20"
          style={{ backgroundColor: 'rgba(229,72,77,0.15)', color: '#FF6B6B', border: '1px solid rgba(229,72,77,0.3)' }}
        >
          Rời khỏi lớp học
        </button>
      </div>
    </div>
  );
}
