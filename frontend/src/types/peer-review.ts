// Mirrors app/models/enum.py::ReviewStatus.
// NOTE: nếu dự án đã có enum này trong '@/types/statuses', hãy xóa định nghĩa
// dưới đây và import từ đó thay vì khai báo lại.
export enum ReviewStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    SKIPPED = 'SKIPPED',
}

// ---------------------------------------------------------------------------
// Danh sách bài được giao cho học viên (reviewer) chấm chéo
// ---------------------------------------------------------------------------
export interface MyAssignment {
    assignment_id: string;
    quiz_id: string;
    submission_id: string;
    status: ReviewStatus;
    final_score_given: number | null;
    assigned_at: string;
    completed_at: string | null;
}

// ---------------------------------------------------------------------------
// Chi tiết 1 lượt chấm: câu trả lời tự luận cần chấm kèm rubric tương ứng
// ---------------------------------------------------------------------------
export interface RubricCriteria {
    criteria_id: string;
    title: string;
    description: string | null;
    percentage: number;
}

export interface EssayAnswer {
    question_id: string;
    question_title: string;
    body_content: string;
    max_points: number;

    essay_answer_text: string | null;
    graph_image_url: string | null;
    graph_json_data: string | null;
    video_trigger_seconds: number | null;

    rubric_criterias: RubricCriteria[];
}

export interface AssignmentDetail extends MyAssignment {
    quiz_title: string;
    general_comment: string | null;
    answers: EssayAnswer[];
}

// ---------------------------------------------------------------------------
// Nộp kết quả chấm chéo
// ---------------------------------------------------------------------------
export interface EvaluationItemPayload {
    criteria_id: string;
    score: number;
    feedback?: string | null;
}

export interface SubmitEvaluationPayload {
    evaluations: EvaluationItemPayload[];
    general_comment?: string | null;
}

export interface EvaluationItem {
    evaluation_id: string;
    criteria_id: string;
    score: number;
    feedback: string | null;
}

export interface SubmitEvaluationResponse {
    assignment_id: string;
    status: ReviewStatus;
    final_score_given: number;
    general_comment: string | null;
    completed_at: string;
    evaluations: EvaluationItem[];

    // Trạng thái tổng hợp phía submission sau khi lượt chấm này được ghi nhận
    submission_fully_reviewed: boolean;
    submission_peer_avg_score: number | null;
    submission_is_discrepant: boolean | null;
}

// ---------------------------------------------------------------------------
// [Giảng viên] Bài nộp chấm chéo bị lệch điểm, cần chấm lại
// ---------------------------------------------------------------------------
export interface QuizPeerReviewInfo {
    quiz_id: string;
    title: string;
    is_peer_review: boolean;
}

export interface SubmissionListItem {
    submission_id: string;
    quiz_id: string;
    user_id: string;
    attempt_number: number;
    status: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';
    is_peer_review: boolean;
    is_discrepant: boolean;
    peer_avg_score: number | null;
    completed_review_count: number;
    total_score: number | null;
    is_passed: boolean | null;
    started_at: string;
    submitted_at: string | null;
}