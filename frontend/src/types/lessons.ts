import { Quiz } from "./quizzes";
import { VideoCheckpointQuestion } from "./progresses";
import { LessonStatus } from "./statuses";
import { SubmissionStatus } from "./statuses";

export interface LessonResource {
  resourceId: string;
  lessonId: string;
  fileName: string;
  filePath: string;
  fileExtension: string; // pdf, zip, docx...
}

export interface Lesson {
  lessonId: string;
  moduleId: string;
  title: string;
  videoUrl?: string; // có giá trị => bài giảng dạng VIDEO; để trống => bài giảng dạng ĐỌC (reading)
  durationMinutes: number;
  contentBody?: string; // với bài giảng đọc: đây là toàn bộ nội dung; với bài giảng video: là phần tóm tắt/ghi chú kèm theo
  orderIndex: number;
  isOptional: boolean;
  isSlidePresentation?: boolean;
  resources: LessonResource[];
  quiz?: Quiz; // bài kiểm tra gắn trong bài học (placementType: INSIDE_LESSON), nếu có
  videoCheckpoints?: VideoCheckpointQuestion[]; // câu hỏi kiểm tra chèn vào giữa video, nếu là bài giảng VIDEO
}

export interface LessonLearningStructure {
  title: string;
  lesson_id: string;
  video_url?: string | null;
  content_body?: string | null;
  duration_seconds: number;
  is_optional: boolean;
  is_slide_presentation: boolean;
  had_quiz: boolean;
  is_quiz: boolean;
  submit_status: SubmissionStatus | null;
}

export interface LessonStatusResponse {
  lesson_id: string;
  status: LessonStatus; // LOCKED | IN_PROGRESS | COMPLETED
}

export interface LessonResource {
  resource_id: string;
  lesson_id: string;
  file_name: string;
  file_path: string;
  file_extension: string;
}

// Khớp với LessonManagementOut ở Backend - dùng cho trang Quản lý bài học
export interface LessonManagement {
  lesson_id: string;
  module_id: string;
  title: string;
  video_url?: string | null;
  content_body?: string | null;
  duration_seconds: number;
  order_index: number;
  is_optional: boolean;
  is_slide_presentation: boolean;
  is_quiz: boolean;
  resources: LessonResource[];
}

// Payload gửi lên khi tạo bài học (khớp LessonCreate)
export interface LessonCreatePayload {
  module_id: string;
  title: string;
  video_url?: string | null;
  content_body?: string | null;
  duration_seconds?: number | null;
  order_index: number;
  is_optional?: boolean | null;
  is_slide_presentation?: boolean;
  is_quiz?: boolean | null;
}

// Payload gửi lên khi cập nhật bài học (khớp LessonUpdate)
// ⚠️ Không có is_quiz: Backend không cho phép đổi is_quiz sau khi tạo.
export interface LessonUpdatePayload {
  title?: string;
  video_url?: string | null;
  duration_seconds?: number | null;
  content_body?: string | null;
  order_index?: number;
  is_optional?: boolean | null;
  is_slide_presentation?: boolean;
}

export interface LessonResourceItem {
  resource_id: string;
  lesson_id: string;
  file_name: string;
  file_path: string;
  file_extension: string;
  created_at?: string;
}

export interface LessonShort {
  lesson_id: string;
  title: string;
}
