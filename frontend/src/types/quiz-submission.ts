import { SubmissionStatus } from "./statuses";
import { QuizType } from "./exam-management";
export enum QuestionType {
    MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
    ESSAY = "ESSAY",
    TRUE_FALSE = "TRUE_FALSE",
    FILL_IN_BLANK = "FILL_IN_BLANK",
}

export interface QuestionOption {
    option_id: string;
    option_text: string;
}

export interface QuizQuestion {
    detail_id: string;
    question_id: string;
    question_title: string;
    question_type: QuestionType;
    body_content: string | null;
    max_points: number;
    options: QuestionOption[];
    // 🆕 Mốc giây trong video mà câu hỏi này được kích hoạt (null nếu quiz không phải IN_VIDEO)
    video_trigger_seconds?: number | null;
    // 🆕 Dùng khi resume submission IN_PROGRESS đang dang dở (vd load lại trang giữa video)
    selected_option_id?: string | null;
    // 🆕 true/false nếu câu đã được chấm, null nếu chưa trả lời hoặc là ESSAY
    is_answered_correct?: boolean | null;
}

export interface QuizTakeResponse {
    submission_id: string;
    quiz_id: string;
    title: string;
    quiz_type: string;
    attempt_number: number;
    questions: QuizQuestion[];
}

export interface SubmissionDetailUpdatePayload {
    selected_option_id?: string | null;
    essay_answer_text?: string | null;
}

export interface SubmissionDetailUpdateResponse {
    message: string;
    detail_id: string;
    selected_option_id: string | null;
    essay_answer_text: string | null;
}

export interface QuizSubmitResponse {
    message: string;
    submission_id: string;
    status: string;
    is_passed: boolean;
    total_score: number;
    next_lesson_unlocked: boolean;
}

export interface SubmissionStatusOption {
    option_id: string;
    option_text: string;
    is_correct?: boolean | null; // Chỉ có khi status = GRADED
}

export interface SubmissionStatusDetail {
    detail_id: string;
    question_id: string;
    question_title: string;
    question_type: QuestionType;
    video_trigger_seconds?: number | null;
    body_content?: string | null;
    max_points?: number | null;
    options: SubmissionStatusOption[];
    selected_option_id?: string | null;
    essay_answer_text?: string | null;
    graph_json_data?: string | null;
    graph_image_url?: string | null;
    score_earned?: number | null;     // Chỉ có khi status = GRADED
    teacher_feedback?: string | null; // Chỉ có khi status = GRADED
}

export interface QuizSubmissionStatusResponse {
    submission_id: string;
    quiz_id: string;
    title?: string | null;
    quiz_type?: string | null;
    status: SubmissionStatus;
    attempt_number: number;
    started_at: string;
    total_score?: number | null;
    is_peer_review?: boolean | null;
    is_passed?: boolean | null;
    questions: SubmissionStatusDetail[];
}

export interface QuizStatusActionResult {
    success: boolean;
    data?: QuizSubmissionStatusResponse | null; // null nghĩa là chưa từng làm bài
    error?: string;
}

export interface QuizSubmissionSummary {
    quiz_id: string;
    subject_id: string;
    title: string;
    description: string | null;
    duration_minutes: number;
    quiz_type: QuizType;
    is_active: boolean;
    total_submissions: number;
    pending_gradings: number;
    graded_count: number;
}

export interface QuizUserSummaryItem {
    user_id: string;
    username: string;
    email: string;
    total_submissions: number;
    pending_gradings: number;
    latest_submitted_at: string | null;
}

export interface UserSubmissionItem {
    submission_id: string;
    quiz_id: string;
    user_id: string;
    total_score: number | null;
    max_score: number | null
    status: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';
    started_at: string;
    submitted_at: string | null;
}

export interface QuestionOptionDetail {
    option_id: string;
    option_text: string;
    is_correct: boolean;
}

export interface SubmissionAnswerDetail {
    detail_id: string;
    question_id: string;
    question_text: string;
    body_content?: string | null; // 🆕 Nội dung câu có chỗ trống (dùng cho FILL_IN_BLANK)
    question_type: string;
    max_score: number;
    score_earned: number | null;
    selected_option_id: string | null;
    essay_answer_text: string | null;
    graph_json_data: string | null;
    graph_image_url: string | null;
    teacher_feedback: string | null;
    options: QuestionOptionDetail[];
}

export interface QuizSubmissionDetail {
    submission_id: string;
    quiz_id: string;
    quiz_title: string;
    user_id: string;
    username: string;
    email: string;
    score: number | null;
    max_possible_score: number;
    status: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';
    started_at: string;
    submitted_at: string | null;
    answers: SubmissionAnswerDetail[];
}

export interface QuestionGradingPayload {
    detail_id: string;
    score_earned: number;
    teacher_feedback?: string;
}