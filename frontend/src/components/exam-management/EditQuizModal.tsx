"use client";

import { useState, useEffect, useCallback } from "react";
import { Quiz, QuizPlacementType } from "@/types/exam-management";
import { getLessonsBySubjectAction } from "@/actions/getLesson";
import { LessonShort } from "@/types/lessons";

interface Props {
  quiz: Quiz | null;
  subjectId: string;
  onClose: () => void;
  onSuccess: (updatedData: Partial<Quiz>) => void;
}

export default function EditQuizModal({ quiz, subjectId, onClose, onSuccess }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // 🟢 Lưu dạng String
  const [durationMinutes, setDurationMinutes] = useState<string>("15");
  const [passingPercentage, setPassingPercentage] = useState<string>("80");
  const [maxAttempts, setMaxAttempts] = useState<string>("3");

  const [placementType, setPlacementType] = useState<QuizPlacementType | "">("");
  const [targetLessonId, setTargetLessonId] = useState<string>("");
  const [isActive, setIsActive] = useState(true);

  const [lessons, setLessons] = useState<LessonShort[]>([]);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);

  const fetchLessons = useCallback(async (pType: string) => {
    setIsLoadingLessons(true);
    try {
      const data = await getLessonsBySubjectAction(subjectId, pType);
      setLessons(data);
    } catch (error) {
      console.error("Lỗi khi tải danh sách bài học:", error);
      setLessons([]);
    } finally {
      setIsLoadingLessons(false);
    }
  }, [subjectId]);

  useEffect(() => {
    if (quiz) {
      setTitle(quiz.title);
      setDescription(quiz.description || "");

      // 🟢 Ép kiểu về String khi nhận dữ liệu từ quiz props
      setDurationMinutes(String(quiz.duration_minutes ?? 15));
      setPassingPercentage(String(quiz.passing_percentage ?? 80.0));
      setMaxAttempts(String(quiz.max_attempts ?? 3));

      setPlacementType(quiz.placement_type || "");
      setTargetLessonId(quiz.target_lesson_id || "");
      setIsActive(quiz.is_active);

      if (quiz.placement_type) {
        fetchLessons(quiz.placement_type);
      } else {
        setLessons([]);
      }
    }
  }, [quiz, fetchLessons]);

  const handlePlacementTypeChange = (newType: string) => {
    setPlacementType(newType as QuizPlacementType);

    if (!newType) {
      setTargetLessonId("");
      setLessons([]);
    } else {
      fetchLessons(newType);
    }
  };

  if (!quiz) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!placementType) {
      alert("Vui lòng chọn vị trí hiển thị cho bài thi!");
      return;
    }

    // 🟢 Chuyển sang dạng Số trước khi truyền dữ liệu
    const payload = {
      title,
      description,
      duration_minutes: durationMinutes === "" ? 0 : Number(durationMinutes),
      passing_percentage: passingPercentage === "" ? 0 : Number(passingPercentage),
      max_attempts: maxAttempts === "" ? 0 : Number(maxAttempts),
      placement_type: placementType as QuizPlacementType,
      target_lesson_id: targetLessonId.trim() || null,
      is_active: isActive,
    };

    // 🐞 DEBUG TẠI ĐÂY: Mở F12 -> Console để xem dữ liệu
    console.log("=== DEBUG EDIT QUIZ PAYLOAD ===", payload);
    console.log("Kiểu dữ liệu của passing_percentage:", typeof payload.passing_percentage);

    onSuccess(payload);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
        <div className="pb-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Cập nhật Bài thi</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tên bài thi
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0066FF] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mô tả
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0066FF] outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Thời lượng (phút)
              </label>
              <input
                type="number"
                min={1}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0066FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tỷ lệ đạt (%) *
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                required
                value={passingPercentage}
                onChange={(e) => setPassingPercentage(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0066FF]"
                placeholder="80"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Số lần làm
              </label>
              <input
                type="number"
                min={1}
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0066FF]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Vị trí hiển thị *
            </label>
            <select
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white"
              value={placementType}
              onChange={(e) => handlePlacementTypeChange(e.target.value)}
            >
              <option value="">-- Chọn vị trí hiển thị --</option>
              <option value="STANDALONE_LESSON">Bài thi trong module</option>
              <option value="INSIDE_LESSON">Đính kèm bên trong một bài đọc</option>
              <option value="IN_VIDEO">Nhúng vào mốc thời gian video</option>
            </select>
          </div>

          {placementType && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Bài học gán kèm (Tùy chọn)
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#0066FF] outline-none"
                value={targetLessonId}
                onChange={(e) => setTargetLessonId(e.target.value)}
                disabled={isLoadingLessons}
              >
                <option value="">-- Không gán bài học --</option>
                {lessons.map((lesson) => (
                  <option key={lesson.lesson_id} value={lesson.lesson_id}>
                    {lesson.title}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                {isLoadingLessons
                  ? "Đang tải danh sách bài học..."
                  : "Chọn bài học để gán kèm hoặc chọn '-- Không gán bài học --' để bỏ qua."}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active_edit"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#0066FF]"
            />
            <label
              htmlFor="is_active_edit"
              className="text-xs font-bold text-slate-700"
            >
              Kích hoạt bài thi (Active)
            </label>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0066FF] text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}