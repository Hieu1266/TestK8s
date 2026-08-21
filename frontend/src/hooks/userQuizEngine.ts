'use client';

import { useState, useCallback } from 'react';
// Import trực tiếp các Interface chuẩn từ file types của bạn
import { QuizTakeResponse, QuizQuestion } from '@/types/quiz-submission';
import {
    startQuizSubmissionAction,
    updateSubmissionDetailAction,
    submitQuestionAction,
    submitQuizAction
} from '@/actions/getQuizSubmission';

export function useQuizEngine(lessonId: string) {
    // Sử dụng QuizTakeResponse chuẩn làm kiểu dữ liệu chính cho State
    const [submission, setSubmission] = useState<QuizTakeResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmittingId, setIsSubmittingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // 1. Khởi tạo hoặc Resume bài thi
    const startQuiz = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await startQuizSubmissionAction(lessonId);

            if (res.success && res.data) {
                // Đã khớp với cấu trúc QuizTakeResponse
                setSubmission(res.data);
            } else {
                setError(res.error || 'Không thể khởi tạo bài thi.');
            }
        } catch (err: any) {
            setError(err.message || 'Lỗi hệ thống khi lấy dữ liệu bài thi.');
        } finally {
            setIsLoading(false);
        }
    }, [lessonId]);

    // 2. Nộp 1 câu hỏi (Dùng cho In-Video Quiz)
    const submitSingleAnswer = useCallback(async (detailId: string, optionId: string) => {
        if (!submission) return null;
        setIsSubmittingId(detailId);
        setError(null);

        try {
            // Bước 1: Lưu đáp án được chọn (PATCH /submission-details/{detail_id})
            const updateRes = await updateSubmissionDetailAction(detailId, {
                selected_option_id: optionId
            });

            if (!updateRes.success) {
                throw new Error(updateRes.error || 'Lỗi khi lưu đáp án.');
            }

            // Bước 2: Chấm điểm câu hỏi (POST /submission-details/submit-question/{detail_id})
            const submitRes = await submitQuestionAction(detailId);

            if (submitRes.success && submitRes.data) {
                const isCorrect = submitRes.data.is_correct;

                // Cập nhật State với kiểu QuizQuestion
                setSubmission((prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        questions: prev.questions.map((q: QuizQuestion) =>
                            q.detail_id === detailId
                                ? { ...q, selected_option_id: optionId, is_answered_correct: isCorrect }
                                : q
                        )
                    };
                });

                return isCorrect;
            } else {
                throw new Error(submitRes.error || 'Lỗi khi chấm điểm câu hỏi.');
            }
        } catch (err: any) {
            const errorMsg = err.message || 'Lỗi hệ thống khi nộp câu trả lời.';
            setError(errorMsg);
            return false;
        } finally {
            setIsSubmittingId(null);
        }
    }, [submission]);

    // 3. Nộp toàn bộ bài thi
    const submitFinalQuiz = useCallback(async () => {
        if (!submission) return false;
        setIsLoading(true);
        setError(null);

        try {
            const res = await submitQuizAction(submission.submission_id);

            if (res.success) {
                return true;
            } else {
                setError(res.error || 'Lỗi khi nộp bài thi cuối cùng.');
                return false;
            }
        } catch (err: any) {
            setError(err.message || 'Lỗi hệ thống khi nộp bài thi.');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [submission]);

    return {
        submission,
        isLoading,
        isSubmittingId,
        error,
        startQuiz,
        submitSingleAnswer,
        submitFinalQuiz
    };
}