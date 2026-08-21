import { LessonStatus } from "./statuses";
import { Question } from "./quizzes";

export interface UserLessonNote {
    note_id: string;
    timestamp_seconds: number | null;
    content: string;
    created_at: string;
    updated_at: string;
}

export interface LessonProgress {
    progressId: string;
    userId: string;
    courseId: string;
    lessonId: string;
    status: LessonStatus;
    quizPassed: boolean;
    highestQuizScore?: number;
    successfulSubmissionId?: string;
    updatedAt: string;
}

export interface VideoCheckpointQuestion {
    checkpointId: string;
    lessonId: string;
    triggerAtSecond: number;
    question: Question;
}

export interface VideoProgress {
    video_progress_id: string;
    user_id: string;
    lesson_id: string;
    duration_seconds: number;
    last_watched_second: number;
    max_watched_second: number;
    completion_percentage: number; // đúng tên cột trong video_progress.py
    is_finished: boolean;
    current_points: number;
}

export interface NoteCreatePayload {
    course_id: string;
    lesson_id: string;
    timestamp_seconds?: number | null;
    content: string;
}

export interface NoteUpdatePayload {
    content?: string;
    timestamp_seconds?: number | null;
}
