import { SubjectLearningStructure } from '@/types/subjects';
import { LessonWithStatus } from './types';
import ModuleAccordion from './ModuleAccordion';

type SubjectAccordionProps = {
  subject: SubjectLearningStructure;
  subjectIndex: number;
  isExpanded: boolean;
  onToggleSubject: () => void;
  expandedModules: Record<string, boolean>;
  onToggleModule: (moduleId: string) => void;
  currentLessonId?: string;
  accentColor: string;
  onSelectLesson: (subject: SubjectLearningStructure, lesson: LessonWithStatus) => void;
};

/** Một môn học (thu gọn/mở rộng) chứa danh sách module, hiển thị trong sidebar */
export default function SubjectAccordion({
  subject,
  subjectIndex,
  isExpanded,
  onToggleSubject,
  expandedModules,
  onToggleModule,
  currentLessonId,
  accentColor,
  onSelectLesson,
}: SubjectAccordionProps) {
  return (
    <div className="rounded-2xl overflow-hidden bg-[#FBFBFD] border border-[#EFEFF5]">
      <button
        type="button"
        onClick={onToggleSubject}
        className="w-full text-left pl-4 pr-3 py-3 flex justify-between items-center gap-2 hover:bg-white transition-colors duration-200 relative group cursor-pointer"
      >
        <span className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: accentColor }} />
        <div className="space-y-0.5 min-w-0 flex-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider block" style={{ color: accentColor }}>
            Môn học {subjectIndex + 1}
          </span>
          <span className="text-sm font-bold text-[#2B2D3D] flex items-center gap-1.5 line-clamp-1">
            {subject.title}
          </span>
        </div>

        <div className="shrink-0 text-[#9195A8] group-hover:text-[#161826] transition-transform duration-200">
          <svg
            className={`w-4 h-4 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
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
          maxHeight: isExpanded ? '2000px' : '0px',
          opacity: isExpanded ? 1 : 0,
        }}
      >
        <div className="pb-2 px-2 space-y-1.5 pt-1">
          {subject.modules.map((mod, modIdx) => (
            <ModuleAccordion
              key={mod.module_id}
              mod={mod}
              moduleIndex={modIdx}
              subject={subject}
              isExpanded={!!expandedModules[mod.module_id]}
              onToggle={() => onToggleModule(mod.module_id)}
              currentLessonId={currentLessonId}
              accentColor={accentColor}
              onSelectLesson={onSelectLesson}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
