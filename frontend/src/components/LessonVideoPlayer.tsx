"use client";

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { VideoProgress } from "@/types/video";
import { extractYoutubeId, loadYoutubeApi } from "@/lib/youtube";

export interface VideoPlayerRef {
    pause: () => void;
    play: () => void;
}

interface LessonVideoPlayerProps {
    lessonId: string;
    videoProgressId: string;
    url: string;
    title?: string;
    initialProgress?: VideoProgress;
    onProgressUpdate?: (updatedProgress: VideoProgress) => void;
    onTimeUpdate?: (seconds: number) => void;
    seekToSeconds?: number | null;
    onSeeked?: () => void;
    onVideoEnded?: () => void;
    isPaused?: boolean; // THÊM THUỘC TÍNH NÀY
}

const SESSION_KEY_PREFIX = "lesson_video_progress:";
const MAX_FORWARD_JUMP = 2; // Nới lỏng khoảng cách tua cho phép
const YOUTUBE_POLL_MS = 1000;

function readSessionProgress(lessonId: string): VideoProgress | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.sessionStorage.getItem(SESSION_KEY_PREFIX + lessonId);
        return raw ? (JSON.parse(raw) as VideoProgress) : null;
    } catch {
        return null;
    }
}

function writeSessionProgress(lessonId: string, progress: VideoProgress) {
    if (typeof window === "undefined") return;
    try {
        window.sessionStorage.setItem(SESSION_KEY_PREFIX + lessonId, JSON.stringify(progress));
    } catch { }
}

