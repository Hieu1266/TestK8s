export interface VideoProgress {
    video_progress_id: string;
    lesson_id?: string;
    duration_seconds?: number;
    last_watched_second: number;
    max_watched_second: number;
    completion_percentage: number;
    is_finished: boolean;
    current_points?: number;
}

// Payload gửi lên khi gọi POST /video_progress/get-or-create
export interface VideoProgressLookupPayload {
    lesson_id: string;
    duration_seconds: number;
}

// Payload gửi lên khi gọi PATCH /video_progress/{video_progress_id}
export interface VideoProgressUpdatePayload {
    duration_seconds?: number;
    last_watched_second?: number;
    max_watched_second?: number;
    completion_percentage?: number;
    is_finished?: boolean;
    current_points?: number;
}

