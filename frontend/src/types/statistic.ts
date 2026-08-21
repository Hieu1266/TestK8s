
export interface InstructorStatistics {
    total_subjects: number;
    total_modules: number;
    total_active_subject: number;
    total_developing_subject: number;
}

export interface Subject {
    subject_id: string;
    title: string;
    description: string;
    moduleCount: number;
    quizCount: number;
    status: "SUBJECT_DEVELOPING" | "SUBJECT_ACTIVE" | "SUBJECT_SUSPENDED";
}