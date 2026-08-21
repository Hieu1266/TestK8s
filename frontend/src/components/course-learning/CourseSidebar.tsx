import { CourseLearningStructure } from '@/types/course';
import { SubjectLearningStructure } from '@/types/subjects';
import { LessonWithStatus } from './types';
import { getSubjectAccent } from './helpers';
import SubjectAccordion from './SubjectAccordion';

type CourseSidebarProps = {
  course: CourseLearningStructure;
  expandedSubjects: Record<string, boolean>;
  expandedModules: Record<string, boolean>;
  onToggleSubject: (subjectId: string) => void;
  onToggleModule: (moduleId: string) => void;
  isAllExpanded: boolean;
  onToggleAll: () => void;
  completedCount: number;
  totalLessons: number;
  currentLessonId?: string;
  onSelectLesson: (subject: SubjectLearningStructure, lesson: LessonWithStatus) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
};

/** Sidebar bên trái: tiêu đề khóa học, tiến độ và cây môn học / module / bài học. Có thể thu gọn thành thanh hẹp. */
export default function CourseSidebar({
  course,
  expandedSubjects,
  expandedModules,
  onToggleSubject,
  onToggleModule,
  isAllExpanded,
  onToggleAll,
  completedCount,
  totalLessons,
  currentLessonId,
  onSelectLesson,
  collapsed,
  onToggleCollapse,
}: CourseSidebarProps) {
  const progressPercent = totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div
      className={`relative h-full min-h-0 border-r border-[#ECEAF0] bg-white flex flex-col shrink-0 transition-[width] duration-300 ease-in-out ${
        collapsed ? 'w-16' : 'w-[22rem]'
      }`}
    >
      {/* Nút thu gọn / mở rộng thanh sidebar, luôn hiển thị ở mép phải */}
      <button
        type="button"
        onClick={onToggleCollapse}
        title={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
        aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
        className="absolute -right-3 top-6 z-10 w-6 h-6 rounded-full bg-white border border-[#ECEAF0] shadow-sm flex items-center justify-center text-[#565A70] hover:text-[#5B5FEF] hover:border-[#5B5FEF] transition-colors"
      >
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {collapsed ? (
        /* --- CHẾ ĐỘ THU GỌN: chỉ hiện % tiến độ và chấm màu từng môn học --- */
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col items-center gap-3 pt-14 pb-4 px-2">
          <div
            className="w-9 h-9 rounded-full border-2 border-[#EEF0FE] flex items-center justify-center text-[10px] font-bold text-[#5B5FEF] shrink-0"
            title={`${completedCount}/${totalLessons} bài học đã hoàn thành`}
          >
            {progressPercent}%
          </div>
          <div className="w-6 border-t border-[#ECEAF0]" />
          <div className="flex flex-col items-center gap-2.5">
            {course.subjects.map((subject) => (
              <button
                key={subject.subject_id}
                type="button"
                onClick={() => {
                  onToggleCollapse();
                  if (!expandedSubjects[subject.subject_id]) onToggleSubject(subject.subject_id);
                }}
                title={subject.title}
                aria-label={subject.title}
                className="w-3 h-3 rounded-full shrink-0 hover:scale-125 transition-transform"
                style={{ backgroundColor: getSubjectAccent(course, subject.subject_id) }}
              />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Phần tiêu đề: đứng yên, không cuộn theo danh sách bài học */}
          <div className="shrink-0 p-5 border-b border-[#ECEAF0] bg-[#FBFBFD]">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-display text-base font-bold text-[#161826] line-clamp-2 leading-snug">
                {course.title}
              </h2>
              <button
                type="button"
                onClick={onToggleAll}
                className="shrink-0 text-xs font-bold text-[#5B5FEF] hover:bg-[#EEF0FE] px-2.5 py-1 rounded-md transition-colors"
                title={isAllExpanded ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}
              >
                {isAllExpanded ? 'Thu gọn' : 'Mở rộng'}
              </button>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-xs font-semibold text-[#565A70]">
              <span>Đã hoàn thành</span>
              <span className="text-[#5B5FEF] font-bold tabular-nums">{completedCount}/{totalLessons} bài học</span>
            </div>
          </div>

          {/* Danh sách môn học / bài học: có thanh cuộn riêng, độc lập với phần nội dung bên phải */}
          <div className="flex-1 min-h-0 overflow-y-auto py-3 px-3 space-y-2">
            {course.subjects.map((subject, subIdx) => (
              <SubjectAccordion
                key={subject.subject_id}
                subject={subject}
                subjectIndex={subIdx}
                isExpanded={!!expandedSubjects[subject.subject_id]}
                onToggleSubject={() => onToggleSubject(subject.subject_id)}
                expandedModules={expandedModules}
                onToggleModule={onToggleModule}
                currentLessonId={currentLessonId}
                accentColor={getSubjectAccent(course, subject.subject_id)}
                onSelectLesson={onSelectLesson}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
