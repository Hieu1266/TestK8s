"use client";

import { useState } from "react";
import {
    UserLessonNote,
    NoteCreatePayload,
    NoteUpdatePayload,
} from "@/types/progresses";
import {
    createNoteAction,
    updateNoteAction,
    deleteNoteAction,
} from "@/actions/getNotes";

interface LessonNotesPanelProps {
    courseId: string;
    lessonId: string;
    hasVideo: boolean;
    videoCurrentTime: number;
    notes: UserLessonNote[];
    loading: boolean;
    onNotesChange: (notes: UserLessonNote[]) => void;
    onSeekRequest?: (seconds: number) => void;
}

type TimestampMode = "none" | "manual" | "current";

function formatTime(seconds: number | null): string {
    if (seconds === null || seconds === undefined || isNaN(seconds)) return "";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

function parseManualTime(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.includes(":")) {
        const [min, sec] = trimmed.split(":").map((v) => parseInt(v, 10));
        if (isNaN(min) || isNaN(sec)) return null;
        return min * 60 + sec;
    }
    const n = parseInt(trimmed, 10);
    return isNaN(n) ? null : n;
}

export default function LessonNotesPanel({
    courseId,
    lessonId,
    hasVideo,
    videoCurrentTime,
    notes,
    loading,
    onNotesChange,
    onSeekRequest,
}: LessonNotesPanelProps) {
    const [content, setContent] = useState("");
    const [timestampMode, setTimestampMode] = useState<TimestampMode>("none");
    const [manualValue, setManualValue] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");
    const [savingEditId, setSavingEditId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const resolveTimestamp = (): number | null => {
        if (!hasVideo) return null; // Yêu cầu #2: không có video -> luôn null
        if (timestampMode === "current") return Math.floor(videoCurrentTime);
        if (timestampMode === "manual") return parseManualTime(manualValue);
        return null;
    };

    const handleCreate = async () => {
        if (!content.trim()) return;
        setFormError(null);

        const timestamp_seconds = resolveTimestamp();
        if (timestampMode === "manual" && hasVideo && timestamp_seconds === null) {
            setFormError("Mốc thời gian không hợp lệ. Định dạng: phút:giây (vd 1:30) hoặc số giây.");
            return;
        }

        setSubmitting(true);
        const payload: NoteCreatePayload = {
            course_id: courseId,
            lesson_id: lessonId,
            timestamp_seconds,
            content: content.trim(),
        };
        const result = await createNoteAction(payload);
        setSubmitting(false);

        if (!result.success || !result.data) {
            setFormError(result.error || "Tạo ghi chú thất bại.");
            return;
        }

        onNotesChange([...notes, result.data]);
        setContent("");
        setManualValue("");
        setTimestampMode("none");
    };

    const startEdit = (note: UserLessonNote) => {
        setEditingId(note.note_id);
        setEditContent(note.content);
    };
    const cancelEdit = () => {
        setEditingId(null);
        setEditContent("");
    };

    const handleSaveEdit = async (noteId: string) => {
        if (!editContent.trim()) return;
        setSavingEditId(noteId);
        const payload: NoteUpdatePayload = { content: editContent.trim() };
        const result = await updateNoteAction(noteId, payload);
        setSavingEditId(null);

        if (!result.success) {
            alert(result.error || "Cập nhật ghi chú thất bại.");
            return;
        }
        onNotesChange(
            notes.map((n) =>
                n.note_id === noteId
                    ? { ...n, content: editContent.trim(), updated_at: new Date().toISOString() }
                    : n
            )
        );
        cancelEdit();
    };

    const handleDelete = async (noteId: string) => {
        if (!confirm("Bạn có chắc muốn xóa ghi chú này?")) return;
        setDeletingId(noteId);
        const result = await deleteNoteAction(noteId);
        setDeletingId(null);

        if (!result.success) {
            alert(result.error || "Xóa ghi chú thất bại.");
            return;
        }
        onNotesChange(notes.filter((n) => n.note_id !== noteId));
    };

    return (
        <div className="space-y-5">
            {/* FORM TẠO GHI CHÚ */}
            <div className="bg-white border border-[#E7E9F0] rounded-2xl p-4 space-y-3">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Viết ghi chú cho bài học này..."
                    rows={3}
                    className="w-full text-xs bg-[#F7F8FB] border border-[#E7E9F0] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#5B5FEF] resize-none"
                />

                {hasVideo && (
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#565A70]">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" checked={timestampMode === "none"} onChange={() => setTimestampMode("none")} />
                            Không gắn thời gian
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" checked={timestampMode === "current"} onChange={() => setTimestampMode("current")} />
                            Thời điểm hiện tại của video ({formatTime(videoCurrentTime)})
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" checked={timestampMode === "manual"} onChange={() => setTimestampMode("manual")} />
                            Nhập thời gian:
                            <input
                                type="text"
                                disabled={timestampMode !== "manual"}
                                value={manualValue}
                                onChange={(e) => setManualValue(e.target.value)}
                                placeholder="vd: 1:30"
                                className="w-16 border border-[#E7E9F0] rounded-md px-1.5 py-0.5 text-[11px] disabled:opacity-40"
                            />
                        </label>
                    </div>
                )}

                {formError && <p className="text-[11px] text-[#E5484D]">{formError}</p>}

                <div className="flex justify-end">
                    <button
                        onClick={handleCreate}
                        disabled={submitting || !content.trim()}
                        className="text-white text-xs font-bold px-5 py-2 rounded-full bg-[#5B5FEF] disabled:opacity-50"
                    >
                        {submitting ? "Đang lưu..." : "Lưu ghi chú"}
                    </button>
                </div>
            </div>

            {/* DANH SÁCH GHI CHÚ */}
            {loading ? (
                <p className="text-xs text-[#B0B3C4] text-center py-6">Đang tải ghi chú...</p>
            ) : notes.length === 0 ? (
                <p className="text-xs text-[#B0B3C4] text-center py-6">Chưa có ghi chú nào cho bài học này.</p>
            ) : (
                <div className="space-y-2.5">
                    {notes.map((note) => (
                        <div key={note.note_id} className="bg-white border border-[#ECEAF0] rounded-xl p-3.5">
                            {editingId === note.note_id ? (
                                <div className="space-y-2">
                                    <textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        rows={3}
                                        className="w-full text-xs bg-[#F7F8FB] border border-[#E7E9F0] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#5B5FEF] resize-none"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={cancelEdit} className="text-[11px] font-bold px-3 py-1.5 rounded-full text-[#565A70]">
                                            Hủy
                                        </button>
                                        <button
                                            onClick={() => handleSaveEdit(note.note_id)}
                                            disabled={savingEditId === note.note_id}
                                            className="text-white text-[11px] font-bold px-4 py-1.5 rounded-full bg-[#5B5FEF] disabled:opacity-50"
                                        >
                                            {savingEditId === note.note_id ? "Đang lưu..." : "Lưu"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                            {note.timestamp_seconds !== null && (
                                                <button
                                                    onClick={() => onSeekRequest?.(note.timestamp_seconds!)}
                                                    className="inline-block mb-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EEF0FE] text-[#5B5FEF] hover:bg-[#E1E4FD]"
                                                >
                                                    ⏱ {formatTime(note.timestamp_seconds)}
                                                </button>
                                            )}
                                            <p className="text-xs text-[#3E4054] leading-relaxed whitespace-pre-wrap">{note.content}</p>
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                            <button onClick={() => startEdit(note)} className="text-[10px] font-bold text-[#565A70] hover:text-[#5B5FEF] px-1.5">
                                                Sửa
                                            </button>
                                            <button
                                                onClick={() => handleDelete(note.note_id)}
                                                disabled={deletingId === note.note_id}
                                                className="text-[10px] font-bold text-[#E5484D] hover:text-[#C43C43] px-1.5 disabled:opacity-50"
                                            >
                                                Xóa
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-[#B0B3C4] mt-1.5">{new Date(note.updated_at).toLocaleString("vi-VN")}</p>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}