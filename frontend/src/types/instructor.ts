export interface Lesson {
  lesson_id: string;
  title: string;
  duration_minutes: number;
  video_url?: string;
  content_body?: string;
  order_index: number;
  is_optional: boolean;
}

export interface ModuleQuiz {
  quiz_id: string;
  title: string;
  description: string;
  duration_minutes: number;
  passing_score: number;
  max_attempts: number;
  is_active: boolean;
}

export interface Module {
  module_id: string;
  title: string;
  description: string;
  order_index: number;
}

export interface Subject {
  subject_id: string;
  title: string;
  course: string;
}
