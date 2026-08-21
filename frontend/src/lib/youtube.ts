declare global {
    interface Window {
        YT: any;
        onYouTubeIframeAPIReady: () => void;
    }
}

export function extractYoutubeId(url: string): string | null {
    const match = url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
}

let youtubeApiPromise: Promise<void> | null = null;
export function loadYoutubeApi(): Promise<void> {
    if (typeof window === "undefined") return Promise.resolve();
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (youtubeApiPromise) return youtubeApiPromise;

    youtubeApiPromise = new Promise((resolve) => {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScript = document.getElementsByTagName("script")[0];
        firstScript.parentNode?.insertBefore(tag, firstScript);
        // Nếu đã có sẵn 1 nơi khác đăng ký onYouTubeIframeAPIReady rồi thì không ghi đè mất callback đó
        const previousCallback = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            previousCallback?.();
            resolve();
        };
    });
    return youtubeApiPromise;
}

/**
 * Thử lấy thời lượng (giây) của 1 video YouTube HOÀN TOÀN ở phía client,
 * bằng cách tạo 1 YT.Player ẩn (không hiển thị) rồi gọi getDuration().
 * Không cần YouTube Data API key.
 *
 * Trả về null nếu: video không tồn tại/riêng tư, chủ video tắt tính năng nhúng (embedding disabled),
 * hoặc quá thời gian chờ.
 */
export function probeYoutubeDuration(youtubeId: string): Promise<number | null> {
    return new Promise((resolve) => {
        loadYoutubeApi().then(() => {
            // Container ẩn hoàn toàn khỏi màn hình (không dùng display:none vì 1 số trình duyệt
            // không tính toán kích thước/khởi tạo player đúng cách với display:none)
            const container = document.createElement("div");
            container.style.position = "fixed";
            container.style.top = "-9999px";
            container.style.left = "-9999px";
            container.style.width = "1px";
            container.style.height = "1px";
            container.style.pointerEvents = "none";
            document.body.appendChild(container);

            let settled = false;
            let player: any = null;

            const finish = (value: number | null) => {
                if (settled) return;
                settled = true;
                clearTimeout(timeoutId);
                try {
                    player?.destroy?.();
                } catch {
                    // bỏ qua lỗi destroy
                }
                container.remove();
                resolve(value);
            };

            // An toàn: tránh treo mãi nếu video không phản hồi (mạng chậm, video riêng tư...)
            const timeoutId = setTimeout(() => finish(null), 8000);

            player = new window.YT.Player(container, {
                videoId: youtubeId,
                playerVars: { autoplay: 0, controls: 0, disablekb: 1 },
                events: {
                    onReady: (event: any) => {
                        // getDuration() đôi khi trả về 0 ngay lúc onReady vừa fire (metadata chưa kịp có) -> thử lại vài lần
                        let attempts = 0;
                        const tryGetDuration = () => {
                            const duration = event.target.getDuration?.() || 0;
                            attempts += 1;
                            if (duration > 0) {
                                finish(Math.round(duration));
                            } else if (attempts < 6) {
                                setTimeout(tryGetDuration, 400);
                            } else {
                                finish(null);
                            }
                        };
                        tryGetDuration();
                    },
                    // Mã lỗi 2: tham số không hợp lệ, 5: lỗi HTML5, 100: không tìm thấy/riêng tư,
                    // 101/150: chủ video tắt tính năng nhúng (embedding disabled)
                    onError: () => finish(null),
                },
            });
        });
    });
}