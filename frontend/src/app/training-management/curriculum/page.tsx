"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  Plus,
  Pencil,
  Trash2,
  FileText,
  Layers,
  Type,
  Award,
  Clock,
  X,
  UploadCloud,
  ArrowLeft,
  Sparkles,
  Loader2,
} from "lucide-react";

import {
  getCurriculums,
  uploadCurriculums,
  createCurriculum,
  updateCurriculum,
  deleteCurriculum,
} from "@/actions/getCurriculum";

type DisplayStatus = "Bản nháp" | "Thẩm định" | "Đang hoạt động" | "Tạm ngưng";

interface Curriculum {
  curriculum_id: string;
  assigner_id: string | null;
  curriculum_name: string;
  description: string;
  course_type: string;
  course_finished_months: number;
  curriculum_file_path: string | null;
  certificate_name: string;
  status_id: string;
}

const STATUS_MAP_TO_FRONTEND: Record<string, DisplayStatus> = {
  CURRICULUM_DRAFT: "Bản nháp",
  CURRICULUM_REVIEWING: "Thẩm định",
  CURRICULUM_ACTIVE: "Đang hoạt động",
  CURRICULUM_SUSPENDED: "Tạm ngưng",
};

const STATUS_MAP_TO_BACKEND: Record<DisplayStatus, string> = {
  "Bản nháp": "CURRICULUM_DRAFT",
  "Thẩm định": "CURRICULUM_REVIEWING",
  "Đang hoạt động": "CURRICULUM_ACTIVE",
  "Tạm ngưng": "CURRICULUM_SUSPENDED",
};

const getFileNameFromUrl = (url: string | null): string => {
  if (!url) return "Chưa có file đính kèm";
  const parts = url.split("/");
  const rawFileName = parts[parts.length - 1];
  if (rawFileName.includes("-") && rawFileName.length > 37) {
    return rawFileName.substring(rawFileName.indexOf("-") + 1);
  }
  return rawFileName;
};

const MEDIA_BASE_URL =
  process.env.NEXT_PUBLIC_MEDIA_URL || "http://127.0.0.1:8081";

const getFullAssetUrl = (url: string | null): string => {
  if (!url) return "";
  // Nếu là full URL cũ (có domain/port cứng) -> chỉ lấy phần path, bỏ domain gốc
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const parsed = new URL(url);
      return `${MEDIA_BASE_URL}${parsed.pathname}`;
    } catch {
      return url;
    }
  }
  const cleanUrl = url.startsWith("/") ? url : `/${url}`;
  return `${MEDIA_BASE_URL}${cleanUrl}`;
};
interface FormDataState {
  curriculumName: string;
  description: string;
  courseFinishedMonths: number;
  status: DisplayStatus;
  certificateName: string;
  courseType: string;
  syllabusFile: File | null;
}

