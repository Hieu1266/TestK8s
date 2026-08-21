"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Focus,
  RotateCcw,
  NotebookPen,
  PanelRightClose,
  CheckCircle2,
  Circle,
  PanelLeftClose,
  PanelLeftOpen,
  Presentation as PresentationIcon,
} from "lucide-react";

import { getPresentationByLessonAction } from "@/actions/getPresentation";
import AnnotatedContent from "@/components/AnnotatedContent";
import LessonNotesPanel from "@/components/LessonNotesPanel";
import { getLessonNotesAction } from "@/actions/getNotes";
import { UserLessonNote } from "@/types/progresses";

interface ViewerSlide {
  slide_id: string;
  title?: string | null;
  content_body: string;
  slide_order: number;
}

interface ViewerPresentation {
  slides: ViewerSlide[];
}

type SlideDirection = "next" | "previous";

interface PresentationPreferences {
  notesPanelOpen: boolean;
  notesPanelWidth: number;
  slideOutlineOpen: boolean;
}

const MIN_ZOOM = 60;
const MAX_ZOOM = 180;
const ZOOM_STEP = 10;

const MIN_NOTES_PANEL_WIDTH = 280;
const DEFAULT_NOTES_PANEL_WIDTH = 360;
const MAX_NOTES_PANEL_WIDTH = 620;

interface PresentationViewerProps {
  courseId: string;
  lessonId: string;
  lessonTitle?: string;

  isFocusMode?: boolean;
  onFocusModeChange?: (isFocused: boolean) => void;

  onSlideProgressChange?: (hasViewedAllSlides: boolean) => void;
}

