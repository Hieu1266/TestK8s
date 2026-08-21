export interface GeneralInfoInstructorSubject {
    subject_id: string;
    title: string;
    description: string;
    status_id: string;
    total_modules: number;
    total_lessons: number;
}

export interface SubjectInfoWithQuestions {
    subject_id: string;
    title: string;
    description: string;
    status_id: string;
    total_modules: number;
    total_questions: number | null;
}

export interface SubjectInfoWithQuizzes {
    subject_id: string;
    title: string;
    description: string;
    status_id: string;
    total_quizzes: number;
}