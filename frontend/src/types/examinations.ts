import { SubmissionStatus, ReviewStatus } from "./statuses";

export interface RubricCriteria {
    criteriaId: string;
    quizId: string;
    title: string;
    description?: string;
    maxScore: number;
}


export interface SubmissionDetail {
    detailId: string;
    submissionId: string;
    questionId: string;
    selectedOptionId?: string;
    essayAnswerText?: string;
    scoreEarned?: number;
    teacherFeedback?: string;
}

export interface QuizSubmission {
    submissionId: string;
    quizId: string;
    userId: string;
    attemptNumber: number;
    status: SubmissionStatus;
    startedAt: string;
    submittedAt?: string;
    peerAvgScore?: number;
    isDiscrepant: boolean;
    completedReviewCount: number;
    requiredReviewCount: number;
    totalScore?: number;
    isPassed?: boolean;
    details: SubmissionDetail[];
}


export interface PeerReviewEvaluation {
    evaluationId: string;
    assignmentId: string;
    criteriaId: string;
    score: number;
    feedback?: string;
}

// Bài chấm chéo được giao CHO học viên hiện tại đi chấm bài của người khác
export interface PeerReviewAssignment {
    assignmentId: string;
    quizId: string;
    reviewerId: string;
    submissionId: string;
    submissionOwnerLabel: string; // hiển thị ẩn danh, VD "Học viên #A21"
    quizTitle: string;
    lessonTitle: string;
    status: ReviewStatus;
    finalScoreGiven?: number;
    generalComment?: string;
    assignedAt: string;
    dueAt: string;
    essayAnswerText?: string;
    evaluations: PeerReviewEvaluation[];
}
