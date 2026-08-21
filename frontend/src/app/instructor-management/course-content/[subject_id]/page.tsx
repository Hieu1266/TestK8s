"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { SyllabusData } from "@/types/syllabus";
import { ModuleData } from "@/types/modules";
import { SubjectData } from "@/types/subjects";
import { SubjectStatus } from "@/types/statuses";

import {
  getSubjectByIdAction,
  updateSubjectAction,
} from "@/actions/getSubject";
import {
  getSyllabusBySubjectAction,
  downloadSyllabusFileAction,
} from "@/actions/getSyllabus";
import {
  getModulesAction,
  createModuleAction,
  updateModuleAction,
  deleteModuleAction,
} from "@/actions/getModules";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Layers,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  Trash2,
  Edit3,
  ArrowRight,
  HelpCircle,
  FileQuestion,
  Loader2,
  AlertCircle,
  X,
  AlertTriangle,
  GripVertical,
  Undo2,
} from "lucide-react";

// Hàm helper hiển thị Badge cho trạng thái Đề Cương (Syllabus)
const getSyllabusStatusBadge = (statusId?: string) => {
  switch (statusId) {
    case "SYLLABUS_APPROVED":
      return {
        text: "Đã phê duyệt",
        icon: CheckCircle,
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    case "SYLLABUS_REVIEWING":
      return {
        text: "Đang duyệt",
        icon: Clock,
        className: "bg-amber-50 text-amber-700 border-amber-200",
      };
    case "SYLLABUS_REJECTED":
      return {
        text: "Từ chối",
        icon: XCircle,
        className: "bg-rose-50 text-rose-700 border-rose-200",
      };
    default:
      return {
        text: "Bản nháp",
        icon: FileText,
        className: "bg-slate-100 text-slate-700 border-slate-200",
      };
  }
};

// Hàm helper hiển thị Badge cho trạng thái Môn Học (Subject)
const getSubjectStatusBadge = (status?: string) => {
  switch (status) {
    case SubjectStatus.SUBJECT_ACTIVE:
      return {
        text: "Đang hoạt động",
        className: "bg-emerald-100/80 text-emerald-700 border-emerald-200",
      };
    case SubjectStatus.SUBJECT_DEVELOPING:
      return {
        text: "Đang biên soạn",
        className: "bg-amber-100/80 text-amber-700 border-amber-200",
      };
    case SubjectStatus.SUBJECT_SUSPENDED:
      return {
        text: "Tạm dừng",
        className: "bg-rose-100/80 text-rose-700 border-rose-200",
      };
    default:
      return {
        text: status || "Đang biên soạn",
        className: "bg-slate-100 text-slate-700 border-slate-200",
      };
  }
};

export default function SubjectPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = (params.subject_id as string) || "";

  // 0️⃣ State quản lý thông tin Môn học (Subject)
  const [subject, setSubject] = useState<SubjectData | null>(null);
  const [loadingSubject, setLoadingSubject] = useState<boolean>(true);
  const [updatingSubjectStatus, setUpdatingSubjectStatus] =
    useState<boolean>(false);

  // States quản lý Module
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [loadingModules, setLoadingModules] = useState<boolean>(true);

  // State Kéo Thả Reorder
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [savingOrder, setSavingOrder] = useState<boolean>(false);

  // State Tạo Module
  const [creatingModule, setCreatingModule] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState("");

  // State Cập nhật Module
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingModule, setEditingModule] = useState<ModuleData | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [updatingModule, setUpdatingModule] = useState<boolean>(false);

  // State Xóa Module
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deletingModuleId, setDeletingModuleId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // States quản lý Syllabus (Chỉ xem & Tải về)
  const [syllabus, setSyllabus] = useState<SyllabusData | null>(null);
  const [loadingSyllabus, setLoadingSyllabus] = useState<boolean>(true);
  const [downloadingSyllabus, setDownloadingSyllabus] =
    useState<boolean>(false);

  // Tải thông tin Môn học
  const fetchSubject = async () => {
    if (!subjectId) return;
    try {
      setLoadingSubject(true);
      const data = await getSubjectByIdAction(subjectId);
      setSubject(data);
    } catch (err) {
      console.error("Lỗi khi lấy thông tin môn học:", err);
    } finally {
      setLoadingSubject(false);
    }
  };

  // Tải thông tin Đề cương
  const fetchSyllabus = async () => {
    if (!subjectId) return;
    try {
      setLoadingSyllabus(true);
      const data = await getSyllabusBySubjectAction(subjectId);
      setSyllabus(data);
    } catch (err) {
      console.error("Lỗi khi lấy thông tin đề cương:", err);
    } finally {
      setLoadingSyllabus(false);
    }
  };

  // Tải danh sách Module (Sắp xếp theo order_index)
  const fetchModules = async () => {
    if (!subjectId) return;
    try {
      setLoadingModules(true);
      const data = await getModulesAction(subjectId);
      const sorted = [...data].sort(
        (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
      );
      setModules(sorted);
    } catch (err) {
      console.error("Lỗi khi lấy danh sách module:", err);
    } finally {
      setLoadingModules(false);
    }
  };

  useEffect(() => {
    fetchSubject();
    fetchSyllabus();
    fetchModules();
  }, [subjectId]);

  // Cập nhật trạng thái MÔN HỌC (Subject)
  const handleToggleSubjectStatus = async (newStatus: SubjectStatus) => {
    if (!subjectId) return;

    try {
      setUpdatingSubjectStatus(true);
      await updateSubjectAction(subjectId, {
        status_id: newStatus,
      });
      await fetchSubject();
    } catch (err: any) {
      alert(
        "Lỗi khi cập nhật trạng thái môn học: " +
          (err.message || "Đã xảy ra lỗi"),
      );
    } finally {
      setUpdatingSubjectStatus(false);
    }
  };

  // XỬ LÝ KÉO THẢ (DRAG & DROP) MODULES
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const updatedModules = [...modules];
    const [movedItem] = updatedModules.splice(draggedIndex, 1);
    updatedModules.splice(targetIndex, 0, movedItem);

    const reindexedModules = updatedModules.map((mod, idx) => ({
      ...mod,
      order_index: idx + 1,
    }));

    setModules(reindexedModules);
    setDraggedIndex(targetIndex);
  };

  const handleDragEnd = async () => {
    setDraggedIndex(null);
    try {
      setSavingOrder(true);
      await Promise.all(
        modules.map((mod) => {
          const targetId = mod.module_id || (mod as any).id;
          return updateModuleAction(targetId, {
            order_index: mod.order_index,
            subject_id: subjectId,
          });
        }),
      );
    } catch (err) {
      console.error("Lỗi cập nhật thứ tự module:", err);
      alert("Không thể lưu thứ tự mới, vui lòng tải lại trang.");
      fetchModules();
    } finally {
      setSavingOrder(false);
    }
  };

  // Download Đề cương
  const handleDownloadSyllabus = async () => {
    if (!syllabus?.syllabus_id) return;
    try {
      setDownloadingSyllabus(true);
      const fileName =
        syllabus.syllabus_file_path?.split("/").pop() ||
        `De_cuong_${subjectId}.pdf`;

      const { base64Data, contentType } = await downloadSyllabusFileAction(
        syllabus.syllabus_id,
      );

      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: contentType });

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      alert("Lỗi khi tải file đề cương: " + (err.message || "Không thể tải"));
    } finally {
      setDownloadingSyllabus(false);
    }
  };

  // Xử lý Tạo Module
  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setCreatingModule(true);
      await createModuleAction({
        subject_id: subjectId,
        syllabus_id: syllabus?.syllabus_id,
        title: newTitle,
        order_index: modules.length + 1,
      });

      setNewTitle("");
      setShowCreateModal(false);
      await fetchModules();
    } catch (err: any) {
      alert("Tạo module thất bại: " + (err.message || "Đã xảy ra lỗi"));
    } finally {
      setCreatingModule(false);
    }
  };

  // Xử lý Cập Nhật Module
  const handleOpenEditModal = (mod: ModuleData) => {
    setEditingModule(mod);
    setEditTitle(mod.title || "");
    setShowEditModal(true);
  };

  const handleUpdateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = editingModule?.module_id || (editingModule as any)?.id;
    if (!targetId || !editTitle.trim()) return;

    try {
      setUpdatingModule(true);
      await updateModuleAction(targetId, {
        title: editTitle.trim(),
        subject_id: subjectId,
      });

      setShowEditModal(false);
      setEditingModule(null);
      await fetchModules();
      alert("Cập nhật Module thành công!");
    } catch (err: any) {
      alert("Cập nhật module thất bại: " + (err.message || "Đã xảy ra lỗi"));
    } finally {
      setUpdatingModule(false);
    }
  };

  // Xử lý Xóa Module
  const handleOpenDeleteModal = (moduleId?: string) => {
    if (!moduleId) {
      alert("Không tìm thấy ID của Module để xóa!");
      return;
    }
    setDeletingModuleId(moduleId);
    setShowDeleteModal(true);
  };

  const handleConfirmDeleteModule = async () => {
    if (!deletingModuleId) return;

    try {
      setDeleting(true);
      await deleteModuleAction(deletingModuleId);
      setShowDeleteModal(false);
      setDeletingModuleId(null);
      await fetchModules();
      alert("Xóa module thành công!");
    } catch (err: any) {
      alert("Xóa module thất bại: " + (err.message || "Đã xảy ra lỗi"));
    } finally {
      setDeleting(false);
    }
  };

  const getFileName = (path?: string) => {
    if (!path) return "";
    return path.split("/").pop() || path;
  };

  const syllabusStatus = getSyllabusStatusBadge(syllabus?.status_id);
  const StatusIcon = syllabusStatus.icon;

  const currentSubjectStatus = subject?.status_id || subject?.status;
  const subjectStatus = getSubjectStatusBadge(currentSubjectStatus);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Navigation & Banner */}
        <div className="space-y-4">
          <button
            onClick={() => router.push("/instructor-management/course-content")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition"
          >
            <ArrowLeft size={18} />
            Quay lại danh sách môn học
          </button>

          {/* Banner Môn Học */}
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                {/* Badge Trạng thái Môn học hiện tại */}
                {loadingSubject ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 animate-pulse">
                    Đang tải...
                  </span>
                ) : (
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${subjectStatus.className}`}
                  >
                    {subjectStatus.text}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
                {subject?.title || subject?.name || "Quản Lý Nội Dung Môn Học"}
              </h1>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Nút 1: Nếu Môn học đang Biên soạn -> Bấm Kích hoạt */}
              {currentSubjectStatus === SubjectStatus.SUBJECT_DEVELOPING && (
                <button
                  type="button"
                  disabled={updatingSubjectStatus}
                  onClick={() =>
                    handleToggleSubjectStatus(SubjectStatus.SUBJECT_ACTIVE)
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {updatingSubjectStatus ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle size={16} />
                  )}
                  Kích hoạt môn học
                </button>
              )}

              {/* Nút 2: Nếu Môn học đang Hoạt động -> Bấm Chuyển về biên soạn */}
              {currentSubjectStatus === SubjectStatus.SUBJECT_ACTIVE && (
                <button
                  type="button"
                  disabled={updatingSubjectStatus}
                  onClick={() =>
                    handleToggleSubjectStatus(SubjectStatus.SUBJECT_DEVELOPING)
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {updatingSubjectStatus ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Undo2 size={16} />
                  )}
                  Chuyển về biên soạn
                </button>
              )}

              <button
                onClick={() =>
                  router.push(`/instructor-management/exam-manage/${subjectId}`)
                }
                className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
              >
                <HelpCircle size={18} className="text-blue-600" />
                Quản lý Quiz
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
              >
                <Plus size={18} />
                Tạo Module Mới
              </button>
            </div>
          </div>
        </div>

        {/* Khối Đề Cương Môn Học (Syllabus) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="text-blue-600" size={20} />
              <h2 className="text-lg font-bold text-slate-900">
                Đề Cương Chi Tiết (Syllabus)
              </h2>
            </div>
            {syllabus && (
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${syllabusStatus.className}`}
                >
                  <StatusIcon size={14} />
                  {syllabusStatus.text}
                </span>
              </div>
            )}
          </div>

          {loadingSyllabus ? (
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex items-center justify-center gap-2 text-slate-500 text-sm">
              <Loader2 className="animate-spin text-blue-600" size={18} />
              <span>Đang tải thông tin đề cương...</span>
            </div>
          ) : syllabus ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-blue-600 shrink-0">
                  <FileText size={22} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">
                    {getFileName(syllabus.syllabus_file_path)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    Đường dẫn: {syllabus.syllabus_file_path}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  disabled={downloadingSyllabus}
                  onClick={handleDownloadSyllabus}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition disabled:opacity-50 shadow-sm"
                >
                  {downloadingSyllabus ? (
                    <Loader2 size={15} className="animate-spin text-blue-600" />
                  ) : (
                    <Download size={15} />
                  )}
                  {downloadingSyllabus ? "Đang tải..." : "Tải về Đề Cương"}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3">
              <AlertCircle size={28} className="text-slate-400" />
              <p className="text-sm text-slate-600">
                Môn học này hiện chưa được cập nhật đề cương chi tiết.
              </p>
            </div>
          )}
        </div>

        {/* Danh sách Modules */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Layers className="text-indigo-600" size={22} />
              Danh Sách Module ({modules.length})
            </h2>
            {savingOrder && (
              <span className="flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 animate-pulse">
                <Loader2 size={14} className="animate-spin" />
                Đang lưu thứ tự mới...
              </span>
            )}
          </div>

          {loadingModules ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 flex items-center justify-center gap-2 text-slate-500 text-sm">
              <Loader2 className="animate-spin text-blue-600" size={20} />
              <span>Đang tải danh sách module...</span>
            </div>
          ) : modules.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500 text-sm">
              Chưa có module nào. Bấm "Tạo Module Mới" để bắt đầu.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {modules.map((mod, index) => {
                const targetId = mod.module_id || (mod as any).id;
                const isDragging = draggedIndex === index;

                return (
                  <div
                    key={targetId}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white rounded-xl border p-5 shadow-sm transition-all duration-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                      isDragging
                        ? "opacity-40 border-dashed border-blue-500 scale-[0.99]"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 max-w-3xl min-w-0 w-full sm:w-auto">
                      <div
                        className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition shrink-0"
                        title="Kéo để thay đổi thứ tự"
                      >
                        <GripVertical size={20} />
                      </div>

                      <div className="space-y-0.5 min-w-0">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                          Module #{mod.order_index ?? index + 1}
                        </span>
                        <h3 className="text-base font-bold text-slate-800 truncate">
                          {mod.title}
                        </h3>
                        <div className="flex items-center gap-4 pt-1 text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1">
                            <FileQuestion
                              size={14}
                              className="text-indigo-500"
                            />
                            {mod.total_lessons ?? 0} Bài học
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(mod)}
                        className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                        title="Chỉnh sửa module"
                      >
                        <Edit3 size={18} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenDeleteModal(targetId)}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                        title="Xóa module"
                      >
                        <Trash2 size={18} />
                      </button>

                      <button
                        onClick={() =>
                          router.push(
                            `/instructor-management/course-content/${subjectId}/modules/${targetId}`,
                          )
                        }
                        className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-semibold transition"
                      >
                        Vào Module & Tạo Lesson
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal Tạo Module Mới */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">
                Tạo Module Mới
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateModule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên Module
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Chương 1: Giới thiệu..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={creatingModule}
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creatingModule}
                  className="inline-flex items-center gap-1 px-4 py-2 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
                >
                  {creatingModule && (
                    <Loader2 size={14} className="animate-spin" />
                  )}
                  {creatingModule ? "Đang tạo..." : "Tạo Module"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cập Nhật Module */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">
                Chỉnh Sửa Module
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateModule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên Module
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tên module mới..."
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={updatingModule}
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={updatingModule}
                  className="inline-flex items-center gap-1 px-4 py-2 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
                >
                  {updatingModule && (
                    <Loader2 size={14} className="animate-spin" />
                  )}
                  {updatingModule ? "Đang lưu..." : "Lưu Thay Đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Xóa Module */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">
                Xác nhận xóa Module?
              </h3>
              <p className="text-xs text-slate-500">
                Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa
                module này không?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingModuleId(null);
                }}
                className="flex-1 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDeleteModule}
                className="flex-1 inline-flex items-center justify-center gap-1 px-4 py-2 text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 rounded-lg transition disabled:opacity-50"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                {deleting ? "Đang xóa..." : "Xóa vĩnh viễn"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
