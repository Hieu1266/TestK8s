"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Presentation,
} from "lucide-react";

interface LessonSlideViewerProps {
  lessonId: string;
  lessonTitle: string;
  content: string;
  hasPreviousLesson: boolean;
  hasNextLesson: boolean;
  onPreviousLesson: () => void;
  onNextLesson: () => void;
}

export default function LessonSlideViewer({
  lessonId,
  lessonTitle,
  content,
  hasPreviousLesson,
  hasNextLesson,
  onPreviousLesson,
  onNextLesson,
}: LessonSlideViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const previousLessonHandlerRef = useRef(onPreviousLesson);
  const nextLessonHandlerRef = useRef(onNextLesson);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Giữ callback mới nhất mà không phải gắn lại sự kiện bàn phím mỗi lần render.
  useEffect(() => {
    previousLessonHandlerRef.current = onPreviousLesson;
    nextLessonHandlerRef.current = onNextLesson;
  }, [onPreviousLesson, onNextLesson]);

  // Theo dõi trạng thái toàn màn hình.
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === viewerRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Chuyển lesson trong cùng module bằng phím mũi tên.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;

      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (event.key === "ArrowLeft" && hasPreviousLesson) {
        event.preventDefault();
        previousLessonHandlerRef.current();
      }

      if (event.key === "ArrowRight" && hasNextLesson) {
        event.preventDefault();
        nextLessonHandlerRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [hasPreviousLesson, hasNextLesson]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await viewerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Không thể chuyển chế độ toàn màn hình:", error);
      setIsFullscreen(false);
    }
  };

  const lessonContent = content.trim()
    ? content
    : "<p>Bài học này chưa có nội dung.</p>";

  return (
    <div
      ref={viewerRef}
      className="overflow-hidden rounded-3xl border border-slate-200 bg-[#101321] shadow-xl fullscreen:rounded-none"
    >
      {/* Thanh tiêu đề */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600">
            <Presentation size={18} />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{lessonTitle}</p>

            <p className="text-[11px] font-medium text-white/55">
              Bài giảng trình chiếu
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleFullscreen}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-white/75 transition hover:bg-white/10 hover:text-white"
          aria-label={
            isFullscreen ? "Thoát toàn màn hình" : "Trình chiếu toàn màn hình"
          }
          title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>

      {/* Một lesson tương ứng với một slide */}
      <div className="flex min-h-0 flex-1 flex-col bg-slate-100 p-3 sm:p-5 fullscreen:h-[calc(100vh-64px)]">
        <div
          className={`relative mx-auto flex w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-xl ${
            isFullscreen
              ? "aspect-video flex-1"
              : "h-[clamp(360px,calc(100vh-230px),640px)] min-h-0"
          }`}
        >
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-indigo-600 via-blue-500 to-cyan-400" />

          <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-indigo-50" />

          <div className="pointer-events-none absolute -bottom-28 -left-24 h-64 w-64 rounded-full bg-cyan-50" />

          <div className="relative z-10 flex h-full w-full flex-col overflow-auto px-[12%] py-[6%] sm:px-[10%]">
            <div className="mb-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600 sm:text-xs">
              <span className="h-2 w-2 rounded-full bg-indigo-600" />
              Nội dung bài học
            </div>

            <div
              key={lessonId}
              className="lesson-slide-enter lesson-slide-content my-auto text-slate-800"
              dangerouslySetInnerHTML={{ __html: lessonContent }}
            />
          </div>

          {/* Ở chế độ thường, giữ nút chuyển lesson luôn trong tầm nhìn. */}
          {!isFullscreen && (
            <>
              <button
                type="button"
                onClick={onPreviousLesson}
                disabled={!hasPreviousLesson}
                className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-lg backdrop-blur transition hover:scale-105 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100 sm:left-5"
                aria-label="Bài học trước"
                title="Bài học trước"
              >
                <ChevronLeft size={21} />
              </button>

              <button
                type="button"
                onClick={onNextLesson}
                disabled={!hasNextLesson}
                className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition hover:scale-105 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100 sm:right-5"
                aria-label="Bài học tiếp theo"
                title="Bài học tiếp theo"
              >
                <ChevronRight size={21} />
              </button>
            </>
          )}
        </div>

        {/* Giữ bố cục điều hướng cũ khi trình chiếu toàn màn hình. */}
        <div
          className={`mx-auto mt-4 w-full max-w-6xl items-center justify-between ${
            isFullscreen ? "flex" : "hidden"
          }`}
        >
          <button
            type="button"
            onClick={onPreviousLesson}
            disabled={!hasPreviousLesson}
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Bài học trước"
            title="Bài học trước"
          >
            <ChevronLeft size={21} />
          </button>

          <button
            type="button"
            onClick={onNextLesson}
            disabled={!hasNextLesson}
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Bài học tiếp theo"
            title="Bài học tiếp theo"
          >
            <ChevronRight size={21} />
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes lesson-slide-enter {
          from {
            opacity: 0;
            transform: translateX(22px) scale(0.995);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        .lesson-slide-enter {
          animation: lesson-slide-enter 220ms ease-out both;
          will-change: opacity, transform;
        }

        @media (prefers-reduced-motion: reduce) {
          .lesson-slide-enter {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
