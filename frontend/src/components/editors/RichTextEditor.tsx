"use client";

import { useRef, useState } from "react";

import { CKEditor } from "@ckeditor/ckeditor5-react";

import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Bold,
  Italic,
  Underline,
  Heading,
  List,
  Link,
  Table,
  TableToolbar,
  Image,
  ImageToolbar,
  ImageCaption,
  ImageResize,
  ImageStyle,
  BlockQuote,
  CodeBlock,
  Undo,
  FontColor,
  FontBackgroundColor,
  Plugin,
} from "ckeditor5";

import "ckeditor5/ckeditor5.css";
import { BookOpenText, Loader2, X } from "lucide-react";
import { createContentAnnotationAction } from "@/actions/getContentAnnotations";
import { AnnotationContentType } from "@/types/content-annotations";

class ContentAnnotationEditing extends Plugin {
  static get pluginName() {
    return "ContentAnnotationEditing" as const;
  }

  init() {
    const editor = this.editor;

    // Cho phép đoạn văn bản mang annotation_id
    editor.model.schema.extend("$text", {
      allowAttributes: ["contentAnnotationId"],
    });

    // Chuyển HTML <span> thành thuộc tính trong model CKEditor
    editor.conversion.for("upcast").elementToAttribute({
      view: {
        name: "span",

        classes: "lumer-annotation",

        attributes: ["data-annotation-id"],
      },

      model: {
        key: "contentAnnotationId",

        value: (viewElement: any) =>
          viewElement.getAttribute("data-annotation-id"),
      },
    });

    // Khi CKEditor lưu dữ liệu, chuyển thuộc tính
    // trở lại thành thẻ <span>
    editor.conversion.for("dataDowncast").attributeToElement({
      model: "contentAnnotationId",

      view: (value, { writer }) =>
        writer.createAttributeElement(
          "span",
          {
            class: "lumer-annotation",

            "data-annotation-id": String(value),

            tabindex: "0",

            role: "button",
          },
          {
            priority: 5,
          },
        ),
    });

    // Cách từ đặc biệt hiển thị bên trong CKEditor
    editor.conversion.for("editingDowncast").attributeToElement({
      model: "contentAnnotationId",

      view: (value, { writer }) =>
        writer.createAttributeElement(
          "span",
          {
            class: "lumer-annotation",

            "data-annotation-id": String(value),

            title: "Từ đặc biệt có chú giải",
          },
          {
            priority: 5,
          },
        ),
    });
  }
}

interface AnnotationContext {
  contentType: AnnotationContentType;

  contentId: string;
}

interface Props {
  value: string;
  onChange: (data: string) => void;
  annotationContext?: AnnotationContext;
}

function getSelectedPlainText(editor: ClassicEditor): string {
  const pieces: string[] = [];

  const selection = editor.model.document.selection;

  for (const range of selection.getRanges()) {
    for (const item of range.getItems()) {
      if (item.is("$textProxy")) {
        pieces.push(item.data);
      }
    }
  }

  return pieces.join("").replace(/\s+/g, " ").trim();
}

