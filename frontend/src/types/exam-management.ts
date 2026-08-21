export type QuestionType = "MULTIPLE_CHOICE" | "ESSAY" | "TRUE_FALSE";
export type QuizPlacementType = "STANDALONE_LESSON" | "INSIDE_LESSON" | "IN_VIDEO";
export type QuizType = "RANDOM_QUESTION" | "FIXED_QUESTION";

// ===== Quiz =====
export interface Quiz {
  quiz_id: string;
  subject_id: string;
  title: string;
  description?: string;
  duration_minutes: number;
  passing_percentage: number; // 🟢 Thay thế passing_score
  max_attempts: number;
  quiz_type: "FIXED_QUESTION" | "RANDOM_QUESTION";
  placement_type: QuizPlacementType;
  target_lesson_id?: string | null;
  is_active: boolean;
  is_peer_review: boolean;
  created_at?: string;
}

export interface QuizCreatePayload {
  title: string;
  description?: string;
  duration_minutes: number;
  passing_percentage: number; // 🟢 Thay thế passing_score
  max_attempts: number;
  quiz_type: string;
  placement_type: string;
  target_lesson_id?: string | null;
  is_peer_review?: boolean;
  is_active?: boolean;
}


// Khớp QuizUpdate (mọi field optional)
export interface QuizUpdatePayload {
  title?: string;
  description?: string;
  duration_minutes?: number;
  passing_percentage?: number;
  max_attempts?: number;
  placement_type?: QuizPlacementType;
  target_lesson_id?: string | null;
  is_active?: boolean;
  is_peer_review?: boolean;
}

// ===== Rubric (tiêu chí chấm - dùng cho câu tự luận) =====
export interface RubricItem {
  criteria_id: string;
  title: string;
  description?: string | null;
  percentage: number;
}

// ===== Question (Ngân hàng câu hỏi) =====
export interface Question {
  question_id: string;
  subject_id?: string;
  question_title: string;
  question_type: QuestionType;
  body_content?: string | null;
  max_points: number;
  rubric_criterias?: RubricItem[] | null;
}

// ===== QuestionPool =====
export interface QuestionPool {
  pool_id: string;
  subject_id: string;
  title: string;
  description: string;
  created_at: string;
  total_questions: number;
  question_ids: string[];
}

export interface QuestionPoolCreatePayload {
  subject_id: string;
  title: string;
  description: string;
}

export interface QuestionPoolUpdatePayload {
  title?: string;
  description?: string;
}

// ===== Chi tiết cấu hình câu hỏi trong 1 Quiz =====
export interface QuizFixedQuestionItem {
  question_id: string;
  order_index: number;
  video_trigger_seconds?: number | null;
  question: Question;
}

export interface QuizPoolRuleItem {
  rule_id: string;
  pool_id: string;
  quantity: number;
  pool_title: string;
  pool_total_questions: number;
}

export interface QuizDetail extends Quiz {
  fixed_questions: QuizFixedQuestionItem[];
  pool_rules: QuizPoolRuleItem[];
}