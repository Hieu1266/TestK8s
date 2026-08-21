import type { TagName } from "@/types/tag";

/**
 * Thông tin khóa học kèm danh sách Tag đã được gán.
 *
 * Dùng cho:
 * GET /course-tag-link/get-course-list
 */
export interface CourseTagItem {
  course_id: string;
  title: string;
  description?: string | null;

  price?: number;
  course_type?: string;

  /*
   * Backend hiện tại đang trả:
   * tags: string[]
   *
   * Ví dụ:
   * ["Python", "Backend", "Cơ bản"]
   */
  tags: string[];
}

/**
 * Dữ liệu gửi đến backend khi lưu toàn bộ Tag của khóa học.
 *
 * Dùng cho:
 * PUT /course-tag-link/update-tags
 */
export interface CourseTagAssignmentUpdate {
  course_id: string;
  tag_ids: string[];
}

/**
 * Kết quả backend trả về sau khi cập nhật Tag.
 */
export interface CourseTagUpdateResult {
  status: string;
  message: string;
  added_count: number;
  removed_count: number;
  total_tags: number;
}

/**
 * Kết quả chuẩn được Server Action trả về cho page.tsx.
 */
export interface CourseTagActionResponse {
  success: boolean;
  message: string;
  data?: CourseTagUpdateResult;
}

/**
 * Danh sách Tag đã gán cho một khóa học.
 *
 * Dùng cho:
 * GET /course-tag-link/get-tag-list/{course_id}
 */
export type AssignedCourseTag = TagName;
