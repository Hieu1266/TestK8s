"use client";

import React, { useEffect, useState } from "react";
import {
  MessageSquareText,
  Send,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
} from "lucide-react";

import {
  createStructureCommentAction,
  getMyStructureCommentsAction,
  updateStructureCommentAction,
  deleteStructureCommentAction,
  StructureComment,
} from "@/actions/structureComment_action";

interface TesterFeedbackPanelProps {
  courseId: string;
  lessonId: string;
  lessonTitle?: string;
}

export default function TesterFeedbackPanel({
  courseId,
  lessonId,
  lessonTitle,
}: TesterFeedbackPanelProps) {
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<StructureComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const loadComments = async () => {
    try {
      setLoading(true);

      const result = await getMyStructureCommentsAction(courseId);

      if (result.success) {
        const lessonComments = (result.data || []).filter(
          (item) =>
            item.structure_part === "LESSON" && item.part_id === lessonId
        );

        setComments(lessonComments);
      } else {
        console.error(result.message);
      }
    } catch (error) {
      console.error("Lỗi khi tải comment:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!courseId || !lessonId) return;
    loadComments();
  }, [courseId, lessonId]);

  const handleSubmit = async () => {
    const value = comment.trim();
    if (!value) return;

    try {
      setSaving(true);

      const result = await createStructureCommentAction({
        courseId,
        structurePart: "LESSON",
        partId: lessonId,
        title: lessonTitle || "Nhận xét bài học",
        comment: value,
      });

      if (!result.success) {
        alert(result.message || "Không thể gửi nhận xét.");
        return;
      }

      setComment("");
      await loadComments();
    } catch (error) {
      console.error("Lỗi khi tạo comment:", error);
      alert("Có lỗi xảy ra khi gửi nhận xét.");
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (item: StructureComment) => {
    setEditingId(item.comment_id);
    setEditingContent(item.comment);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingContent("");
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    const value = editingContent.trim();
    if (!value) {
      alert("Nội dung nhận xét không được để trống.");
      return;
    }

    try {
      setSaving(true);

      const result = await updateStructureCommentAction(editingId, {
        comment: value,
      });

      if (!result.success) {
        alert(result.message || "Không thể cập nhật nhận xét.");
        return;
      }

      handleCancelEdit();
      await loadComments();
    } catch (error) {
      console.error("Lỗi khi cập nhật comment:", error);
      alert("Có lỗi xảy ra khi cập nhật nhận xét.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa nhận xét này không?")) return;

    try {
      setSaving(true);

      const result = await deleteStructureCommentAction(commentId);

      if (!result.success) {
        alert(result.message || "Không thể xóa nhận xét.");
        return;
      }

      await loadComments();
    } catch (error) {
      console.error("Lỗi khi xóa comment:", error);
      alert("Có lỗi xảy ra khi xóa nhận xét.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
            <MessageSquareText className="h-5 w-5 text-indigo-600" />
          </div>

          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Nhận xét bài học
            </h3>
            <p className="text-xs text-slate-500">
              Gửi phản hồi cho giảng viên về nội dung bài học
            </p>
          </div>
        </div>

        {comments.length > 0 && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {comments.length} nhận xét
          </span>
        )}
      </div>

      <div className="p-6">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Nhập nhận xét của bạn về bài học này..."
          rows={4}
          disabled={saving}
          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
        />

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !comment.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang gửi...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Gửi nhận xét
              </>
            )}
          </button>
        </div>
      </div>

      <div className="border-t border-slate-100">
        {loading ? (
          <div className="flex items-center justify-center px-6 py-8 text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Đang tải nhận xét...
          </div>
        ) : comments.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <MessageSquareText className="mx-auto mb-2 h-7 w-7 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">
              Chưa có nhận xét nào
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Hãy gửi nhận xét đầu tiên cho bài học này.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {comments.map((item) => {
              const isEditing = editingId === item.comment_id;

              return (
                <div key={item.comment_id} className="px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                          Học viên
                        </span>

                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            item.status === "RESOLVED"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-amber-50 text-amber-600"
                          }`}
                        >
                          {item.status === "RESOLVED"
                            ? "Đã xử lý"
                            : "Chờ xử lý"}
                        </span>
                      </div>

                      {isEditing ? (
                        <div>
                          <textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            rows={4}
                            disabled={saving}
                            className="w-full resize-none rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                          />

                          <div className="mt-3 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              disabled={saving}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              <X className="h-3.5 w-3.5" />
                              Hủy
                            </button>

                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              disabled={saving}
                              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                              {saving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                              Lưu
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {item.comment}
                        </p>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          disabled={saving}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                          title="Sửa nhận xét"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(item.comment_id)}
                          disabled={saving}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          title="Xóa nhận xét"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}