export default function LumerCurriculumManagement() {
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // --- STATES PHỤC VỤ BỘ LỌC ---
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const [selectedCurriculum, setSelectedCurriculum] =
    useState<Curriculum | null>(null);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [formData, setFormData] = useState<FormDataState>({
    curriculumName: "",
    description: "",
    courseFinishedMonths: 3,
    status: "Bản nháp",
    certificateName: "",
    courseType: "SHORT_TERM",
    syllabusFile: null,
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const data = await getCurriculums();
      setCurriculums(data || []);
      if (data && data.length > 0) {
        setSelectedCurriculum(data[0]);
      } else {
        setSelectedCurriculum(null);
      }
    } catch (error: any) {
      console.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (curriculumId: string, e: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Bạn có chắc chắn muốn xóa không?")) return;
    setIsLoading(true);
    try {
      await deleteCurriculum(curriculumId);
      alert("Xóa thành công!");
      fetchInitialData();
    } catch (error: any) {
      alert(`Thao tác thất bại: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const curriculumPayload = {
        curriculum_name: formData.curriculumName.trim(),
        description: formData.description?.trim() || null,
        course_type: formData.courseType,
        course_finished_months: Number(formData.courseFinishedMonths),
        certificate_name: formData.certificateName?.trim() || null,
        status_id:
          isEditMode && selectedCurriculum
            ? selectedCurriculum.status_id
            : "CURRICULUM_DRAFT",

        curriculum_file_path: selectedCurriculum?.curriculum_file_path || null,
      } as any;

      let targetCurriculumId = "";

      if (isEditMode && selectedCurriculum) {
        targetCurriculumId = selectedCurriculum.curriculum_id;
        await updateCurriculum(targetCurriculumId, curriculumPayload);
      } else {
        const newCurriculum = await createCurriculum(curriculumPayload);
        targetCurriculumId = newCurriculum?.curriculum_id;

        if (!targetCurriculumId) {
          throw new Error(
            "Không lấy được ID của chương trình đào tạo mới khởi tạo.",
          );
        }
      }

      if (formData.syllabusFile && targetCurriculumId) {
        const dataForm = new FormData();
        dataForm.append("file", formData.syllabusFile);

        const uploadRes = await uploadCurriculums(dataForm, targetCurriculumId);
        const uploadedFilePath = uploadRes?.file_path || null;

        if (uploadedFilePath) {
          curriculumPayload.curriculum_file_path = uploadedFilePath;
          await updateCurriculum(targetCurriculumId, curriculumPayload);
        }
      }
      alert(isEditMode ? "Cập nhật thành công!" : "Khởi tạo thành công!");
      setIsOpenModal(false);
      await fetchInitialData();
    } catch (error: any) {
      alert(`Thao tác thất bại: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFormData((prev) => ({ ...prev, syllabusFile: e.target.files![0] }));
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setFormData({
      curriculumName: "",
      description: "",
      courseFinishedMonths: 3,
      status: "Bản nháp",
      certificateName: "",
      courseType: "SHORT_TERM",
      syllabusFile: null,
    });
    setIsOpenModal(true);
  };

  const openEditModal = (curriculum: Curriculum, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setSelectedCurriculum(curriculum);
    setFormData({
      curriculumName: curriculum.curriculum_name,
      description: curriculum.description || "",
      courseFinishedMonths: curriculum.course_finished_months,
      status: STATUS_MAP_TO_FRONTEND[curriculum.status_id] || "Bản nháp",
      certificateName: curriculum.certificate_name || "",
      courseType: curriculum.course_type,
      syllabusFile: null,
    });
    setIsOpenModal(true);
  };

  const filteredCurriculums = useMemo(() => {
    return curriculums.filter((c) => {
      const matchesSearch = c.curriculum_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesType = filterType === "ALL" || c.course_type === filterType;
      const matchesStatus =
        filterStatus === "ALL" || c.status_id === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [curriculums, searchTerm, filterType, filterStatus]);

  const stats = useMemo(() => {
    const total = curriculums.length;
    const active = curriculums.filter(
      (c) => c.status_id === "CURRICULUM_ACTIVE",
    ).length;
    const draft = curriculums.filter(
      (c) => c.status_id === "CURRICULUM_DRAFT",
    ).length;
    const totalMonths = curriculums.reduce(
      (sum, c) => sum + c.course_finished_months,
      0,
    );
    const avgMonths =
      total > 0 ? parseFloat((totalMonths / total).toFixed(1)) : 0;

    return { total, active, draft, avgMonths };
  }, [curriculums]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased">
      <Navbar />

      <section className="relative overflow-hidden bg-gradient-to-r from-[#0066FF] to-[#0052cc] px-6 pb-24 pt-10 text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-cyan-200 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-white/80">
            <Link
              href="/training-management"
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 shadow-sm backdrop-blur-md transition-all hover:bg-white/20 hover:text-white"
            >
              <ArrowLeft size={14} />
              Quản lý đào tạo
            </Link>
            <span className="opacity-50">/</span>
            <span className="font-semibold tracking-wide text-white">
              Chương trình đào tạo mẫu
            </span>
          </div>

          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-black uppercase tracking-tight drop-shadow-md md:text-4xl">
                QUẢN LÝ CHƯƠNG TRÌNH ĐÀO TẠO
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-blue-100">
                Thiết kế cấu trúc lộ trình học và quản lý file nội dung chương
                trình đào tạo của hệ thống.
              </p>
            </div>

            <button
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2 self-start rounded-2xl bg-white px-5 py-3 text-xs font-black text-[#0066FF] shadow-md transition-all hover:bg-blue-50 active:scale-95 md:self-auto"
            >
              <Plus size={16} />
              Tạo chương trình mới
            </button>
          </div>
        </div>
      </section>

      <main className="relative z-20 mx-auto -mt-14 w-full max-w-7xl px-6 pb-20">
        <div className="rounded-[2rem] border border-white bg-white/80 p-6 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] backdrop-blur-xl md:p-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="flex min-h-24 flex-col justify-center rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-sm">
              <div className="text-xl font-black text-[#0066FF]">
                {stats.total}
              </div>
              <div className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mt-1">
                Tổng chương trình
              </div>
            </div>
            <div className="flex min-h-24 flex-col justify-center rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-sm">
              <div className="text-xl font-black text-green-600">
                {stats.active}
              </div>
              <div className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mt-1">
                Đang hoạt động
              </div>
            </div>
            <div className="flex min-h-24 flex-col justify-center rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-sm">
              <div className="text-xl font-black text-amber-500">
                {stats.draft}
              </div>
              <div className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mt-1">
                Bản nháp tạm lưu
              </div>
            </div>
            <div className="flex min-h-24 flex-col justify-center rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-sm">
              <div className="text-xl font-black text-purple-600">
                {stats.avgMonths} tháng
              </div>
              <div className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mt-1">
                Thời gian học TB
              </div>
            </div>
          </div>

          <div className="pt-8">
            <div className="flex flex-col flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row">
              <div className="w-full sm:flex-1 min-w-[240px]">
                <input
                  type="text"
                  placeholder="Tìm theo tên chương trình đào tạo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:outline-blue-500 shadow-2xs text-gray-800 font-medium"
                />
              </div>

              <div className="w-full sm:w-48">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700 focus:outline-blue-500 shadow-2xs cursor-pointer"
                >
                  <option value="ALL">Loại hình: Tất cả</option>
                  <option value="SHORT_TERM">Ngắn hạn (SHORT_TERM)</option>
                  <option value="LONG_TERM">Dài hạn (LONG_TERM)</option>
                </select>
              </div>

              <div className="w-full sm:w-48">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700 focus:outline-blue-500 shadow-2xs cursor-pointer"
                >
                  <option value="ALL">Trạng thái: Tất cả</option>
                  <option value="CURRICULUM_DRAFT">Bản nháp</option>
                  <option value="CURRICULUM_REVIEWING">Thẩm định</option>
                  <option value="CURRICULUM_ACTIVE">Đang hoạt động</option>
                  <option value="CURRICULUM_SUSPENDED">Tạm ngưng</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Danh sách chương trình học ({filteredCurriculums.length})
              </div>

              {isLoading ? (
                <div className="text-center py-12 text-xs text-gray-500 font-medium bg-white border rounded-2xl">
                  Đang đồng bộ dữ liệu máy chủ...
                </div>
              ) : (
                filteredCurriculums.map((c) => (
                  <div
                    key={c.curriculum_id}
                    onClick={() => setSelectedCurriculum(c)}
                    className={`flex cursor-pointer flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm transition-all ${selectedCurriculum?.curriculum_id === c.curriculum_id ? "border-[#0066FF] bg-blue-50/30 ring-4 ring-blue-50" : "border-slate-200 hover:border-blue-200 hover:shadow-md"}`}
                  >
                    <div className="flex items-start justify-between w-full">
                      <div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            STATUS_MAP_TO_FRONTEND[c.status_id] ===
                            "Đang hoạt động"
                              ? "bg-green-50 text-green-600"
                              : STATUS_MAP_TO_FRONTEND[c.status_id] ===
                                  "Bản nháp"
                                ? "bg-amber-50 text-amber-600"
                                : STATUS_MAP_TO_FRONTEND[c.status_id] ===
                                    "Thẩm định"
                                  ? "bg-blue-50 text-blue-600"
                                  : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {STATUS_MAP_TO_FRONTEND[c.status_id] || "Bản nháp"}
                        </span>
                        <h3 className="text-sm font-bold text-gray-900 mt-2 mb-1">
                          {c.curriculum_name}
                        </h3>
                      </div>

                      <div
                        className="flex items-center gap-1.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => openEditModal(c, e)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-600 text-[#0066FF] hover:text-white border-none rounded-lg cursor-pointer text-[11px] font-bold transition-all flex items-center gap-0.5"
                        >
                          <Pencil size={11} /> Sửa
                        </button>
                        <button
                          onClick={(e) => handleDelete(c.curriculum_id, e)}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-600 text-red-500 hover:text-white border-none rounded-lg cursor-pointer text-[11px] font-bold transition-all flex items-center gap-0.5"
                        >
                          <Trash2 size={11} /> Xóa
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                      {c.description ||
                        "Chương trình hiện chưa tích hợp mô tả tóm tắt hệ thống."}
                    </p>

                    <div className="border-t border-gray-50 pt-3 flex items-center justify-between gap-2 text-[11px] font-semibold text-gray-500">
                      <span>
                        ⏱ Thời lượng: {c.course_finished_months} tháng
                      </span>
                      <span className="text-[#0066FF] truncate max-w-50">
                        File: {getFileNameFromUrl(c.curriculum_file_path)}
                      </span>
                    </div>
                  </div>
                ))
              )}

              {!isLoading && filteredCurriculums.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 text-xs text-gray-400">
                  Chưa tìm thấy chương trình học nào khớp.
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Thông tin chi tiết đính kèm
              </div>

              {selectedCurriculum ? (
                <div className="sticky top-4 space-y-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#0066FF]"></div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Đang xem cấu trúc:
                    </h4>
                    <h2 className="text-sm font-black text-gray-900 leading-snug">
                      {selectedCurriculum.curriculum_name}
                    </h2>
                  </div>

                  <div className="text-xs space-y-2 border-t border-gray-50 pt-3 font-medium">
                    <p className="text-gray-600">
                      <span className="text-gray-400">
                        ⏱ Thời lượng dự kiến:
                      </span>{" "}
                      {selectedCurriculum.course_finished_months} tháng
                    </p>
                    <p className="text-gray-600">
                      <span className="text-gray-400">🏅 Loại hình:</span>{" "}
                      {selectedCurriculum.course_type}
                    </p>
                    <p className="text-gray-600">
                      <span className="text-gray-400">
                        🏅 Chứng chỉ cấp phát:
                      </span>{" "}
                      {selectedCurriculum.certificate_name || "N/A"}
                    </p>
                    <div className="pt-1">
                      <span className="text-gray-400 block mb-1">
                        📁 File học liệu đính kèm:
                      </span>
                      {selectedCurriculum.curriculum_file_path ? (
                        <a
                          href={getFullAssetUrl(
                            selectedCurriculum.curriculum_file_path,
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#0066FF] font-bold hover:underline break-all block no-underline bg-blue-50/50 p-2 rounded-xl border border-blue-100/50"
                        >
                          📥{" "}
                          {getFileNameFromUrl(
                            selectedCurriculum.curriculum_file_path,
                          )}
                        </a>
                      ) : (
                        <span className="text-gray-400 italic font-medium block p-2 bg-gray-50 rounded-lg text-center">
                          Chưa cung cấp file tài liệu
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-150">
                    <button
                      onClick={() => openEditModal(selectedCurriculum)}
                      className="w-full bg-[#0066FF] hover:bg-blue-700 text-white font-bold py-2 rounded-xl transition border-none text-xs cursor-pointer shadow-sm"
                    >
                      ✏️ Sửa đổi
                    </button>
                    <button
                      onClick={(e) =>
                        handleDelete(selectedCurriculum.curriculum_id, e)
                      }
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-xl transition border-none text-xs cursor-pointer shadow-sm"
                    >
                      🗑️ Xóa bỏ
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center text-xs text-gray-400">
                  Vui lòng chọn một chương trình đào tạo ở danh sách bên cạnh.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* --- FORM MODAL ĐÃ ĐƯỢC TỐI ƯU NÚT THOÁT ĐẸP HƠN --- */}
      {isOpenModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-[6px] flex items-center justify-center p-4 z-50 transition-all duration-300">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-blue-50/20">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl text-white shadow-xs ${isEditMode ? "bg-amber-500 shadow-amber-500/20" : "bg-[#0066FF] shadow-blue-500/20"}`}
                >
                  {isEditMode ? <Sparkles size={18} /> : <Plus size={18} />}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    {isEditMode
                      ? "Cập nhật chương trình"
                      : "Thiết kế chương trình mới"}
                  </h3>
                </div>
              </div>

              {/* Nút X thoát góc phải trên tinh tế */}
              <button
                type="button"
                onClick={() => setIsOpenModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 border-none bg-transparent cursor-pointer transition-all active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={handleSubmit}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-500 font-bold bg-white custom-scrollbar flex-1">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <Type size={13} className="text-slate-400" /> Tên chương
                    trình đào tạo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Kỹ nghệ phần mềm chuyên sâu"
                    value={formData.curriculumName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        curriculumName: e.target.value,
                      }))
                    }
                    className="w-full border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-3 font-medium text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/10 focus:border-[#0066FF] text-xs bg-slate-50/50 focus:bg-white transition-all duration-200"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <FileText size={13} className="text-slate-400" /> Mô tả tóm
                    tắt chương trình
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Tóm lược mục tiêu và cấu trúc lộ trình để hiển thị nội bộ..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="w-full border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-3 font-medium text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/10 focus:border-[#0066FF] text-xs bg-slate-50/50 focus:bg-white transition-all duration-200 resize-none leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <Clock size={13} className="text-slate-400" /> Số tháng
                      hoàn thành <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={48}
                      value={formData.courseFinishedMonths}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          courseFinishedMonths: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-full border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-3 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/10 focus:border-[#0066FF] text-xs bg-slate-50/50 focus:bg-white transition-all duration-200"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <Layers size={13} className="text-slate-400" /> Loại
                      chương trình
                    </label>
                    <select
                      value={formData.courseType}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          courseType: e.target.value,
                        }))
                      }
                      className="w-full border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/10 focus:border-[#0066FF] text-xs bg-slate-50/50 focus:bg-white transition-all duration-200 cursor-pointer"
                    >
                      <option value="SHORT_TERM">Ngắn hạn (SHORT_TERM)</option>
                      <option value="LONG_TERM">Dài hạn (LONG_TERM)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* {isEditMode && (
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        📌 Trạng thái phát hành
                      </label>
                      <select 
                        value={formData.status} 
                        onChange={(e) => setFormData(prev => ({...prev, status: e.target.value as DisplayStatus}))} 
                        className="w-full border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/10 focus:border-[#0066FF] text-xs bg-slate-50/50 focus:bg-white transition-all duration-200 cursor-pointer"
                      >
                        <option value="Bản nháp">Bản nháp (CURRICULUM_DRAFT)</option>
                        <option value="Thẩm định">Thẩm định (CURRICULUM_REVIEWING)</option>
                        <option value="Đang hoạt động">Đang hoạt động (CURRICULUM_ACTIVE)</option>
                        <option value="Tạm ngưng">Tạm ngưng (CURRICULUM_SUSPENDED)</option>
                      </select>
                    </div>
                  )} */}
                  <div
                    className={
                      isEditMode ? "space-y-1.5" : "col-span-2 space-y-1.5"
                    }
                  >
                    <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <Award size={13} className="text-slate-400" /> Tên chứng
                      chỉ cấp phát
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: LUMER Certified Engineer"
                      value={formData.certificateName}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          certificateName: e.target.value,
                        }))
                      }
                      className="w-full border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-3 font-medium text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/10 focus:border-[#0066FF] text-xs bg-slate-50/50 focus:bg-white transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <UploadCloud size={13} className="text-slate-400" />{" "}
                    {isEditMode
                      ? "Thay đổi file đính kèm"
                      : "Tải lên tập tin học liệu"}
                  </label>
                  <div className="flex items-center gap-3 bg-slate-50 p-3 border border-dashed border-slate-200 rounded-xl">
                    <label className="bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 border border-slate-200 rounded-xl cursor-pointer transition-all shadow-2xs inline-flex items-center gap-1.5 text-xs whitespace-nowrap active:scale-[0.98]">
                      📁 Chọn File (.pdf, .docx, .xlsx)
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.docx,.xlsx"
                        onChange={handleFileChange}
                      />
                    </label>
                    <span className="text-slate-400 font-medium italic text-xs truncate flex-1">
                      {formData.syllabusFile
                        ? formData.syllabusFile.name
                        : isEditMode
                          ? "Giữ nguyên file cũ đã lưu"
                          : "Chưa chọn tập tin"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="px-4.5 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-bold cursor-pointer transition-all active:scale-95 shadow-2xs"
                  disabled={isLoading}
                >
                  Đóng lại
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-white font-extrabold rounded-xl text-xs border-none cursor-pointer transition-all active:scale-95 shadow-md flex items-center gap-2 bg-[#0066FF] hover:bg-blue-600 shadow-blue-500/10 disabled:opacity-60"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Đang ghi nhận...
                    </>
                  ) : (
                    <>{isEditMode ? "Cập nhật dữ liệu" : "Xác nhận tạo mới"}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
