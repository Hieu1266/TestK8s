'use client';

import React, { useState, useEffect, useCallback } from 'react';
import LessonVideoPlayer from './LessonVideoPlayer';
import { QuizQuestion } from '@/types/quiz-submission';
import { VideoProgress } from '@/types/video';
import { SubmissionStatus } from '@/types/statuses';
import {
    startQuizSubmissionAction,
    updateSubmissionDetailAction,
    submitQuestionAction,
    submitQuizAction,
    getQuizStatusByLessonAction,
} from '@/actions/getQuizSubmission';

export interface InVideoQuizWrapperProps {
    lessonId: string;
    videoData: {
        url: string;
        progressId: string;
        initialProgress?: VideoProgress;
    };
    onProgressUpdate?: (progress: VideoProgress) => void;
    onVideoEnded?: () => void;
    onTimeUpdate?: (seconds: number) => void;
    seekToSeconds?: number | null;
    onSeeked?: () => void;
}

export const InVideoQuizWrapper: React.FC<InVideoQuizWrapperProps> = ({
    lessonId,
    videoData,
    onProgressUpdate,
    onVideoEnded,
    onTimeUpdate,
    seekToSeconds: externalSeekTo,
    onSeeked
}) => {
    const [submissionId, setSubmissionId] = useState<string | null>(null);
    const [inVideoQuestions, setInVideoQuestions] = useState<QuizQuestion[]>([]);
    const [activeQuestion, setActiveQuestion] = useState<QuizQuestion | null>(null);
    const [answeredQuestionIds, setAnsweredQuestionIds] = useState<string[]>([]);
    const [isVideoPaused, setIsVideoPaused] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [internalSeekTo, setInternalSeekTo] = useState<number | null>(null);
    const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

    // 🆕 1. Thêm State đánh dấu video đã kết thúc
    const [isVideoEnded, setIsVideoEnded] = useState<boolean>(false);

    useEffect(() => {
        let cancelled = false;

        const initializeQuiz = async () => {
            try {
                // ---- Bước 1: Kiểm tra trạng thái đã lưu trước, KHÔNG tạo lượt làm bài mới ngay ----
                // getQuizStatusByLessonAction chỉ đọc trạng thái, không tạo submission mới.
                const statusRes = await getQuizStatusByLessonAction(lessonId);
                if (cancelled) return;

                const savedStatus = statusRes.success ? statusRes.data : undefined;

                // Nếu bài thi trong video này đã NỘP (SUBMITTED) hoặc đã CHẤM (GRADED) từ trước,
                // nghĩa là người dùng đã hoàn tất toàn bộ câu hỏi ở lượt xem trước đó.
                // Không được gọi startQuizSubmissionAction ở đây, vì action đó dùng để bắt đầu
                // lượt làm bài MỚI (giống nút "Làm lại bài thi"), sẽ khiến câu hỏi bị hỏi lại
                // từ đầu mỗi khi xem lại video. Ta chỉ cần để video phát tự do, không bẫy câu hỏi nữa.
                if (
                    savedStatus &&
                    (savedStatus.status === SubmissionStatus.SUBMITTED || savedStatus.status === SubmissionStatus.GRADED)
                ) {
                    setSubmissionId(null);
                    setInVideoQuestions([]);
                    setAnsweredQuestionIds([]);
                    return;
                }

                // ---- Bước 2: Chưa từng làm bài (data null), hoặc đang làm dở (IN_PROGRESS) ----
                // startQuizSubmissionAction trong 2 trường hợp này sẽ tạo lượt đầu tiên hoặc khôi phục
                // đúng lượt IN_PROGRESS đang dang dở (kèm is_answered_correct từng câu để không hỏi lại
                // những câu đã trả lời đúng trong cùng lượt đó).
                const res = await startQuizSubmissionAction(lessonId);
                if (cancelled) return;

                if (res.success && res.data) {
                    setSubmissionId(res.data.submission_id);

                    const questions = res.data.questions || [];
                    setInVideoQuestions(questions);

                    const alreadyAnsweredIds = questions
                        .filter((q) => q.is_answered_correct === true)
                        .map((q) => q.detail_id);

                    setAnsweredQuestionIds(alreadyAnsweredIds);
                } else {
                    console.error('Không thể tạo bài thi:', res.error);
                }
            } catch (error) {
                console.error('Lỗi khi khởi tạo In-video Quiz:', error);
            }
        };

        if (lessonId) {
            initializeQuiz();
        }

        return () => {
            cancelled = true;
        };
    }, [lessonId]);

    // --- Logic bẫy thời gian & kiểm soát Tua/Phát Video ---
    const handleTimeUpdate = useCallback((seconds: number) => {
        if (onTimeUpdate) {
            onTimeUpdate(seconds);
        }

        // 🆕 2. Nếu video đã kết thúc hoặc không có câu hỏi -> Dừng kiểm tra bẫy thời gian
        // (inVideoQuestions rỗng bao gồm cả trường hợp bài thi đã SUBMITTED/GRADED từ trước)
        if (isVideoEnded || !inVideoQuestions || inVideoQuestions.length === 0) return;

        const currentSecond = Math.floor(seconds);

        if (activeQuestion && activeQuestion.video_trigger_seconds !== null && activeQuestion.video_trigger_seconds !== undefined) {
            const triggerSec = Math.floor(activeQuestion.video_trigger_seconds);

            if (currentSecond < triggerSec) {
                if (isModalVisible) {
                    setIsModalVisible(false);
                    setErrorMessage(null);
                }
                return;
            }
        }

        const pendingQuestions = inVideoQuestions.filter(
            (q) =>
                q.video_trigger_seconds !== null &&
                q.video_trigger_seconds !== undefined &&
                !answeredQuestionIds.includes(q.detail_id) &&
                q.is_answered_correct !== true
        );

        if (pendingQuestions.length === 0) return;

        // 🆕 3. Bẫy câu hỏi đúng mốc giây hoặc câu bị bỏ lỡ gần nhất (chưa vượt quá mốc)
        const missedQuestion = pendingQuestions.find(
            (q) => Math.floor(q.video_trigger_seconds!) === currentSecond
        );

        if (missedQuestion) {
            setActiveQuestion(missedQuestion);
            setIsModalVisible(true);
            setIsVideoPaused(true);
        }
    }, [inVideoQuestions, answeredQuestionIds, activeQuestion, isModalVisible, isVideoEnded, onTimeUpdate]);

    // --- Xử lý Tự động nộp toàn bộ Quiz khi Video kết thúc ---
    const handleVideoEnded = async () => {
        // 🆕 4. Đánh dấu đã kết thúc video và đóng modal câu hỏi (nếu đang bật)
        setIsVideoEnded(true);
        setIsModalVisible(false);
        setActiveQuestion(null);

        // submissionId chỉ khác null khi lượt làm bài hiện tại thực sự đang mở (mới tạo hoặc
        // IN_PROGRESS được khôi phục ở trên). Nếu bài đã SUBMITTED/GRADED từ trước, submissionId
        // đã được set về null nên khối này sẽ tự động được bỏ qua, tránh nộp lại một bài đã xong.
        if (submissionId) {
            try {
                const res = await submitQuizAction(submissionId);
                if (!res.success) {
                    console.error('Lỗi khi hoàn tất nộp bài thi:', res.error);
                }
            } catch (error) {
                console.error('Lỗi hệ thống khi nộp bài thi cuối cùng:', error);
            }
        }

        if (onVideoEnded) {
            onVideoEnded();
        }
    };

    const handleRewind = (secondsToRewind: number = 10) => {
        if (!activeQuestion || activeQuestion.video_trigger_seconds === null || activeQuestion.video_trigger_seconds === undefined) return;

        const targetTime = Math.max(0, activeQuestion.video_trigger_seconds - secondsToRewind);

        setIsVideoEnded(false); // Reset trạng thái nếu người dùng tua lại xem tiếp
        setInternalSeekTo(targetTime);
        setIsModalVisible(false);
        setIsVideoPaused(false);
        setErrorMessage(null);
    };

    const handleAnswerSubmit = async (selectedOptionId: string) => {
        if (!activeQuestion || isSubmitting) return;

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const updateRes = await updateSubmissionDetailAction(activeQuestion.detail_id, {
                selected_option_id: selectedOptionId
            });

            if (!updateRes.success) {
                setErrorMessage(updateRes.error || 'Không thể lưu đáp án. Vui lòng thử lại!');
                return;
            }

            const submitRes = await submitQuestionAction(activeQuestion.detail_id);

            if (submitRes.success && submitRes.data) {
                const isCorrect = submitRes.data.is_correct;

                if (isCorrect) {
                    setAnsweredQuestionIds((prev) => [...prev, activeQuestion.detail_id]);
                    setActiveQuestion(null);
                    setIsModalVisible(false);
                    setIsVideoPaused(false);
                    setErrorMessage(null);
                } else {
                    setErrorMessage('Rất tiếc, đáp án chưa chính xác! Bạn hãy chọn lại hoặc tua lại video để xem gợi ý.');
                }
            } else {
                setErrorMessage(submitRes.error || 'Lỗi hệ thống khi chấm điểm!');
            }
        } catch (error) {
            console.error('Lỗi hệ thống khi nộp câu trả lời:', error);
            setErrorMessage('Có lỗi xảy ra khi kết nối tới máy chủ!');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative w-full h-full">
            <LessonVideoPlayer
                lessonId={lessonId}
                videoProgressId={videoData.progressId}
                url={videoData.url}
                initialProgress={videoData.initialProgress}
                onProgressUpdate={onProgressUpdate}
                onVideoEnded={handleVideoEnded}
                onTimeUpdate={handleTimeUpdate}
                seekToSeconds={internalSeekTo !== null ? internalSeekTo : externalSeekTo}
                onSeeked={() => {
                    setInternalSeekTo(null);
                    if (onSeeked) onSeeked();
                }}
                isPaused={isVideoPaused}
            />

            {activeQuestion && isModalVisible && !isVideoEnded && (
                <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] pointer-events-none transition-all">
                    <div className="bg-white p-6 sm:p-8 rounded-2xl w-[90%] max-w-lg shadow-2xl pointer-events-auto border border-gray-100 max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <span className="inline-block px-3 py-1 text-xs font-semibold text-[#5B5FEF] bg-[#5B5FEF]/10 rounded-full">
                                Câu hỏi tại mốc {activeQuestion.video_trigger_seconds}s
                            </span>

                            <button
                                type="button"
                                onClick={() => handleRewind(10)}
                                className="flex items-center space-x-1 text-xs font-medium text-gray-500 hover:text-[#5B5FEF] bg-gray-100 hover:bg-[#5B5FEF]/10 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                                </svg>
                                <span>Tua lại 10s</span>
                            </button>
                        </div>

                        <div className="mb-5 space-y-2">
                            {activeQuestion.question_title && (
                                <h3 className="text-lg font-bold text-gray-900 leading-relaxed">
                                    {activeQuestion.question_title}
                                </h3>
                            )}

                            {activeQuestion.body_content && (
                                <div
                                    className="text-sm sm:text-base text-gray-700 leading-relaxed prose max-w-none"
                                    dangerouslySetInnerHTML={{ __html: activeQuestion.body_content }}
                                />
                            )}

                            {!activeQuestion.question_title && !activeQuestion.body_content && (
                                <h3 className="text-lg font-bold text-gray-900 leading-relaxed">
                                    {(activeQuestion as any).content || 'Vui lòng chọn đáp án đúng:'}
                                </h3>
                            )}
                        </div>

                        <div className="flex flex-col space-y-3">
                            {activeQuestion.options?.map((option) => (
                                <button
                                    key={option.option_id}
                                    disabled={isSubmitting}
                                    className="p-3.5 text-left border-2 border-gray-100 rounded-xl hover:border-[#5B5FEF] hover:bg-[#5B5FEF]/5 active:scale-[0.99] transition-all font-medium text-gray-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => handleAnswerSubmit(option.option_id)}
                                >
                                    {option.option_text}
                                </button>
                            ))}
                        </div>

                        {errorMessage && (
                            <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2.5 animate-fadeIn">
                                <svg className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-xs sm:text-sm font-medium text-rose-700 leading-snug">
                                    {errorMessage}
                                </span>
                            </div>
                        )}

                        {isSubmitting && (
                            <div className="mt-4 text-center text-xs text-gray-500 font-medium animate-pulse">
                                Đang kiểm tra đáp án...
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default InVideoQuizWrapper;
