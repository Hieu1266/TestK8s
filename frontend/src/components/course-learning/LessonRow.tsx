import { LessonStatus } from '@/types/statuses';
import { LessonWithStatus } from './types';
import QuizStatusBadge from './QuizStatusBadge';

type LessonRowProps = {
  lesson: LessonWithStatus;
  isSelected: boolean;
  accentColor: string;
  onSelect: () => void;
};

/** Một dòng bài học trong cây thư mục bên trái */
export default function LessonRow({ lesson, isSelected, accentColor, onSelect }: LessonRowProps) {
  const isLocked = lesson.status === LessonStatus.LOCKED;
  const isWaitingGrading = lesson.submit_status === 'SUBMITTED';
  const isCompleted = lesson.status === LessonStatus.COMPLETED && !isWaitingGrading;

  return (
    <button
      type="button"
      disabled={isLocked}
      onClick={onSelect}
      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 flex items-center gap-2.5 cursor-pointer ${isSelected
        ? 'bg-[#EEF0FE] text-[#3F3FC9] font-bold shadow-sm'
        : isLocked
          ? 'opacity-40 cursor-not-allowed'
          : 'hover:bg-[#FAFAFD] hover:translate-x-0.5 text-[#4B4E60]'
        }`}
    >
      <span className="shrink-0 relative w-4 h-4 flex items-center justify-center">
        {isCompleted ? (
          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white font-extrabold" style={{ backgroundColor: '#12B886' }}>✓</span>
        ) : isSelected ? (
          <span className="w-3.5 h-3.5 rounded-full anim-pulse-ring" style={{ backgroundColor: '#5B5FEF' }} />
        ) : (
          <span className="w-3.5 h-3.5 rounded-full border-2" style={{ borderColor: accentColor }} />
        )}
      </span>

      <span className="flex-1 line-clamp-2 leading-relaxed">
        {lesson.title}
      </span>

      {lesson.is_optional && (
        <span
          className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200"
          title="Bài học không bắt buộc"
        >
          Tùy chọn
        </span>
      )}

      {(lesson.is_quiz || lesson.had_quiz) && <QuizStatusBadge submitStatus={lesson.submit_status} />}
    </button>
  );
}
