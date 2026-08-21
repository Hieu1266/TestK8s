import { CourseLearningStructure } from '@/types/course';

export const SUBJECT_ACCENTS = ['#5B5FEF', '#12B886', '#F2A93B', '#E5484D', '#0EA5E9'];

/** Lấy màu accent của một môn học dựa theo vị trí của nó trong khóa học */
export function getSubjectAccent(course: CourseLearningStructure | null, subjectId: string) {
  const idx = (course?.subjects.findIndex((s) => s.subject_id === subjectId) ?? 0) % SUBJECT_ACCENTS.length;
  return SUBJECT_ACCENTS[idx < 0 ? 0 : idx];
}

/** Định dạng số giây thành mm:ss */
export function formatSeconds(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const LAST_LESSON_KEY_PREFIX = 'course-learning:last-lesson:';

/** Lấy id bài học người dùng mở lần cuối trong khóa học này (lưu ở trình duyệt) */
export function getLastLessonId(courseId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(`${LAST_LESSON_KEY_PREFIX}${courseId}`);
  } catch {
    return null;
  }
}

/** Lưu lại id bài học vừa mở để hiển thị lại cho lần truy cập sau */
export function setLastLessonId(courseId: string, lessonId: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${LAST_LESSON_KEY_PREFIX}${courseId}`, lessonId);
  } catch {
    // Bỏ qua nếu trình duyệt chặn localStorage (chế độ ẩn danh, v.v.)
  }
}

const SIDEBAR_COLLAPSED_KEY = 'course-learning:sidebar-collapsed';

/** Lấy trạng thái thu gọn/mở rộng thanh sidebar mà người dùng đã chọn ở lần trước */
export function getSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

/** Lưu lại trạng thái thu gọn/mở rộng thanh sidebar để dùng cho lần truy cập sau */
export function setSidebarCollapsed(collapsed: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
  } catch {
    // Bỏ qua nếu trình duyệt chặn localStorage (chế độ ẩn danh, v.v.)
  }
}
