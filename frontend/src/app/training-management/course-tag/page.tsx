"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

import {
  Search,
  ArrowLeft,
  ChevronRight,
  BookOpen,
  Tag as TagIcon,
  Plus,
  X,
  Check,
  Save,
  Filter,
  Sparkles,
  LoaderCircle,
  CircleAlert,
  CircleCheck,
} from "lucide-react";

import { getTags } from "@/actions/tag";

import {
  getCourseAssignedTags,
  getCourseTagList,
  updateCourseTags,
} from "@/actions/course_tag";

import type { TagItem } from "@/types/tag";
import type { CourseTagItem } from "@/types/course_tag";

type NotificationState = {
  type: "success" | "error";
  message: string;
} | null;

export default function CourseTagAssignmentPage() {
  // =========================
  // DATA STATE
  // =========================

  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);
  const [courses, setCourses] = useState<CourseTagItem[]>([]);

  // =========================
  // FILTER STATE
  // =========================

  const [keyword, setKeyword] = useState("");
  const [selectedTagFilter, setSelectedTagFilter] = useState("ALL");

  // selectedTagFilter lưu tag_id, không lưu tag_name.

  // =========================
  // MODAL STATE
  // =========================

  const [activeCourse, setActiveCourse] = useState<CourseTagItem | null>(null);

  const [tempSelectedTagIds, setTempSelectedTagIds] = useState<string[]>([]);

  const [showAssignModal, setShowAssignModal] = useState(false);

  // =========================
  // LOADING STATE
  // =========================

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAssignedTags, setIsLoadingAssignedTags] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [notification, setNotification] = useState<NotificationState>(null);

  // =========================
  // LOAD PAGE DATA
  // =========================

  const loadData = useCallback(async () => {
    setIsLoading(true);

    try {
      const [tagList, courseList] = await Promise.all([
        getTags(0, 100),
        getCourseTagList(),
      ]);

      setAvailableTags(tagList);
      setCourses(courseList);
    } catch (error) {
      console.error("Không thể tải dữ liệu Course Tag:", error);

      setNotification({
        type: "error",
        message: "Không thể tải danh sách khóa học và Tag.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Tự ẩn thông báo sau 4 giây.
  useEffect(() => {
    if (!notification) return;

    const timeout = window.setTimeout(() => {
      setNotification(null);
    }, 4000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [notification]);

  // =========================
  // MODAL HANDLERS
  // =========================

  const handleOpenAssignModal = async (course: CourseTagItem) => {
    setActiveCourse(course);
    setShowAssignModal(true);
    setTempSelectedTagIds([]);
    setIsLoadingAssignedTags(true);

    try {
      /*
       * Gọi backend để lấy chính xác các Tag đang được gán.
       * Dữ liệu này chứa tag_id nên không cần chuyển từ tên sang ID.
       */
      const assignedTags = await getCourseAssignedTags(course.course_id);

      setTempSelectedTagIds(assignedTags.map((tag) => tag.tag_id));
    } catch (error) {
      console.error("Không thể tải Tag của khóa học:", error);

      /*
       * Phương án dự phòng:
       * course.tags hiện là string[] chứa tag_name.
       * Chuyển tag_name thành tag_id từ availableTags.
       */
      const fallbackTagIds = availableTags
        .filter((tag) => course.tags.includes(tag.tag_name))
        .map((tag) => tag.tag_id);

      setTempSelectedTagIds(fallbackTagIds);

      setNotification({
        type: "error",
        message:
          "Không thể tải danh sách Tag mới nhất. Đang sử dụng dữ liệu hiện có.",
      });
    } finally {
      setIsLoadingAssignedTags(false);
    }
  };

  const handleCloseAssignModal = () => {
    if (isSaving) return;

    setShowAssignModal(false);
    setActiveCourse(null);
    setTempSelectedTagIds([]);
  };

  const handleToggleTagInModal = (tagId: string) => {
    if (isSaving || isLoadingAssignedTags) return;

    setTempSelectedTagIds((currentTagIds) => {
      if (currentTagIds.includes(tagId)) {
        return currentTagIds.filter((currentTagId) => currentTagId !== tagId);
      }

      return [...currentTagIds, tagId];
    });
  };

  // =========================
  // SAVE COURSE TAGS
  // =========================

  const handleSaveTags = async () => {
    if (!activeCourse || isSaving) return;

    setIsSaving(true);
    setNotification(null);

    try {
      const result = await updateCourseTags({
        course_id: activeCourse.course_id,
        tag_ids: tempSelectedTagIds,
      });

      if (!result.success) {
        setNotification({
          type: "error",
          message: result.message,
        });

        return;
      }

      /*
       * Cập nhật giao diện ngay lập tức bằng danh sách Tag
       * tương ứng với các ID vừa lưu.
       */
      const updatedTagNames = availableTags
        .filter((tag) => tempSelectedTagIds.includes(tag.tag_id))
        .map((tag) => tag.tag_name);

      setCourses((currentCourses) =>
        currentCourses.map((course) =>
          course.course_id === activeCourse.course_id
            ? {
                ...course,
                tags: updatedTagNames,
              }
            : course,
        ),
      );

      setNotification({
        type: "success",
        message: result.message,
      });

      setShowAssignModal(false);
      setActiveCourse(null);
      setTempSelectedTagIds([]);

      /*
       * Đồng bộ lại toàn bộ danh sách với backend để bảo đảm
       * dữ liệu trên client chính xác.
       */
      await loadData();
    } catch (error) {
      console.error("Không thể lưu Tag:", error);

      setNotification({
        type: "error",
        message: "Có lỗi xảy ra khi cập nhật Tag cho khóa học.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // =========================
  // FILTER COURSE LIST
  // =========================

  const filteredCourses = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    const selectedTag = availableTags.find(
      (tag) => tag.tag_id === selectedTagFilter,
    );

    return courses.filter((course) => {
      const matchesKeyword =
        !normalizedKeyword ||
        course.title.toLowerCase().includes(normalizedKeyword) ||
        course.course_id.toLowerCase().includes(normalizedKeyword) ||
        (course.description ?? "").toLowerCase().includes(normalizedKeyword);

      const matchesTag =
        selectedTagFilter === "ALL" ||
        Boolean(selectedTag && course.tags.includes(selectedTag.tag_name));

      return matchesKeyword && matchesTag;
    });
  }, [availableTags, courses, keyword, selectedTagFilter]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased">
      <Navbar />

      {/* HEADER SECTION */}
      <section className="bg-gradient-to-r from-[#0066FF] to-[#0052cc] text-white pt-10 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto space-y-4 relative z-10">
          <div className="flex items-center gap-2 text-xs text-white/80 font-medium">
            <Link
              href="/training-management"
              className="hover:text-white hover:bg-white/20 flex items-center gap-1.5 transition-all bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm border border-white/10"
            >
              <ArrowLeft size={14} />
              Quản lý đào tạo
            </Link>

            <ChevronRight size={12} className="opacity-50" />

            <span className="text-white font-semibold tracking-wide flex items-center gap-1.5">
              <TagIcon size={14} />
              Gán Tag Khóa Học
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight drop-shadow-md">
            GÁN TAG CHO KHÓA HỌC
          </h1>

          <p className="text-sm text-blue-100 max-w-2xl font-medium leading-relaxed">
            Giao diện phân loại và liên kết các Nhãn (Tag) vào từng Khóa học,
            giúp sinh viên và giảng viên dễ dàng lọc, tìm kiếm chương trình đào
            tạo.
          </p>
        </div>
      </section>

      {/* NOTIFICATION */}
      {notification && (
        <div className="fixed top-24 right-5 z-[70] max-w-sm w-[calc(100%-2.5rem)]">
          <div
            className={`flex items-start gap-3 rounded-2xl border p-4 shadow-xl ${
              notification.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {notification.type === "success" ? (
              <CircleCheck size={20} className="shrink-0 mt-0.5" />
            ) : (
              <CircleAlert size={20} className="shrink-0 mt-0.5" />
            )}

            <p className="text-sm font-semibold leading-relaxed">
              {notification.message}
            </p>

            <button
              type="button"
              onClick={() => setNotification(null)}
              className="ml-auto shrink-0"
              aria-label="Đóng thông báo"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-6 -mt-14 pb-20 relative z-20">
        <div className="bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] p-6 md:p-8 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] space-y-8">
          {/* TOOLBAR */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search
                size={18}
                className="absolute left-4 top-3.5 text-slate-400"
              />

              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Tìm khóa học theo mã hoặc tên..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#0066FF]/10 focus:border-[#0066FF] transition-all"
              />
            </div>

            {/* TAG FILTER */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 custom-scrollbar">
              <span className="text-xs font-bold text-slate-400 shrink-0 flex items-center gap-1">
                <Filter size={14} />
                Lọc Tag:
              </span>

              <button
                type="button"
                onClick={() => setSelectedTagFilter("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedTagFilter === "ALL"
                    ? "bg-[#0066FF] text-white shadow-md shadow-blue-500/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Tất cả
              </button>

              {availableTags.map((tag) => (
                <button
                  type="button"
                  key={tag.tag_id}
                  onClick={() => setSelectedTagFilter(tag.tag_id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    selectedTagFilter === tag.tag_id
                      ? "bg-[#0066FF] text-white shadow-md shadow-blue-500/20"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tag.tag_name}
                </button>
              ))}
            </div>
          </div>

          {/* LOADING */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500 space-y-4">
              <LoaderCircle size={42} className="animate-spin text-[#0066FF]" />

              <p className="text-sm font-semibold">
                Đang tải danh sách khóa học và Tag...
              </p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
              <BookOpen size={48} className="text-slate-300" />

              <p className="text-sm font-medium text-slate-500">
                Không tìm thấy khóa học nào khớp với bộ lọc.
              </p>
            </div>
          ) : (
            /* COURSE LIST */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <div
                  key={course.course_id}
                  className="bg-white border border-slate-200 hover:border-blue-300 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-5 group relative"
                >
                  <div className="space-y-3">
                    <div className="flex justify-end items-center">
                      <span className="text-xs text-slate-400 font-semibold shrink-0">
                        {course.tags.length} Tag
                      </span>
                    </div>

                    <h3 className="font-extrabold text-base text-slate-800 group-hover:text-[#0066FF] transition-colors line-clamp-2">
                      {course.title}
                    </h3>

                    <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                      {course.description || "Khóa học chưa có mô tả."}
                    </p>
                  </div>

                  {/* DISPLAY ASSIGNED TAGS */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex flex-wrap gap-1.5 min-h-[32px] items-center">
                      {course.tags.length > 0 ? (
                        course.tags.map((tagName) => (
                          <span
                            key={`${course.course_id}-${tagName}`}
                            className="bg-blue-50 text-[#0066FF] border border-blue-100 px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1"
                          >
                            <TagIcon size={10} />
                            {tagName}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          Chưa được gán Tag nào
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleOpenAssignModal(course)}
                      className="w-full bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#0066FF] border border-slate-200 hover:border-blue-200 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Plus size={14} />
                      Quản lý / Gán Tag
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* MODAL */}
      {showAssignModal && activeCourse && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-200"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseAssignModal();
            }
          }}
        >
          <div className="bg-white rounded-[2rem] max-w-lg w-full p-8 space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                <span className="p-2 bg-blue-50 text-[#0066FF] rounded-xl">
                  <Sparkles size={20} />
                </span>
                Cập Nhật Tag Khóa Học
              </h3>

              <button
                type="button"
                onClick={handleCloseAssignModal}
                disabled={isSaving}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors disabled:opacity-50"
                aria-label="Đóng modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* COURSE INFO */}
            <div className="bg-blue-50/60 border border-blue-100 p-4 rounded-2xl space-y-1">
              <span className="text-[10px] font-black uppercase text-[#0066FF] tracking-wider">
                Khóa học đang chọn
              </span>

              <h4 className="font-extrabold text-sm text-slate-800">
                {activeCourse.title}
              </h4>
            </div>

            {/* TAG SELECTOR */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Chọn các nhãn muốn gán:
                </label>

                <span className="text-xs font-semibold text-slate-400">
                  Đã chọn:{" "}
                  <strong className="text-[#0066FF]">
                    {tempSelectedTagIds.length}
                  </strong>
                </span>
              </div>

              {isLoadingAssignedTags ? (
                <div className="min-h-48 flex flex-col items-center justify-center gap-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <LoaderCircle
                    size={30}
                    className="animate-spin text-[#0066FF]"
                  />

                  <p className="text-xs font-semibold text-slate-500">
                    Đang tải Tag của khóa học...
                  </p>
                </div>
              ) : availableTags.length === 0 ? (
                <div className="min-h-40 flex flex-col items-center justify-center gap-2 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                  <TagIcon size={32} className="text-slate-300" />

                  <p className="text-xs font-semibold text-slate-500">
                    Hệ thống chưa có Tag để lựa chọn.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                  {availableTags.map((tag) => {
                    const isSelected = tempSelectedTagIds.includes(tag.tag_id);

                    return (
                      <button
                        type="button"
                        key={tag.tag_id}
                        onClick={() => handleToggleTagInModal(tag.tag_id)}
                        disabled={isSaving}
                        className={`p-3 text-left rounded-2xl border cursor-pointer transition-all flex items-start gap-3 disabled:cursor-not-allowed disabled:opacity-60 ${
                          isSelected
                            ? "bg-blue-50/80 border-[#0066FF] shadow-sm"
                            : "bg-slate-50/50 border-slate-200 hover:bg-slate-100/80"
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border transition-colors ${
                            isSelected
                              ? "bg-[#0066FF] border-[#0066FF] text-white"
                              : "bg-white border-slate-300 text-transparent"
                          }`}
                        >
                          <Check size={12} strokeWidth={3} />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span
                            className={`text-xs font-bold block truncate ${
                              isSelected ? "text-[#0066FF]" : "text-slate-800"
                            }`}
                          >
                            {tag.tag_name}
                          </span>

                          {tag.description && (
                            <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                              {tag.description}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCloseAssignModal}
                disabled={isSaving}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-bold text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={() => void handleSaveTags()}
                disabled={isSaving || isLoadingAssignedTags}
                className="px-6 py-2.5 bg-[#0066FF] hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Lưu thay đổi
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
