"use client"
import { useEffect, useRef, useState } from "react";
import { VideoProgress } from "@/types/video";

interface VideoTrackingProps {
    progressData: VideoProgress;
    onProgressUpdate?: (updatedProgress: Partial<VideoProgress>) => void; // Callback đồng bộ tiến độ về DB khi đang học
}

export default function VideoTracking({ progressData, onProgressUpdate }: VideoTrackingProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    // States quản lý dữ liệu động được tải về từ API thông qua video_progress_id
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [lessonId, setLessonId] = useState<string | null>(null);
    const [isLoadingVideo, setIsLoadingVideo] = useState<boolean>(true);

    // Sử dụng Ref để theo dõi mốc thời gian xem lớn nhất của học viên
    const maxTimeRef = useRef<number>(progressData.max_watched_second || 0);

    // Cờ kiểm soát trạng thái dừng thông minh khi người dùng tab out khỏi trình duyệt
    const isPausedBySystemRef = useRef<boolean>(false);

    // ==========================================
    // 1. LUỒNG GỌI API ĐỂ LẤY ĐƯỜNG DẪN VIDEO & LESSON ID
    // ==========================================
    useEffect(() => {
        const fetchVideoSource = async () => {
            try {
                setIsLoadingVideo(true);

                // Giả lập hoặc thay thế bằng hàm fetch/axios thực tế của bạn:
                // const res = await fetch(`/api/progress/${progressData.video_progress_id}`);
                // const data = await res.json();

                // Khai báo dữ liệu mẫu dựa trên nghiệp vụ phản hồi kỳ vọng:
                const mockApiResponse = {
                    lesson_id: "lesson_123_sample",
                    video_url: "https://www.w3schools.com/html/mov_bbb.mp4" // Đường dẫn video thật
                };

                // Cập nhật State hệ thống sau khi lấy dữ liệu thành công
                setLessonId(mockApiResponse.lesson_id);
                setVideoUrl(mockApiResponse.video_url);
            } catch (error) {
                console.error("Lỗi khi tải thông tin bài học và luồng phát video:", error);
            } finally {
                setIsLoadingVideo(false);
            }
        };

        if (progressData.video_progress_id) {
            fetchVideoSource();
        }
    }, [progressData.video_progress_id]);

    // ==========================================
    // 2. LUỒNG KIỂM SOÁT TIẾN TRÌNH VÀ HÀNH VI TUA VIDEO
    // ==========================================
    useEffect(() => {
        const video = videoRef.current;
        // Chỉ kích hoạt bộ lắng nghe sự kiện khi đối tượng video đã được tải xong đường dẫn URL
        if (!video || !videoUrl) return;

        // Khôi phục mốc thời gian xem gần nhất nếu tài khoản chưa hoàn thành video bài học này
        if (progressData.last_watched_second > 0 && !progressData.is_finished) {
            video.currentTime = progressData.last_watched_second;
        }

        const handleTimeUpdate = () => {
            // NẾU ĐÃ HOÀN THÀNH: Cho phép học viên xem tự do, không can thiệp logic
            if (progressData.is_finished) return;

            if (!video.seeking) {
                if (video.currentTime > maxTimeRef.current) {
                    // Ngăn chặn các hành vi gian lận can thiệp tăng tốc độ hoặc gián đoạn luồng phát (> 2 giây)
                    if (video.currentTime - maxTimeRef.current < 2) {
                        maxTimeRef.current = video.currentTime;

                        // Kích hoạt callback bắn ngược dữ liệu ra ngoài để lưu vào Database
                        if (onProgressUpdate) {
                            const percentage = Math.min((maxTimeRef.current / video.duration) * 100, 100);
                            onProgressUpdate({
                                last_watched_second: video.currentTime,
                                max_watched_second: maxTimeRef.current,
                                complete_percentage: parseFloat(percentage.toFixed(2)),
                                is_finished: percentage >= 95 // Quy định xem trên 95% thời lượng là hoàn thành
                            });
                        }
                    }
                }
            }
        };

        const handleSeeking = () => {
            if (progressData.is_finished) return;

            // Nếu người dùng cố tình tua vọt qua phân đoạn chưa từng xem qua
            if (video.currentTime > maxTimeRef.current) {
                console.log(`Chặn hành vi tua vượt! Ép trả về mốc tiến độ lớn nhất: ${maxTimeRef.current}s`);
                video.currentTime = maxTimeRef.current; // Giật thanh điều hướng về mốc cũ
            }
        };

        const handleLoseFocus = () => {
            if (video && !video.paused && !video.seeking) {
                video.pause();
                isPausedBySystemRef.current = true;
                console.log("Tự động tạm dừng video do người dùng chuyển tab hoặc ẩn trình duyệt.");
            }
        };

        const handleGainFocus = () => {
            if (video && video.paused && isPausedBySystemRef.current) {
                video.play().catch(err => console.log(err.message));
                isPausedBySystemRef.current = false;
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden) handleLoseFocus();
            else handleGainFocus();
        };

        // Gán sự kiện cho thẻ video
        video.addEventListener("timeupdate", handleTimeUpdate);
        video.addEventListener("seeking", handleSeeking);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleLoseFocus);
        window.addEventListener("focus", handleGainFocus);

        // Giải phóng tài nguyên
        return () => {
            video.removeEventListener("timeupdate", handleTimeUpdate);
            video.removeEventListener("seeking", handleSeeking);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleLoseFocus);
            window.removeEventListener("focus", handleGainFocus);
        };
    }, [videoUrl, progressData, onProgressUpdate]);

    return (
        <div className="w-full max-w-4xl mx-auto p-4">
            {/* Thanh hiển thị trạng thái học tập */}
            <div className="mb-3 flex items-center justify-between text-xs font-medium text-gray-400">
                <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${progressData.is_finished ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
                    <span>
                        Trạng thái: {progressData.is_finished ? (
                            <span className="text-green-400 font-semibold">Đã hoàn thành (Được tự do tua video)</span>
                        ) : (
                            <span className="text-amber-400">Đang học (Chặn tua tiến vượt đoạn)</span>
                        )}
                    </span>
                </div>
                {!progressData.is_finished && videoUrl && (
                    <div>Mốc học lớn nhất đạt được: <span className="font-mono text-gray-200">{maxTimeRef.current.toFixed(1)}s</span></div>
                )}
            </div>

            {/* Trình phát Video / Trạng thái Loading */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl bg-black border border-gray-800 flex items-center justify-center">
                {isLoadingVideo ? (
                    <div className="text-center space-y-2 text-sm text-gray-400">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p>Đang xác thực thông tin và tải bài học...</p>
                    </div>
                ) : videoUrl ? (
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        controls={true} // Giữ controls để học viên có thể tua lùi xem lại kiến thức cũ
                        controlsList="nodownload" // Chặn tải video bừa bãi
                        className="w-full h-full object-contain"
                        data-lesson-id={lessonId} // Lưu trữ ngầm lesson_id lên DOM nếu cần dùng cho tác vụ khác
                    />
                ) : (
                    <div className="text-sm text-red-400 p-4 text-center">
                        ❌ Không thể khởi tạo luồng phát video. Mã tiến trình không hợp lệ hoặc lỗi kết nối máy chủ!
                    </div>
                )}
            </div>
        </div>
    );
}