const LessonVideoPlayer = forwardRef<VideoPlayerRef, LessonVideoPlayerProps>(({
    lessonId,
    videoProgressId,
    url,
    title,
    initialProgress,
    onProgressUpdate,
    onTimeUpdate,
    seekToSeconds,
    onSeeked,
    onVideoEnded,
    isPaused, // LẤY PROPS isPaused TỪ COMPONENT CHA
}, ref) => {
    const youtubeId = extractYoutubeId(url);
    const nativeVideoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const ytPlayerRef = useRef<any>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [ytReady, setYtReady] = useState(false);

    // Lưu các callback vào Ref để tránh re-trigger useEffect khi component cha re-render
    const callbacksRef = useRef({ onProgressUpdate, onTimeUpdate, onVideoEnded });
    useEffect(() => {
        callbacksRef.current = { onProgressUpdate, onTimeUpdate, onVideoEnded };
    });

    // Kho tiến trình
    const startingProgressRef = useRef<VideoProgress>(
        readSessionProgress(lessonId) ||
        initialProgress || {
            video_progress_id: videoProgressId,
            last_watched_second: 0,
            max_watched_second: 0,
            completion_percentage: 0,
            is_finished: false,
        }
    );

    const maxTimeRef = useRef<number>(startingProgressRef.current.max_watched_second || 0);
    const isFinishedRef = useRef<boolean>(startingProgressRef.current.is_finished || false);
    const hasRestoredPositionRef = useRef(false);
    const isPausedBySystemRef = useRef(false);

    const [displayMaxTime, setDisplayMaxTime] = useState(maxTimeRef.current);
    const [displayFinished, setDisplayFinished] = useState(isFinishedRef.current);

    // EXPOSE HÀM ĐIỀU KHIỂN CHO COMPONENT CHA (CÁCH CŨ DÙNG REF)
    useImperativeHandle(ref, () => ({
        pause: () => {
            if (youtubeId && ytPlayerRef.current?.pauseVideo) {
                ytPlayerRef.current.pauseVideo();
            } else if (nativeVideoRef.current) {
                nativeVideoRef.current.pause();
            }
        },
        play: () => {
            if (youtubeId && ytPlayerRef.current?.playVideo) {
                ytPlayerRef.current.playVideo();
            } else if (nativeVideoRef.current) {
                nativeVideoRef.current.play().catch(() => { });
            }
        }
    }));

    // ============================================
    // THEO DÕI PROP isPaused TỪ IN-VIDEO QUIZ
    // ============================================
    useEffect(() => {
        if (isPaused) {
            // Khi InVideoQuizWrapper yêu cầu dừng
            if (youtubeId && ytReady && ytPlayerRef.current?.pauseVideo) {
                ytPlayerRef.current.pauseVideo();
            } else if (!youtubeId && nativeVideoRef.current) {
                nativeVideoRef.current.pause();
            }
        } else if (isPaused === false) {
            // Khi InVideoQuizWrapper yêu cầu phát tiếp
            if (youtubeId && ytReady && ytPlayerRef.current?.playVideo) {
                ytPlayerRef.current.playVideo();
            } else if (!youtubeId && nativeVideoRef.current) {
                nativeVideoRef.current.play().catch(() => { });
            }
        }
    }, [isPaused, youtubeId, ytReady]);

    // Reset trôi chảy khi đổi bài học
    useEffect(() => {
        const currentProg = readSessionProgress(lessonId) || initialProgress || {
            video_progress_id: videoProgressId,
            last_watched_second: 0,
            max_watched_second: 0,
            completion_percentage: 0,
            is_finished: false,
        };

        startingProgressRef.current = currentProg;
        maxTimeRef.current = currentProg.max_watched_second || 0;
        isFinishedRef.current = currentProg.is_finished || false;
        hasRestoredPositionRef.current = false;
        isPausedBySystemRef.current = false;

        setDisplayMaxTime(maxTimeRef.current);
        setDisplayFinished(isFinishedRef.current);
    }, [lessonId, url, videoProgressId]);

    const emitProgress = useCallback(
        (currentTime: number, duration: number) => {
            if (isFinishedRef.current) return;
            if (currentTime <= maxTimeRef.current) return;

            maxTimeRef.current = currentTime;
            const percentage = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;
            const finished = duration > 0 && currentTime >= duration - 0.5;
            isFinishedRef.current = finished;

            setDisplayMaxTime(currentTime);
            setDisplayFinished(finished);

            const roundedTime = finished ? Math.round(duration) : Math.floor(currentTime);

            const updated: VideoProgress = {
                video_progress_id: videoProgressId,
                last_watched_second: roundedTime,
                max_watched_second: roundedTime,
                completion_percentage: finished ? 100 : parseFloat(percentage.toFixed(2)),
                is_finished: finished,
                duration_seconds: duration > 0 ? Math.round(duration) : undefined,
            };

            writeSessionProgress(lessonId, updated);
            callbacksRef.current.onProgressUpdate?.(updated);
        },
        [lessonId, videoProgressId]
    );

    // ============================================
    // 1. VIDEO MP4 GỐC
    // ============================================
    useEffect(() => {
        if (youtubeId) return;
        const video = nativeVideoRef.current;
        if (!video) return;

        const handleLoadedMetadata = () => {
            if (!hasRestoredPositionRef.current && startingProgressRef.current.last_watched_second > 0 && !isFinishedRef.current) {
                video.currentTime = startingProgressRef.current.last_watched_second;
            }
            hasRestoredPositionRef.current = true;
        };

        const handleTimeUpdate = () => {
            callbacksRef.current.onTimeUpdate?.(video.currentTime);
            if (isFinishedRef.current || video.seeking) return;
            emitProgress(video.currentTime, video.duration || 0);
        };

        const handleEnded = () => {
            if (!isFinishedRef.current) {
                const finalDuration = video.duration || maxTimeRef.current;
                maxTimeRef.current = finalDuration;
                isFinishedRef.current = true;
                setDisplayMaxTime(finalDuration);
                setDisplayFinished(true);

                const updated: VideoProgress = {
                    video_progress_id: videoProgressId,
                    last_watched_second: Math.round(finalDuration),
                    max_watched_second: Math.round(finalDuration),
                    completion_percentage: 100,
                    is_finished: true,
                    duration_seconds: video.duration ? Math.round(video.duration) : undefined,
                };

                writeSessionProgress(lessonId, updated);
                callbacksRef.current.onProgressUpdate?.(updated);
            }

            callbacksRef.current.onVideoEnded?.();
        };

        // Chặn tua vượt mốc nhưng cho phép buffer nới lỏng 2s
        const handleSeeking = () => {
            if (isFinishedRef.current) return;
            if (video.currentTime > maxTimeRef.current + MAX_FORWARD_JUMP) {
                video.currentTime = maxTimeRef.current;
            }
        };

        const handleLoseFocus = () => {
            if (video && !video.paused && !video.seeking) {
                video.pause();
                isPausedBySystemRef.current = true;
            }
        };

        const handleGainFocus = () => {
            if (video && video.paused && isPausedBySystemRef.current) {
                video.play().catch(() => { });
                isPausedBySystemRef.current = false;
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden) handleLoseFocus();
            else handleGainFocus();
        };

        video.addEventListener("loadedmetadata", handleLoadedMetadata);
        video.addEventListener("timeupdate", handleTimeUpdate);
        video.addEventListener("seeking", handleSeeking);
        video.addEventListener("ended", handleEnded);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleLoseFocus);
        window.addEventListener("focus", handleGainFocus);

        return () => {
            video.removeEventListener("loadedmetadata", handleLoadedMetadata);
            video.removeEventListener("timeupdate", handleTimeUpdate);
            video.removeEventListener("seeking", handleSeeking);
            video.removeEventListener("ended", handleEnded);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleLoseFocus);
            window.removeEventListener("focus", handleGainFocus);
        };
    }, [lessonId, url, youtubeId, emitProgress]);

    // ============================================
    // 2. YOUTUBE
    // ============================================
    useEffect(() => {
        if (!youtubeId) return;
        let cancelled = false;

        loadYoutubeApi().then(() => {
            if (cancelled || !containerRef.current) return;

            ytPlayerRef.current = new window.YT.Player(containerRef.current, {
                videoId: youtubeId,
                playerVars: { rel: 0, playsinline: 1 },
                events: {
                    onReady: () => {
                        setYtReady(true);
                        if (startingProgressRef.current.last_watched_second > 0 && !isFinishedRef.current) {
                            ytPlayerRef.current.seekTo(startingProgressRef.current.last_watched_second, true);
                        }
                    },
                    onStateChange: (event: any) => {
                        if (event.data === 0) { // Kết thúc
                            if (!isFinishedRef.current) {
                                const player = ytPlayerRef.current;
                                const finalDuration = player?.getDuration?.() || maxTimeRef.current;
                                maxTimeRef.current = finalDuration;
                                isFinishedRef.current = true;
                                setDisplayMaxTime(finalDuration);
                                setDisplayFinished(true);

                                const updated: VideoProgress = {
                                    video_progress_id: videoProgressId,
                                    last_watched_second: Math.round(finalDuration),
                                    max_watched_second: Math.round(finalDuration),
                                    completion_percentage: 100,
                                    is_finished: true,
                                    duration_seconds: finalDuration ? Math.round(finalDuration) : undefined,
                                };

                                writeSessionProgress(lessonId, updated);
                                callbacksRef.current.onProgressUpdate?.(updated);
                            }

                            callbacksRef.current.onVideoEnded?.();
                        }
                    },
                },
            });
        });

        return () => {
            cancelled = true;
            if (pollRef.current) clearInterval(pollRef.current);
            ytPlayerRef.current?.destroy?.();
            ytPlayerRef.current = null;
            setYtReady(false);
        };
    }, [lessonId, url, youtubeId]);

    // Poll thời gian YouTube
    useEffect(() => {
        if (!youtubeId || !ytReady) return;

        pollRef.current = setInterval(() => {
            const player = ytPlayerRef.current;
            if (!player?.getCurrentTime) return;

            const currentTime: number = player.getCurrentTime();
            const duration: number = player.getDuration?.() || 0;

            callbacksRef.current.onTimeUpdate?.(currentTime);

            if (isFinishedRef.current) return;

            if (currentTime > maxTimeRef.current + MAX_FORWARD_JUMP) {
                player.seekTo(maxTimeRef.current, true);
                return;
            }

            emitProgress(currentTime, duration);
        }, YOUTUBE_POLL_MS);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [youtubeId, ytReady, emitProgress]);

    // Tua video khi có yêu cầu từ bên ngoài
    useEffect(() => {
        if (seekToSeconds === null || seekToSeconds === undefined) return;

        maxTimeRef.current = Math.max(maxTimeRef.current, seekToSeconds);

        if (youtubeId) {
            if (ytReady && ytPlayerRef.current?.seekTo) {
                ytPlayerRef.current.seekTo(seekToSeconds, true);
                ytPlayerRef.current.playVideo?.();
                onSeeked?.();
            }
        } else if (nativeVideoRef.current) {
            nativeVideoRef.current.currentTime = seekToSeconds;
            nativeVideoRef.current.play().catch(() => { });
            onSeeked?.();
        }
    }, [seekToSeconds, ytReady]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    return (
        <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-[11px] font-medium text-[#8A8FA3] px-0.5">
                <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${displayFinished ? "bg-[#12B886]" : "bg-[#F2A93B] animate-pulse"}`} />
                    <span>
                        {displayFinished ? (
                            <span className="text-[#12B886] font-semibold">Đã hoàn thành (được tự do tua video)</span>
                        ) : (
                            <span className="text-[#9A6B00]">Đang học (không thể tua vượt phần chưa xem)</span>
                        )}
                    </span>
                </div>
                {!displayFinished && (
                    <span>
                        Mốc học lớn nhất: <span className="font-mono text-[#4B4E60]">{formatTime(displayMaxTime)}</span>
                    </span>
                )}
            </div>

            {youtubeId ? (
                <div key={lessonId} className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-sm">
                    <div ref={containerRef} className="w-full h-full" data-lesson-id={lessonId} />
                </div>
            ) : (
                <div key={lessonId} className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-sm">
                    <video
                        key={url}
                        ref={nativeVideoRef}
                        src={url}
                        controls
                        controlsList="nodownload"
                        className="w-full h-full object-contain"
                        data-lesson-id={lessonId}
                    >
                        Trình duyệt của bạn không hỗ trợ xem video trực tiếp.
                    </video>
                </div>
            )}
        </div>
    );
});

LessonVideoPlayer.displayName = "LessonVideoPlayer";
export default LessonVideoPlayer;