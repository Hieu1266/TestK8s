import { LessonStatus } from '@/types/statuses';

type CompleteLessonButtonProps = {
  completing: boolean;
  isOptional?: boolean;
  status?: LessonStatus;
  onClick: () => void;
};

/** Nút "Xác nhận hoàn thành & Bài tiếp theo" hiển thị cho bài đọc (không video, không quiz) */
export default function CompleteLessonButton({ completing, isOptional, status, onClick }: CompleteLessonButtonProps) {
  const isCompleted = status === LessonStatus.COMPLETED;

  return (
    <div className="flex justify-end pt-4 border-t border-[#ECEAF0]">
      <button
        type="button"
        onClick={onClick}
        disabled={completing || (isOptional && isCompleted)}
        className="flex items-center gap-2.5 bg-[#5B5FEF] hover:bg-[#4B4FEF] text-white text-sm font-bold px-7 py-3.5 rounded-full shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
      >
        {completing ? (
          <span>Đang lưu tiến độ...</span>
        ) : (
          <>
            <span>
              {isOptional
                ? isCompleted
                  ? 'Đã hoàn thành'
                  : 'Xác nhận hoàn thành'
                : isCompleted
                  ? 'Bài tiếp theo'
                  : 'Xác nhận hoàn thành & Bài tiếp theo'}
            </span>
            {!isOptional && <span className="text-base">→</span>}
          </>
        )}
      </button>
    </div>
  );
}