export default function RichTextEditor({
  value,
  onChange,
  annotationContext,
}: Props) {
  const editorRef = useRef<ClassicEditor | null>(null);
  const pendingMarkerRef = useRef<string | null>(null);

  const [annotationModalOpen, setAnnotationModalOpen] = useState(false);

  const [selectedText, setSelectedText] = useState("");

  const [annotationTitle, setAnnotationTitle] = useState("");

  const [annotationDescription, setAnnotationDescription] = useState("");

  const [annotationError, setAnnotationError] = useState<string | null>(null);

  const [annotationSaving, setAnnotationSaving] = useState(false);

  const removePendingMarker = () => {
    const editor = editorRef.current;

    const markerName = pendingMarkerRef.current;

    if (!editor || !markerName || !editor.model.markers.has(markerName)) {
      return;
    }

    editor.model.change((writer) => {
      writer.removeMarker(markerName);
    });

    pendingMarkerRef.current = null;
  };
  const openAnnotationModal = () => {
    const editor = editorRef.current;

    if (!editor || !annotationContext) {
      return;
    }

    const text = getSelectedPlainText(editor);

    const range = editor.model.document.selection.getFirstRange();

    if (!text || !range || range.isCollapsed) {
      setAnnotationError(
        "Hãy bôi đen một từ hoặc cụm từ trước khi thêm chú giải.",
      );

      return;
    }

    // Xóa marker cũ nếu có
    removePendingMarker();

    const markerName = `pending-content-annotation:${Date.now()}`;

    // Lưu lại vùng được bôi đen.
    // Khi modal mở, CKEditor có thể mất selection,
    // nhưng marker vẫn giữ đúng vị trí văn bản.
    editor.model.change((writer) => {
      writer.addMarker(markerName, {
        range,

        usingOperation: false,

        affectsData: false,
      });
    });

    pendingMarkerRef.current = markerName;

    setSelectedText(text);

    // Mặc định tiêu đề chính là từ đã chọn
    setAnnotationTitle(text);

    setAnnotationDescription("");

    setAnnotationError(null);

    setAnnotationModalOpen(true);
  };
  const closeAnnotationModal = () => {
    removePendingMarker();

    setAnnotationModalOpen(false);

    setAnnotationError(null);
  };
  const saveContentAnnotation = async () => {
    const editor = editorRef.current;

    const markerName = pendingMarkerRef.current;

    if (!editor || !annotationContext || !markerName) {
      return;
    }

    if (!annotationTitle.trim() || !annotationDescription.trim()) {
      setAnnotationError(
        "Vui lòng nhập đầy đủ tiêu đề và nội dung giải thích.",
      );

      return;
    }

    setAnnotationSaving(true);

    setAnnotationError(null);

    const result = await createContentAnnotationAction({
      content_type: annotationContext.contentType,

      content_id: annotationContext.contentId,

      selected_text: selectedText,

      title: annotationTitle.trim(),

      description: annotationDescription.trim(),
    });

    setAnnotationSaving(false);

    if (!result.success || !result.data) {
      setAnnotationError(result.error || "Không thể tạo chú giải.");

      return;
    }

    const annotation = result.data;

    const marker = editor.model.markers.get(markerName);

    if (!marker) {
      setAnnotationError(
        "Vùng văn bản đã chọn không còn tồn tại. Vui lòng bôi đen và thử lại.",
      );

      return;
    }

    // Gắn annotation_id vào đúng đoạn
    // văn bản giảng viên đã bôi đen
    editor.model.change((writer) => {
      writer.setAttribute(
        "contentAnnotationId",

        annotation.annotation_id,

        marker.getRange(),
      );

      writer.removeMarker(markerName);
    });

    pendingMarkerRef.current = null;

    // Lấy HTML mới từ CKEditor
    // và cập nhật lên component cha
    onChange(editor.getData());

    setAnnotationModalOpen(false);

    setAnnotationError(null);
  };
  return (
    <div className="rounded-xl overflow-hidden border border-slate-300">
      {annotationContext && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 bg-blue-50/60 px-3 py-2"
        >
          <div>
            <p
              className="text-xs font-semibold text-slate-700"
            >
              Chú giải từ đặc biệt
            </p>

            <p
              className="text-[11px] text-slate-500"
            >
              Bôi đen từ cần giải thích rồi nhấn nút bên cạnh.
            </p>
          </div>

          <button
            type="button"
            onClick={openAnnotationModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
          >
            <BookOpenText size={15} />
            Thêm chú giải
          </button>
        </div>
      )}
      {annotationError && !annotationModalOpen && (
        <div
          className="border-b border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600"
        >
          {annotationError}
        </div>
      )}
      <CKEditor
        editor={ClassicEditor}
        data={value}
        config={{
          licenseKey: "GPL",

          plugins: [
            Essentials,
            Paragraph,
            Bold,
            Italic,
            Underline,
            Heading,
            List,
            Link,
            Table,
            TableToolbar,
            Image,
            ImageToolbar,
            ImageCaption,
            ImageResize,
            ImageStyle,
            BlockQuote,
            CodeBlock,
            Undo,
            FontColor,
            FontBackgroundColor,
            ContentAnnotationEditing,
          ],

          toolbar: [
            "undo",
            "redo",
            "|",
            "heading",
            "|",
            "bold",
            "italic",
            "underline",
            "|",
            "fontColor",
            "fontBackgroundColor",
            "|",
            "bulletedList",
            "numberedList",
            "|",
            "link",
            "|",
            "insertTable",
            "|",
            "blockQuote",
            "codeBlock",
          ],
        }}
        onChange={(_, editor) => {
          onChange(editor.getData());
        }}
        onReady={(editor) => {
          editorRef.current = editor;
        }}
        onAfterDestroy={() => {
          editorRef.current = null;
        }}
      />

      {annotationModalOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
          >
            {/* Header */}
            <div
              className="flex items-start justify-between border-b border-slate-100 px-5 py-4"
            >
              <div>
                <h3
                  className="text-base font-bold text-slate-900"
                >
                  Thêm chú giải cho từ đặc biệt
                </h3>

                <p
                  className="mt-1 text-xs text-slate-500"
                >
                  Đoạn đã chọn: “{selectedText}”
                </p>
              </div>

              <button
                type="button"
                onClick={closeAnnotationModal}
                disabled={annotationSaving}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4 p-5">
              <div>
                <label
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  Tiêu đề
                </label>

                <input
                  type="text"
                  value={annotationTitle}
                  onChange={(event) => setAnnotationTitle(event.target.value)}
                  placeholder="Nhập tên thuật ngữ..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  Thông tin giải thích
                </label>

                <textarea
                  rows={6}
                  value={annotationDescription}
                  onChange={(event) =>
                    setAnnotationDescription(event.target.value)
                  }
                  placeholder="Nhập định nghĩa, giải thích hoặc ví dụ bổ sung..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm leading-6 outline-none focus:border-blue-500"
                />
              </div>

              {annotationError && (
                <p className="text-xs text-red-600">{annotationError}</p>
              )}
            </div>

            {/* Footer */}
            <div
              className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4"
            >
              <button
                type="button"
                onClick={closeAnnotationModal}
                disabled={annotationSaving}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={() => void saveContentAnnotation()}
                disabled={annotationSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {annotationSaving && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                Lưu chú giải
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .ck-editor__editable_inline {
          min-height: 550px;
          padding: 24px !important;
        }

        .ck.ck-editor {
          border-radius: 12px;
        }

        .ck-toolbar {
          border-radius: 12px 12px 0 0 !important;
        }

        .ck-editor__editable {
          font-size: 16px;
          line-height: 1.8;
        }

        .ck-content h1 {
          font-size: 2rem;
        }

        .ck-content h2 {
          font-size: 1.6rem;
        }

        .ck-content h3 {
          font-size: 1.3rem;
        }

        .ck-content p {
          margin-bottom: 14px;
        }

        .ck-content pre {
          border-radius: 10px;
        }

        .ck-content table {
          width: 100%;
        }
        .ck-content .lumer-annotation {
          padding: 0 2px;

          border-bottom: 1px dashed #0066ff;

          border-radius: 3px;

          background: #eff6ff;

          color: #0057d9;

          cursor: help;

          transition:
            background-color 150ms ease,
            color 150ms ease;
        }

        .ck-content .lumer-annotation:hover {
          background: #dbeafe;

          color: #003f9e;
        }
      `}</style>
    </div>
  );
}