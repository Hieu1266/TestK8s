import { QuestionType, QuizPlacementType, QuizType } from "./types";
import { RubricCriteria } from "./examinations";

export interface QuestionOption {
    optionId: string;
    optionText: string;
}

export interface Question {
    questionId: string;
    subjectId: string;
    questionTitle: string;
    questionType: QuestionType;
    bodyContent: string;
    maxPoints: number;
    options?: QuestionOption[];
}

export interface Quiz {
    quizId: string;
    subjectId: string;
    title: string;
    description?: string;
    durationMinutes: number;
    passingScore: number;
    maxAttempts: number;
    quizType: QuizType;
    placementType: QuizPlacementType;
    targetLessonId?: string;
    isActive: boolean;
    isPeerReviewed: boolean; // true nếu đề có câu tự luận cần chấm chéo
    questions: Question[];
    rubricCriterias: RubricCriteria[];
}


