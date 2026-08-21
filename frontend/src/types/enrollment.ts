/**
 * Interface đại diện cho thông tin thống kê chung về đăng ký khóa học của học viên
 */
export interface GeneralUserEnrollmentInfo {
    inprogress_courses: number; // Số lượng khóa học đang trong tiến trình (chưa hoàn thành)
    completed_courses: number;  // Số lượng khóa học đã hoàn thành
    certificate: number;        // Số lượng chứng chỉ đạt được
}

/**
 * Interface đại diện cho một khóa học đang trong tiến trình hoặc đã hoàn thành
 */
export interface CourseInProgress {
    course_id: string;               // UUID của khóa học dưới dạng string
    course_title: string;            // Tiêu đề/Tên của khóa học
    current_overall_progress: number; // Tiến trình học tập hiện tại (kiểu float/double ở backend, ví dụ: 70.5)
    is_completed: boolean;           // Trạng thái đã hoàn thành hay chưa
}