export default function PresentationViewer({
  courseId,
  lessonId,
  lessonTitle,
  isFocusMode = false,
  onFocusModeChange,
  onSlideProgressChange,
}: PresentationViewerProps) {
  const [presentation, setPresentation] = useState<ViewerPresentation | null>(
    null,
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<SlideDirection>("next");
  const [viewedSlideCount, setViewedSlideCount] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [notesPanelOpen, setNotesPanelOpen] = useState(false);

  const [slideNotes, setSlideNotes] = useState<UserLessonNote[]>([]);

  const [slideNotesLoading, setSlideNotesLoading] = useState(false);
  const [notesPanelWidth, setNotesPanelWidth] = useState(
    DEFAULT_NOTES_PANEL_WIDTH,
  );
  const [slideOutlineOpen, setSlideOutlineOpen] = useState(false);

  const [isResizingNotes, setIsResizingNotes] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const preferencesStorageKey = `lumer:presentation-preferences:${courseId}`;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const viewerRef = useRef<HTMLElement | null>(null);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);
  const activeOutlineItemRef = useRef<HTMLButtonElement | null>(null);
  const notesResizeStartRef = useRef<{
    startX: number;
    startWidth: number;
  } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Đánh dấu đã báo lên component cha là học viên xem hết slide chưa,
  // tránh gọi callback lặp lại nhiều lần không cần thiết.
  const notifiedAllRef = useRef(false);

  // Lưu các slide học viên đã thực sự mở. Nhờ vậy, việc bấm thẳng
  // tới slide cuối sẽ không được tính là đã xem hết bài trình chiếu.
  const viewedSlideIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let active = true;

    const loadPresentation = async () => {
      setLoading(true);
      setError(null);
      setCurrentIndex(0);
      setViewedSlideCount(0);
      setZoomLevel(100);
      setSlideNotes([]);
      setSlideNotesLoading(false);
      setIsResizingNotes(false);
      notesResizeStartRef.current = null;
      notifiedAllRef.current = false;
      viewedSlideIdsRef.current = new Set();

      const result = await getPresentationByLessonAction(lessonId);

      if (!active) {
        return;
      }

      if (!result.success || !result.data) {
        setPresentation(null);
        setError(result.error || "Không thể tải nội dung trình chiếu.");
        setLoading(false);

        // Lỗi tải dữ liệu không nên khóa học viên lại, coi như đã "xem xong".
        notifiedAllRef.current = true;
        onSlideProgressChange?.(true);
        return;
      }

      const sortedSlides = [...result.data.slides].sort(
        (first, second) => first.slide_order - second.slide_order,
      );

      setPresentation({
        ...result.data,
        slides: sortedSlides,
      });

      if (sortedSlides.length === 0) {
        // Không có slide nào thì không có gì để chặn cả.
        notifiedAllRef.current = true;
        onSlideProgressChange?.(true);
      } else {
        viewedSlideIdsRef.current = new Set([sortedSlides[0].slide_id]);

        setViewedSlideCount(1);

        const hasViewedAllSlides = sortedSlides.length === 1;

        notifiedAllRef.current = hasViewedAllSlides;
        onSlideProgressChange?.(hasViewedAllSlides);
      }
      setLoading(false);
    };

    void loadPresentation();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  useEffect(() => {
    if (!notesPanelOpen || !lessonId) {
      return;
    }

    let cancelled = false;

    const loadSlideNotes = async () => {
      setSlideNotesLoading(true);

      try {
        const data = await getLessonNotesAction(lessonId);

        if (!cancelled) {
          setSlideNotes(data);
        }
      } finally {
        if (!cancelled) {
          setSlideNotesLoading(false);
        }
      }
    };

    void loadSlideNotes();

    return () => {
      cancelled = true;
    };
  }, [notesPanelOpen, lessonId]);

  const slides = presentation?.slides ?? [];
  const currentSlide = slides[currentIndex];

  const viewedProgressPercent =
    slides.length > 0
      ? Math.min(100, Math.round((viewedSlideCount / slides.length) * 100))
      : 0;

  const hasCompletedViewing =
    slides.length > 0 && viewedSlideCount >= slides.length;

  const goToPreviousSlide = useCallback(() => {
    setSlideDirection("previous");

    setCurrentIndex((previous) => Math.max(previous - 1, 0));
  }, []);

  const goToNextSlide = useCallback(() => {
    setSlideDirection("next");

    setCurrentIndex((previous) => Math.min(previous + 1, slides.length - 1));
  }, [slides.length]);

  const goToSlide = useCallback(
    (targetIndex: number) => {
      if (targetIndex === currentIndex) {
        return;
      }

      setSlideDirection(targetIndex > currentIndex ? "next" : "previous");

      setCurrentIndex(targetIndex);
    },
    [currentIndex],
  );

  const zoomOut = useCallback(() => {
    setZoomLevel((current) => Math.max(MIN_ZOOM, current - ZOOM_STEP));
  }, []);

  const zoomIn = useCallback(() => {
    setZoomLevel((current) => Math.min(MAX_ZOOM, current + ZOOM_STEP));
  }, []);

  const resetZoom = useCallback(() => {
    setZoomLevel(100);
  }, []);

  const clampNotesPanelWidth = useCallback((requestedWidth: number): number => {
    const containerWidth =
      splitContainerRef.current?.getBoundingClientRect().width ??
      window.innerWidth;

    // Không cho panel chiếm quá 55% toàn bộ khu vực trình chiếu.
    const responsiveMaximum = Math.min(
      MAX_NOTES_PANEL_WIDTH,
      Math.floor(containerWidth * 0.55),
    );

    const safeMaximum = Math.max(MIN_NOTES_PANEL_WIDTH, responsiveMaximum);

    return Math.min(
      safeMaximum,
      Math.max(MIN_NOTES_PANEL_WIDTH, requestedWidth),
    );
  }, []);

  useEffect(() => {
    setPreferencesLoaded(false);

    try {
      const savedValue = window.localStorage.getItem(preferencesStorageKey);

      if (!savedValue) {
        setNotesPanelOpen(false);
        setSlideOutlineOpen(false);

        setNotesPanelWidth(DEFAULT_NOTES_PANEL_WIDTH);

        setPreferencesLoaded(true);

        return;
      }

      const parsedValue = JSON.parse(
        savedValue,
      ) as Partial<PresentationPreferences>;

      const savedPanelOpen =
        typeof parsedValue.notesPanelOpen === "boolean"
          ? parsedValue.notesPanelOpen
          : false;

      const savedOutlineOpen =
        typeof parsedValue.slideOutlineOpen === "boolean"
          ? parsedValue.slideOutlineOpen
          : false;

      const savedPanelWidth =
        typeof parsedValue.notesPanelWidth === "number" &&
        Number.isFinite(parsedValue.notesPanelWidth)
          ? parsedValue.notesPanelWidth
          : DEFAULT_NOTES_PANEL_WIDTH;

      setNotesPanelOpen(savedPanelOpen);
      setSlideOutlineOpen(savedOutlineOpen);

      setNotesPanelWidth(clampNotesPanelWidth(savedPanelWidth));
    } catch (error) {
      console.error("Không thể đọc tùy chọn trình chiếu:", error);

      setNotesPanelOpen(false);
      setSlideOutlineOpen(false);

      setNotesPanelWidth(DEFAULT_NOTES_PANEL_WIDTH);

      // Xóa dữ liệu không hợp lệ để lần sau không tiếp tục lỗi.
      window.localStorage.removeItem(preferencesStorageKey);
    } finally {
      setPreferencesLoaded(true);
    }
  }, [preferencesStorageKey, clampNotesPanelWidth]);

  useEffect(() => {
    if (!preferencesLoaded) {
      return;
    }

    // Trì hoãn một chút để không ghi localStorage liên tục
    // trong lúc học viên đang kéo thanh phân cách.
    const saveTimer = window.setTimeout(() => {
      const preferences: PresentationPreferences = {
        notesPanelOpen,
        notesPanelWidth,
        slideOutlineOpen,
      };

      try {
        window.localStorage.setItem(
          preferencesStorageKey,
          JSON.stringify(preferences),
        );
      } catch (error) {
        console.error("Không thể lưu tùy chọn trình chiếu:", error);
      }
    }, 250);

    return () => {
      window.clearTimeout(saveTimer);
    };
  }, [
    preferencesLoaded,
    preferencesStorageKey,
    notesPanelOpen,
    notesPanelWidth,
    slideOutlineOpen,
  ]);

  useEffect(() => {
    if (!slideOutlineOpen) {
      return;
    }

    const scrollTimer = window.setTimeout(() => {
      activeOutlineItemRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 100);

    return () => {
      window.clearTimeout(scrollTimer);
    };
  }, [currentIndex, slideOutlineOpen]);

  const startResizingNotes = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();

    notesResizeStartRef.current = {
      startX: event.clientX,
      startWidth: notesPanelWidth,
    };

    setIsResizingNotes(true);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        goToPreviousSlide();
      }

      if (event.key === "ArrowRight") {
        goToNextSlide();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [goToNextSlide, goToPreviousSlide]);

  /**
   * Ghi nhận slide học viên đã mở và báo cho component cha
   * khi toàn bộ slide đã được xem.
   */
  useEffect(() => {
    const viewedSlide = slides[currentIndex];

    if (!viewedSlide) {
      return;
    }

    const previousSize = viewedSlideIdsRef.current.size;

    viewedSlideIdsRef.current.add(viewedSlide.slide_id);

    const currentSize = viewedSlideIdsRef.current.size;

    // Chỉ cập nhật state khi học viên vừa mở một slide mới.
    if (currentSize !== previousSize) {
      setViewedSlideCount(currentSize);
    }

    if (
      !notifiedAllRef.current &&
      slides.length > 0 &&
      currentSize >= slides.length
    ) {
      notifiedAllRef.current = true;
      onSlideProgressChange?.(true);
    }
  }, [currentIndex, slides, onSlideProgressChange]);

  /**
   * Đồng bộ trạng thái khi người dùng vào hoặc thoát toàn màn hình,
   * kể cả khi thoát bằng phím Esc.
   */
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === viewerRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!isResizingNotes) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const resizeStart = notesResizeStartRef.current;

      if (!resizeStart) {
        return;
      }

      const movedDistance = resizeStart.startX - event.clientX;

      const nextWidth = resizeStart.startWidth + movedDistance;

      setNotesPanelWidth(clampNotesPanelWidth(nextWidth));
    };

    const stopResizing = () => {
      notesResizeStartRef.current = null;
      setIsResizingNotes(false);
    };

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    window.addEventListener("pointermove", handlePointerMove);

    window.addEventListener("pointerup", stopResizing);

    window.addEventListener("pointercancel", stopResizing);

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;

      window.removeEventListener("pointermove", handlePointerMove);

      window.removeEventListener("pointerup", stopResizing);

      window.removeEventListener("pointercancel", stopResizing);
    };
  }, [isResizingNotes, clampNotesPanelWidth]);

  /**
   * Bật hoặc tắt chế độ trình chiếu toàn màn hình.
   */
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await viewerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      setError("Trình duyệt không thể mở chế độ toàn màn hình.");
    }
  };

  const resizeNotesWithKeyboard = (direction: "increase" | "decrease") => {
    const change = direction === "increase" ? 24 : -24;

    setNotesPanelWidth((currentWidth) =>
      clampNotesPanelWidth(currentWidth + change),
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-blue-100 bg-white">
        <div className="text-center">
          <Loader2 size={30} className="mx-auto animate-spin text-blue-600" />

          <p className="mt-3 text-sm font-medium text-slate-500">
            Đang tải bài trình chiếu...
          </p>
        </div>
      </div>
    );
  }

  if (error || !presentation) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
        <div className="max-w-sm px-5 text-center">
          <PresentationIcon size={34} className="mx-auto text-slate-300" />

          <p className="mt-3 text-sm font-semibold text-slate-700">
            Chưa có nội dung trình chiếu
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {error || "Giảng viên chưa thêm slide cho bài học này."}
          </p>
        </div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-blue-200 bg-blue-50/40">
        <div className="text-center">
          <PresentationIcon size={34} className="mx-auto text-blue-300" />

          <p className="mt-3 text-sm font-semibold text-slate-700">
            Bài học chưa có slide
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Nội dung sẽ xuất hiện khi giảng viên cập nhật.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <section
        ref={viewerRef}
        className={`overflow-hidden bg-white ${
          isFullscreen
            ? "flex h-screen flex-col rounded-none border-0 shadow-none"
            : isFocusMode
              ? "flex h-full min-h-0 flex-col rounded-none border-0 shadow-none"
              : "rounded-2xl border border-blue-100 shadow-sm"
        }`}
      >
        {/* Thanh tiêu đề */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 bg-blue-50/60 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
              Nội dung trình chiếu
            </p>

            <h3 className="mt-1 truncate text-sm font-bold text-slate-900">
              {lessonTitle || "Bài giảng"}
            </h3>
            {isFocusMode && (
              <p className="mt-1 text-[10px] font-medium text-violet-600">
                Chế độ tập trung • Nhấn Esc để thoát
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm ${
                hasCompletedViewing
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-white text-slate-600"
              }`}
            >
              {hasCompletedViewing
                ? "Đã xem đầy đủ"
                : `Đã xem ${viewedSlideCount}/${slides.length}`}
            </span>

            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 shadow-sm">
              Slide {currentIndex + 1}/{slides.length}
            </span>

            <button
              type="button"
              onClick={() => setSlideOutlineOpen((current) => !current)}
              disabled={!preferencesLoaded}
              title={
                slideOutlineOpen ? "Đóng mục lục slide" : "Mở mục lục slide"
              }
              aria-label={
                slideOutlineOpen ? "Đóng mục lục slide" : "Mở mục lục slide"
              }
              aria-pressed={slideOutlineOpen}
              className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold shadow-sm transition disabled:cursor-wait disabled:opacity-50 ${
                slideOutlineOpen
                  ? "border-blue-200 bg-blue-600 text-white"
                  : "border-blue-100 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600"
              }`}
            >
              {slideOutlineOpen ? (
                <PanelLeftClose size={15} />
              ) : (
                <PanelLeftOpen size={15} />
              )}

              <span className="hidden xl:inline">
                {slideOutlineOpen ? "Đóng mục lục" : "Mục lục"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setNotesPanelOpen((current) => !current)}
              disabled={!preferencesLoaded}
              title={
                notesPanelOpen
                  ? "Đóng panel ghi chú"
                  : "Chia đôi màn hình với ghi chú"
              }
              aria-label={
                notesPanelOpen ? "Đóng panel ghi chú" : "Mở panel ghi chú"
              }
              aria-pressed={notesPanelOpen}
              className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold shadow-sm transition disabled:cursor-wait disabled:opacity-50 ${
                notesPanelOpen
                  ? "border-indigo-200 bg-indigo-600 text-white"
                  : "border-blue-100 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600"
              }`}
            >
              {notesPanelOpen ? (
                <PanelRightClose size={15} />
              ) : (
                <NotebookPen size={15} />
              )}

              <span className="hidden xl:inline">
                {notesPanelOpen ? "Đóng ghi chú" : "Ghi chú"}
              </span>
            </button>

            {/* Điều khiển thu nhỏ/phóng to */}
            <div className="flex items-center overflow-hidden rounded-lg border border-blue-100 bg-white shadow-sm">
              <button
                type="button"
                onClick={zoomOut}
                disabled={zoomLevel <= MIN_ZOOM}
                title="Thu nhỏ slide"
                aria-label="Thu nhỏ slide"
                className="inline-flex h-8 w-8 items-center justify-center text-slate-600 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ZoomOut size={15} />
              </button>

              <button
                type="button"
                onClick={resetZoom}
                title="Đưa slide về kích thước 100%"
                className="inline-flex h-8 min-w-14 items-center justify-center border-x border-blue-100 px-2 text-[11px] font-bold text-blue-600 transition hover:bg-blue-50"
              >
                {zoomLevel}%
              </button>

              <button
                type="button"
                onClick={zoomIn}
                disabled={zoomLevel >= MAX_ZOOM}
                title="Phóng to slide"
                aria-label="Phóng to slide"
                className="inline-flex h-8 w-8 items-center justify-center text-slate-600 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ZoomIn size={15} />
              </button>
            </div>

            <button
              type="button"
              onClick={resetZoom}
              disabled={zoomLevel === 100}
              title="Khôi phục kích thước mặc định"
              aria-label="Khôi phục kích thước mặc định"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-100 bg-white text-slate-500 shadow-sm transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <RotateCcw size={15} />
            </button>

            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              title={
                isFullscreen
                  ? "Thoát toàn màn hình"
                  : "Trình chiếu toàn màn hình"
              }
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-100 bg-white text-blue-600 shadow-sm transition hover:bg-blue-600 hover:text-white"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            <button
              type="button"
              onClick={() => onFocusModeChange?.(!isFocusMode)}
              title={
                isFocusMode
                  ? "Thoát chế độ tập trung (Esc)"
                  : "Bật chế độ tập trung"
              }
              aria-label={
                isFocusMode ? "Thoát chế độ tập trung" : "Bật chế độ tập trung"
              }
              aria-pressed={isFocusMode}
              className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold shadow-sm transition ${
                isFocusMode
                  ? "border-violet-300 bg-violet-600 text-white"
                  : "border-blue-100 bg-white text-slate-600 hover:bg-violet-50 hover:text-violet-600"
              }`}
            >
              {isFocusMode ? <Minimize2 size={15} /> : <Focus size={15} />}

              <span className="hidden 2xl:inline">
                {isFocusMode ? "Thoát tập trung" : "Tập trung"}
              </span>
            </button>
          </div>
        </div>

        {/* Tiến độ xem slide */}
        <div className="border-b border-blue-100 bg-white px-5 py-3">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold text-slate-500">
              Tiến độ xem bài trình chiếu
            </span>

            <span
              className={`text-[11px] font-bold ${
                hasCompletedViewing ? "text-emerald-600" : "text-blue-600"
              }`}
            >
              {viewedProgressPercent}%
            </span>
          </div>

          <div
            className="h-2 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-label="Tiến độ xem slide"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={viewedProgressPercent}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                hasCompletedViewing
                  ? "bg-emerald-500"
                  : "bg-gradient-to-r from-blue-500 to-indigo-500"
              }`}
              style={{
                width: `${viewedProgressPercent}%`,
              }}
            />
          </div>
        </div>

        {/* Nội dung slide */}
        <div
          ref={splitContainerRef}
          className={`flex min-h-0 flex-col overflow-hidden bg-white lg:flex-row ${
            isFullscreen || isFocusMode ? "flex-1" : "h-[500px]"
          }`}
        >
          {/* Panel mục lục slide */}
          {preferencesLoaded && slideOutlineOpen && (
            <aside className="flex h-56 w-full shrink-0 flex-col overflow-hidden border-b border-blue-100 bg-slate-50 lg:h-auto lg:w-60 lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-3">
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Mục lục slide
                  </p>

                  <p className="mt-0.5 text-[10px] text-slate-500">
                    Đã xem {viewedSlideCount}/{slides.length}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSlideOutlineOpen(false)}
                  title="Đóng mục lục"
                  aria-label="Đóng mục lục"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                >
                  <PanelLeftClose size={15} />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
                {slides.map((slide, index) => {
                  const isCurrentSlide = currentIndex === index;

                  const hasViewedSlide = viewedSlideIdsRef.current.has(
                    slide.slide_id,
                  );

                  return (
                    <button
                      key={slide.slide_id}
                      ref={isCurrentSlide ? activeOutlineItemRef : undefined}
                      type="button"
                      onClick={() => goToSlide(index)}
                      aria-current={isCurrentSlide ? "page" : undefined}
                      className={`group flex w-full items-start gap-2.5 rounded-xl border p-2.5 text-left transition ${
                        isCurrentSlide
                          ? "border-blue-300 bg-blue-50 shadow-sm"
                          : hasViewedSlide
                            ? "border-emerald-100 bg-white hover:border-emerald-300"
                            : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40"
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                          isCurrentSlide
                            ? "bg-blue-600 text-white"
                            : hasViewedSlide
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {index + 1}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span
                          className={`block line-clamp-2 text-[11px] font-semibold leading-4 ${
                            isCurrentSlide ? "text-blue-700" : "text-slate-700"
                          }`}
                        >
                          {slide.title || `Slide ${index + 1}`}
                        </span>

                        <span
                          className={`mt-1 flex items-center gap-1 text-[10px] ${
                            isCurrentSlide
                              ? "text-blue-600"
                              : hasViewedSlide
                                ? "text-emerald-600"
                                : "text-slate-400"
                          }`}
                        >
                          {isCurrentSlide ? (
                            <>
                              <Circle size={9} fill="currentColor" />
                              Đang xem
                            </>
                          ) : hasViewedSlide ? (
                            <>
                              <CheckCircle2 size={11} />
                              Đã xem
                            </>
                          ) : (
                            <>
                              <Circle size={10} />
                              Chưa xem
                            </>
                          )}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>
          )}

          {/* Khu vực slide */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div
              key={currentSlide.slide_id}
              className={`flex min-h-0 flex-1 flex-col ${
                slideDirection === "next"
                  ? "lumer-slide-enter-next"
                  : "lumer-slide-enter-previous"
              }`}
            >
              <div className="min-h-0 flex-1 overflow-auto bg-white">
                <div
                  className="min-h-full bg-white"
                  style={{
                    zoom: zoomLevel / 100,
                  }}
                >
                  {currentSlide.title && (
                    <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
                      <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                        {currentSlide.title}
                      </h2>
                    </div>
                  )}

                  <div className="px-6 py-6 sm:px-8">
                    <AnnotatedContent
                      contentType="PRESENTATION_SLIDE"
                      contentId={currentSlide.slide_id}
                      html={currentSlide.content_body}
                      className="prose prose-slate max-w-none break-words
                [&_img]:h-auto [&_img]:max-w-full
                [&_table]:block [&_table]:max-w-full
                [&_table]:overflow-x-auto"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Thanh kéo thay đổi độ rộng */}
          {preferencesLoaded && notesPanelOpen && (
            <button
              type="button"
              onPointerDown={startResizingNotes}
              onDoubleClick={() =>
                setNotesPanelWidth(DEFAULT_NOTES_PANEL_WIDTH)
              }
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") {
                  event.preventDefault();

                  resizeNotesWithKeyboard("increase");
                }

                if (event.key === "ArrowRight") {
                  event.preventDefault();

                  resizeNotesWithKeyboard("decrease");
                }

                if (event.key === "Home") {
                  event.preventDefault();

                  setNotesPanelWidth(DEFAULT_NOTES_PANEL_WIDTH);
                }
              }}
              className={`group relative hidden w-2 shrink-0 cursor-col-resize items-center justify-center border-x transition lg:flex ${
                isResizingNotes
                  ? "border-indigo-300 bg-indigo-100"
                  : "border-indigo-100 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50"
              }`}
              title="Kéo để thay đổi độ rộng. Nhấp đúp để khôi phục."
              aria-label="Thay đổi độ rộng panel ghi chú"
              aria-orientation="vertical"
            >
              <span
                className={`h-12 w-1 rounded-full transition ${
                  isResizingNotes
                    ? "bg-indigo-500"
                    : "bg-slate-300 group-hover:bg-indigo-400"
                }`}
              />
            </button>
          )}

          {/* Panel ghi chú */}
          {preferencesLoaded && notesPanelOpen && (
            <aside
              className="h-64 w-full shrink-0 overflow-y-auto border-t border-indigo-100 bg-[#F7F8FB] p-4 lg:h-auto lg:w-[var(--notes-panel-width)] lg:max-w-[55%] lg:border-l-0 lg:border-t-0"
              style={
                {
                  "--notes-panel-width": `${notesPanelWidth}px`,
                } as CSSProperties
              }
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Ghi chú bài học
                  </p>

                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Đã lưu vào tài khoản • Rộng {notesPanelWidth}px
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setNotesPanelWidth(DEFAULT_NOTES_PANEL_WIDTH)
                    }
                    disabled={notesPanelWidth === DEFAULT_NOTES_PANEL_WIDTH}
                    title="Khôi phục độ rộng mặc định"
                    aria-label="Khôi phục độ rộng mặc định"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <RotateCcw size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setNotesPanelOpen(false)}
                    title="Đóng ghi chú"
                    aria-label="Đóng ghi chú"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-indigo-600"
                  >
                    <PanelRightClose size={16} />
                  </button>
                </div>
              </div>

              <LessonNotesPanel
                courseId={courseId}
                lessonId={lessonId}
                hasVideo={false}
                videoCurrentTime={0}
                notes={slideNotes}
                loading={slideNotesLoading}
                onNotesChange={setSlideNotes}
              />
            </aside>
          )}
        </div>

        {/* Điều khiển */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
          <button
            type="button"
            onClick={goToPreviousSlide}
            disabled={currentIndex === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={16} />
            Slide trước
          </button>

          {/* Chấm chọn slide */}
          <div className="hidden max-w-[45%] items-center justify-center gap-1.5 overflow-x-auto px-2 sm:flex">
            {slides.map((slide, index) => {
              const hasViewedSlide = viewedSlideIdsRef.current.has(
                slide.slide_id,
              );

              return (
                <button
                  key={slide.slide_id}
                  type="button"
                  onClick={() => goToSlide(index)}
                  title={
                    hasViewedSlide
                      ? `Slide ${index + 1} – Đã xem`
                      : `Slide ${index + 1} – Chưa xem`
                  }
                  aria-label={
                    hasViewedSlide
                      ? `Mở slide ${index + 1}, đã xem`
                      : `Mở slide ${index + 1}, chưa xem`
                  }
                  className={`h-2.5 shrink-0 rounded-full transition-all ${
                    currentIndex === index
                      ? "w-7 bg-blue-600"
                      : hasViewedSlide
                        ? "w-2.5 bg-emerald-400 hover:bg-emerald-500"
                        : "w-2.5 bg-slate-300 hover:bg-blue-300"
                  }`}
                />
              );
            })}
          </div>

          <button
            type="button"
            onClick={goToNextSlide}
            disabled={currentIndex === slides.length - 1}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0066FF] px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Slide sau
            <ChevronRight size={16} />
          </button>
        </div>
      </section>
      <style jsx global>{`
        @keyframes lumerSlideEnterNext {
          from {
            opacity: 0;
            transform: translateX(42px) scale(0.985);
          }

          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes lumerSlideEnterPrevious {
          from {
            opacity: 0;
            transform: translateX(-42px) scale(0.985);
          }

          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        .lumer-slide-enter-next {
          animation: lumerSlideEnterNext 360ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .lumer-slide-enter-previous {
          animation: lumerSlideEnterPrevious 360ms
            cubic-bezier(0.22, 1, 0.36, 1);
        }

        @media (prefers-reduced-motion: reduce) {
          .lumer-slide-enter-next,
          .lumer-slide-enter-previous {
            animation: none;
          }
        }
      `}</style>
    </>
  );
}
