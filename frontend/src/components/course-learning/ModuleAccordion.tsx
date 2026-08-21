import { ModuleLearningStructure } from '@/types/modules';
import { SubjectLearningStructure } from '@/types/subjects';
import { LessonWithStatus } from './types';
import LessonRow from './LessonRow';

type ModuleAccordionProps = {
  mod: ModuleLearningStructure;
  moduleIndex: number;
  subject: SubjectLearningStructure;
  isExpanded: boolean;
  onToggle: () => void;
  currentLessonId?: string;
  accentColor: string;
  onSelectLesson: (subject: SubjectLearningStructure, lesson: LessonWithStatus) => void;
};

/** Một module (thu gọn/mở rộng) chứa danh sách bài học, nằm trong 1 môn học */
export default function ModuleAccordion({
  mod,
  moduleIndex,
  subject,
  isExpanded,
  onToggle,
  currentLessonId,
  accentColor,
  onSelectLesson,
}: ModuleAccordionProps) {
  return (
    <div className="bg-white rounded-xl border border-[#F0F0F5] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-3.5 py-2.5 flex justify-between items-center transition-colors duration-200 hover:bg-[#FAFAFD] rounded-xl cursor-pointer"
      >
        <span className="text-xs font-bold text-[#3E4054] line-clamp-1">
          Module {moduleIndex + 1}. {mod.title}
        </span>

        <div className="shrink-0 text-[#B0B3C4]">
          <svg
            className={`w-3.5 h-3.5 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      <div
        className="transition-all duration-300 ease-in-out overflow-hidden"
        style={{
          maxHeight: isExpanded ? '1000px' : '0px',
          opacity: isExpanded ? 1 : 0,
        }}
      >
        <div className="pb-2 px-2 space-y-1">
          {mod.lessons.map((lessonItem) => {
            const lesson = lessonItem as LessonWithStatus;
            return (
              <LessonRow
                key={lesson.lesson_id}
                lesson={lesson}
                isSelected={currentLessonId === lesson.lesson_id}
                accentColor={accentColor}
                onSelect={() => onSelectLesson(subject, lesson)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
