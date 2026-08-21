export enum CourseType {
    LONG_TERM = 'LONG_TERM',
    SHORT_TERM = 'SHORT_TERM',
}


export enum QuizType {
    FIXED_QUESTION = 'FIXED_QUESTION',
    RANDOM_QUESTION = 'RANDOM_QUESTION',
}

export enum QuizPlacementType {
    STANDALONE_LESSON = 'STANDALONE_LESSON', // Là một bài học độc lập trong module
    INSIDE_LESSON = 'INSIDE_LESSON',         // Đính kèm hiển thị bên trong một bài đọc
    IN_VIDEO = 'IN_VIDEO',                   // Nhúng vào mốc thời gian cụ thể của video
}

export enum QuestionType {
    MULTIPLE_CHOICE = 'MULTIPLE_CHOICE', // Trắc nghiệm (một hoặc nhiều đáp án)
    ESSAY = 'ESSAY',                     // Tự luận (hỗ trợ text, LaTeX, đồ thị)
    TRUE_FALSE = "TRUE_FALSE",
    FILL_IN_BLANK = "FILL_IN_BLANK"
}



