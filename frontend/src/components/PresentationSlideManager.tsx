"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  AlertCircle,
  Eye,
  Loader2,
  Pencil,
  GripVertical,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import {
  createPresentationAction,
  createPresentationSlideAction,
  deletePresentationSlideAction,
  getPresentationByLessonAction,
  reorderPresentationSlidesAction,
  updatePresentationSlideAction,
} from "@/actions/getPresentation";

import { Presentation, PresentationSlide } from "@/types/presentations";

const RichTextEditor = dynamic(
  () => import("@/components/editors/RichTextEditor"),
  {
    ssr: false,
  },
);

interface PresentationSlideManagerProps {
  lessonId: string;
  lessonTitle: string;
}

function hasText(html: string): boolean {
  return (
    html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim().length > 0
  );
}

export default function PresentationSlideManager({
  lessonId,
  lessonTitle,
}: PresentationSlideManagerProps) {
  const [presentation, setPresentation] = useState<Presentation | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [mode, setMode] = useState<"edit" | "preview">("edit");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [draggedSlideId, setDraggedSlideId] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const initializationRef = useRef<string | null>(null);

  /**
   * Chọn một slide để chỉnh sửa.
   */
  const selectSlide = useCallback((slide: PresentationSlide) => {
    setSelectedId(slide.slide_id);
    setTitle(slide.title || "");
    setContent(slide.content_body);
    setMode("edit");
    setConfirmDelete(false);
    setError(null);
    setNotice(null);
  }, []);

  /**
   * Lấy Presentation theo lesson.
   * Nếu lesson chưa có Presentation thì tự động tạo mới.
   */
  const loadPresentation = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await getPresentationByLessonAction(lessonId);

    let loadedPresentation = result.data;

    if (!result.success && result.status === 404) {
      const createResult = await createPresentationAction({
        lesson_id: lessonId,
        title: lessonTitle,
      });

      if (!createResult.success || !createResult.data) {
        setError(createResult.error || "Không thể khởi tạo bài trình chiếu.");

        setLoading(false);
        return;
      }

      loadedPresentation = createResult.data;
    } else if (!result.success) {
      setError(result.error || "Không thể tải bài trình chiếu.");

      setLoading(false);
      return;
    }

    if (loadedPresentation) {
      const sortedSlides = [...loadedPresentation.slides].sort(
        (first, second) => first.slide_order - second.slide_order,
      );

      setPresentation({
        ...loadedPresentation,
        slides: sortedSlides,
      });

      if (sortedSlides.length > 0) {
        selectSlide(sortedSlides[0]);
      } else {
        setSelectedId(null);
        setTitle("");
        setContent("");
      }
    }

    setLoading(false);
  }, [lessonId, lessonTitle, selectSlide]);

  useEffect(() => {
    if (initializationRef.current === lessonId) {
      return;
    }

    initializationRef.current = lessonId;

    void loadPresentation();
  }, [lessonId, loadPresentation]);

  /**
   * Tạo slide mới.
   */
  const handleAddSlide = async () => {
    if (!presentation || creating) {
      return;
    }

    setCreating(true);
    setError(null);
    setNotice(null);

    const nextOrder = presentation.slides.length + 1;

    const result = await createPresentationSlideAction(
      presentation.presentation_id,
      {
        title: `Slide ${nextOrder}`,
        content_body: "<p>Nhập nội dung slide tại đây...</p>",
        slide_order: nextOrder,
      },
    );

    setCreating(false);

    if (!result.success || !result.data) {
      setError(result.error || "Không thể thêm slide.");

      return;
    }

    const updatedSlides = [...presentation.slides, result.data].sort(
      (first, second) => first.slide_order - second.slide_order,
    );

    setPresentation({
      ...presentation,
      slides: updatedSlides,
    });

    selectSlide(result.data);
    setNotice("Đã thêm slide mới.");
  };

  /**
   * Lưu slide đang chọn.
   */
  const handleSave = async () => {
    if (!selectedId || saving) {
      return;
    }

    if (!hasText(content)) {
      setError("Nội dung slide không được để trống.");

      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    const result = await updatePresentationSlideAction(selectedId, {
      title: title.trim() || null,
      content_body: content,
    });

    setSaving(false);

    if (!result.success || !result.data || !presentation) {
      setError(result.error || "Không thể lưu slide.");

      return;
    }

    setPresentation({
      ...presentation,
      slides: presentation.slides.map((slide) =>
        slide.slide_id === selectedId ? result.data! : slide,
      ),
    });

    setNotice("Đã lưu nội dung slide.");
  };

  /**
   * Xóa slide đang chọn.
   */
  const handleDelete = async () => {
    if (!selectedId || !presentation || deleting) {
      return;
    }

    setDeleting(true);
    setError(null);
    setNotice(null);

    const result = await deletePresentationSlideAction(selectedId);

    setDeleting(false);

    if (!result.success) {
      setError(result.error || "Không thể xóa slide.");

      return;
    }

    const remainingSlides = presentation.slides.filter(
      (slide) => slide.slide_id !== selectedId,
    );

    setPresentation({
      ...presentation,
      slides: remainingSlides,
    });

    setConfirmDelete(false);
    setNotice("Đã xóa slide.");

    if (remainingSlides.length > 0) {
      selectSlide(remainingSlides[0]);
    } else {
      setSelectedId(null);
      setTitle("");
      setContent("");
    }
  };

  /**
   * Ghi nhận slide bắt đầu được kéo.
   */
  const handleDragStart = (slideId: string) => {
    if (reordering) {
      return;
    }

    setDraggedSlideId(slideId);
    setError(null);
    setNotice(null);
  };

  /**
   * Di chuyển slide đang kéo tới vị trí của slide đích.
   */
  const handleDrop = async (targetSlideId: string) => {
    if (
      !presentation ||
      !draggedSlideId ||
      draggedSlideId === targetSlideId ||
      reordering
    ) {
      setDraggedSlideId(null);
      return;
    }

    const previousSlides = [...presentation.slides];

    const sourceIndex = previousSlides.findIndex(
      (slide) => slide.slide_id === draggedSlideId,
    );

    const targetIndex = previousSlides.findIndex(
      (slide) => slide.slide_id === targetSlideId,
    );

    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggedSlideId(null);
      return;
    }

    const reorderedSlides = [...previousSlides];
    const [movedSlide] = reorderedSlides.splice(sourceIndex, 1);

    reorderedSlides.splice(targetIndex, 0, movedSlide);

    const normalizedSlides = reorderedSlides.map((slide, index) => ({
      ...slide,
      slide_order: index + 1,
    }));

    // Cập nhật giao diện trước để thao tác kéo thả mượt hơn.
    setPresentation({
      ...presentation,
      slides: normalizedSlides,
    });

    setDraggedSlideId(null);
    setReordering(true);
    setError(null);
    setNotice(null);

    const result = await reorderPresentationSlidesAction(
      presentation.presentation_id,
      normalizedSlides.map((slide) => slide.slide_id),
    );

    setReordering(false);

    if (!result.success) {
      // Khôi phục lại thứ tự cũ nếu backend lưu thất bại.
      setPresentation({
        ...presentation,
        slides: previousSlides,
      });

      setError(result.error || "Không thể lưu thứ tự slide.");

      return;
    }

    const savedSlides = result.data
      ? [...result.data].sort(
          (first, second) => first.slide_order - second.slide_order,
        )
      : normalizedSlides;

    setPresentation({
      ...presentation,
      slides: savedSlides,
    });

    setNotice("Đã lưu thứ tự slide mới.");
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-xl border border-blue-100 bg-blue-50/40 text-sm text-slate-500">
        <Loader2 size={18} className="mr-2 animate-spin text-blue-600" />
        Đang tải trình quản lý slide...
      </div>
    );
  }

  if (!presentation) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        <div className="flex items-center gap-2 font-semibold">
          <AlertCircle size={17} />
          Không thể mở trình quản lý slide
        </div>

        <p className="mt-1 text-xs">{error}</p>

        <button
          type="button"
          onClick={() => void loadPresentation()}
          className="mt-3 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-blue-100 bg-blue-50/30">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 bg-white px-4 py-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900">
            Nội dung trình chiếu
          </h4>

          <p className="mt-0.5 text-[11px] text-slate-500">
            Tạo và quản lý các slide của lesson. Nội dung dài sẽ cuộn bên trong
            khi trình chiếu.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleAddSlide()}
          disabled={creating}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0066FF] px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {creating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Plus size={14} />
          )}

          {creating ? "Đang thêm..." : "Thêm slide"}
        </button>
      </div>

      <div className="grid min-h-[500px] grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)]">
        {/* Danh sách slide bên trái */}
        <aside className="border-b border-blue-100 bg-white p-3 lg:border-b-0 lg:border-r">
          <div className="max-h-[475px] space-y-2 overflow-y-auto pr-1">
            {presentation.slides.map((slide) => (
              <div
                key={slide.slide_id}
                draggable={!reordering}
                onDragStart={() => handleDragStart(slide.slide_id)}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={() => void handleDrop(slide.slide_id)}
                onDragEnd={() => setDraggedSlideId(null)}
                className={`group flex items-center rounded-lg border transition ${
                  selectedId === slide.slide_id
                    ? "border-blue-300 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                } ${
                  draggedSlideId === slide.slide_id
                    ? "opacity-40"
                    : "opacity-100"
                } ${
                  reordering
                    ? "cursor-wait"
                    : "cursor-grab active:cursor-grabbing"
                }`}
              >
                <div
                  className="flex shrink-0 items-center justify-center px-2 text-slate-300 transition group-hover:text-blue-500"
                  title="Kéo để thay đổi thứ tự"
                >
                  <GripVertical size={16} />
                </div>

                <button
                  type="button"
                  onClick={() => selectSlide(slide)}
                  disabled={reordering}
                  className="min-w-0 flex-1 py-3 pr-3 text-left"
                >
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-blue-600">
                    Slide {slide.slide_order}
                  </span>

                  <span className="mt-1 block truncate text-xs font-semibold text-slate-700">
                    {slide.title || "Không có tiêu đề"}
                  </span>
                </button>
              </div>
            ))}

            {presentation.slides.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-200 px-3 py-8 text-center text-xs text-slate-400">
                Chưa có slide nào.
              </div>
            )}
          </div>
        </aside>

        {/* Khu vực chỉnh sửa bên phải */}
        <div className="min-w-0 p-4">
          {!selectedId ? (
            <div className="flex h-full min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-blue-200 bg-white text-center">
              <Plus size={28} className="text-blue-300" />

              <p className="mt-2 text-sm font-semibold text-slate-700">
                Tạo slide đầu tiên
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Mỗi lesson có thể chứa nhiều slide.
              </p>

              <div className="flex items-center gap-3">
                {reordering && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600">
                    <Loader2 size={14} className="animate-spin" />
                    Đang lưu thứ tự...
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => void handleAddSlide()}
                  disabled={creating || reordering}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0066FF] px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}

                  {creating ? "Đang thêm..." : "Thêm slide"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex rounded-lg bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setMode("edit")}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
                      mode === "edit"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    <Pencil size={13} />
                    Soạn nội dung
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode("preview")}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
                      mode === "preview"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    <Eye size={13} />
                    Xem trước
                  </button>
                </div>

                <span className="text-[11px] text-slate-400">
                  {
                    presentation.slides.find(
                      (slide) => slide.slide_id === selectedId,
                    )?.slide_order
                  }
                  /{presentation.slides.length}
                </span>
              </div>

              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={150}
                placeholder="Tiêu đề slide (không bắt buộc)"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500"
              />

              {mode === "edit" ? (
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  annotationContext={
                    selectedId
                      ? {
                          contentType: "PRESENTATION_SLIDE",

                          contentId: selectedId,
                        }
                      : undefined
                  }
                />
              ) : (
                <div className="flex h-[350px] min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {title && (
                    <div className="shrink-0 border-b border-slate-100 px-6 py-4 text-xl font-bold text-slate-900">
                      {title}
                    </div>
                  )}

                  <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-5">
                    <div
                      className="prose prose-slate max-w-none break-words [&_img]:h-auto [&_img]:max-w-full [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto"
                      dangerouslySetInnerHTML={{
                        __html: content,
                      }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {error}
                </div>
              )}

              {notice && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  {notice}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 size={14} />
                    Xóa slide
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-rose-700">
                    <span>Xóa slide này?</span>

                    <button
                      type="button"
                      onClick={() => void handleDelete()}
                      disabled={deleting}
                      className="rounded-md bg-rose-600 px-2.5 py-1.5 font-semibold text-white disabled:opacity-50"
                    >
                      {deleting ? "Đang xóa..." : "Xóa"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-md px-2 py-1.5 font-semibold text-slate-500 hover:bg-slate-100"
                    >
                      Hủy
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0066FF] px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}

                  {saving ? "Đang lưu..." : "Lưu slide"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
