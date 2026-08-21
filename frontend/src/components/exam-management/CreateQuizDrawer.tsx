"use client";

import { useState, useEffect, useCallback } from "react";
import { getLessonsBySubjectAction } from "@/actions/getLesson";
import { LessonShort } from "@/types/lessons";

export default function CreateQuizDrawer({
    subjectId,
    isOpen,
    onClose,
    onSuccess,
}: {
    subjectId: string;
    isOpen: boolean;
    onClose: () => void;
    subjectQuestions?: any[];
    subjectPools?: any[];
    onSuccess: (data: any) => void;
}) {
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        duration_minutes: "45",
        passing_percentage: "80",
        max_attempts: "1",
        quiz_type: "FIXED_QUESTION",
        placement_type: "",
        target_lesson_id: "",
        is_peer_review: false,
        is_active: true,
    });

    const [lessons, setLessons] = useState<LessonShort[]>([]);
    const [isLoadingLessons, setIsLoadingLessons] = useState(false);

    const fetchLessons = useCallback(async (placementType: string) => {
        setIsLoadingLessons(true);
        try {
            const data = await getLessonsBySubjectAction(subjectId, placementType);
            setLessons(data);
        } catch (error) {
            console.error("Lỗi khi tải danh sách bài học:", error);
            setLessons([]);
        } finally {
            setIsLoadingLessons(false);
        }
    }, [subjectId]);

    useEffect(() => {
        if (isOpen) {
            setFormData({
                title: "",
                description: "",
                duration_minutes: "45",
                passing_percentage: "80",
                max_attempts: "1",
                quiz_type: "FIXED_QUESTION",
                placement_type: "",
                target_lesson_id: "",
                is_peer_review: false,
                is_active: true,
            });
            setLessons([]);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        if (formData.placement_type) {
            fetchLessons(formData.placement_type);
        } else {
            setLessons([]);
            setFormData((prev) => ({ ...prev, target_lesson_id: "" }));
        }
    }, [formData.placement_type, isOpen, fetchLessons]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.placement_type) {
            alert("Vui lòng chọn vị trí hiển thị cho bài thi!");
            return;
        }

        const payload = {
            ...formData,
            duration_minutes: formData.duration_minutes === "" ? 0 : Number(formData.duration_minutes),
            passing_percentage: formData.passing_percentage === "" ? 0 : Number(formData.passing_percentage),
            max_attempts: formData.max_attempts === "" ? 0 : Number(formData.max_attempts),
            target_lesson_id: formData.target_lesson_id.trim() || null,
        };

        onSuccess(payload);
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
                    <h2 className="text-lg font-semibold text-slate-900">Tạo bài thi mới</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-xl">
                        &times;
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tên bài thi *</label>
                        <input
                            required
                            type="text"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Nhập tên bài kiểm tra..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label>
                        <textarea
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Nhập mô tả ngắn gọn..."
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Thời gian (phút)</label>
                            <input
                                type="number"
                                min={1}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.duration_minutes}
                                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tỷ lệ đạt (%) *</label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.passing_percentage}
                                onChange={(e) => setFormData({ ...formData, passing_percentage: e.target.value })}
                                placeholder="80"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Số lần làm</label>
                            <input
                                type="number"
                                min={1}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.max_attempts}
                                onChange={(e) => setFormData({ ...formData, max_attempts: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Loại đề</label>
                        <select
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                            value={formData.quiz_type}
                            onChange={(e) => setFormData({ ...formData, quiz_type: e.target.value })}
                        >
                            <option value="FIXED_QUESTION">Đề cố định (Thủ công chọn câu hỏi)</option>
                            <option value="RANDOM_QUESTION">Đề ngẫu nhiên (Lấy từ Kho câu hỏi)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Vị trí hiển thị *</label>
                        <select
                            required
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.placement_type}
                            onChange={(e) => setFormData({ ...formData, placement_type: e.target.value })}
                        >
                            <option value="">-- Chọn vị trí hiển thị --</option>
                            <option value="STANDALONE_LESSON">Bài thi trong module</option>
                            <option value="INSIDE_LESSON">Đính kèm bên trong một bài đọc</option>
                            <option value="IN_VIDEO">Nhúng vào mốc thời gian video</option>
                        </select>
                    </div>

                    {formData.placement_type && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Chọn bài học gán kèm (Tùy chọn)
                            </label>
                            <select
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.target_lesson_id}
                                onChange={(e) => setFormData({ ...formData, target_lesson_id: e.target.value })}
                                disabled={isLoadingLessons}
                            >
                                <option value="">-- Không gán bài học --</option>
                                {lessons.map((lesson) => (
                                    <option key={lesson.lesson_id} value={lesson.lesson_id}>
                                        {lesson.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* 🟢 TÙY CHỌN CHẤM ĐIỂM CHÉO (PEER REVIEW) */}
                    <div className="pt-2 border-t border-slate-100">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={formData.is_peer_review}
                                onChange={(e) => setFormData({ ...formData, is_peer_review: e.target.checked })}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="text-sm font-medium text-slate-700">
                                Cho phép chấm điểm chéo (Peer Review)
                            </span>
                        </label>
                        <p className="text-xs text-slate-400 mt-1 pl-6">
                            Khi bật, học viên sẽ chấm điểm bài làm của nhau dựa trên tiêu chí quy định.
                        </p>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-200 bg-gray-50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                        Hủy bỏ
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                        Lưu & Tạo mới
                    </button>
                </div>
            </div>
        </div>
    );
}