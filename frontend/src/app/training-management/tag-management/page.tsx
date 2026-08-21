"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { TagItem, TagCreate, TagUpdate } from "@/types/tag";
import { createTag, deleteTag, getTags, updateTag } from "@/actions/tag";
import Navbar from "@/components/Navbar";
import {
  Search,
  ArrowLeft,
  ChevronRight,
  Tag as TagIcon,
  Plus,
  Edit3,
  Trash2,
  X,
  Check,
  Layers,
  AlertCircle,
} from "lucide-react";

export default function TagManagementPage() {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [keyword, setKeyword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  // Form & Selection States
  const [selectedTag, setSelectedTag] = useState<TagItem | null>(null);
  const [formData, setFormData] = useState({ tag_name: "", description: "" });

  // Reset form
  const resetForm = () => {
    setFormData({ tag_name: "", description: "" });
    setSelectedTag(null);
  };

  const loadTags = async () => {
    try {
      setIsLoading(true);

      const data = await getTags(0, 100);

      setTags(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể tải danh sách Tag";

      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTags();
  }, []);

  const handleCreateTag = async () => {
    try {
      const newTag: TagCreate = {
        tag_name: formData.tag_name,
        description: formData.description || null,
      };

      await createTag(newTag);

      await loadTags();

      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không thể tạo Tag");
    }
  };

  // Handler: Edit
  const handleOpenEdit = (tag: TagItem) => {
    setSelectedTag(tag);
    setFormData({ tag_name: tag.tag_name, description: tag.description || "" });
    setShowEditModal(true);
  };

  const handleUpdateTag = async () => {
    if (!selectedTag) return;

    try {
      const updatedTag: TagUpdate = {
        tag_id: selectedTag.tag_id,
        tag_name: formData.tag_name,
        description: formData.description || null,
      };

      await updateTag(updatedTag);

      await loadTags();

      setShowEditModal(false);
      resetForm();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không thể cập nhật Tag");
    }
  };

  // Handler: Delete
  const handleOpenDelete = (tag: TagItem) => {
    setSelectedTag(tag);
    setShowDeleteModal(true);
  };

  const handleDeleteTag = async () => {
    if (!selectedTag) return;

    try {
      await deleteTag(selectedTag.tag_id);

      await loadTags();

      setShowDeleteModal(false);
      resetForm();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không thể xóa Tag");
    }
  };

  const filteredTags = tags.filter(
    (t) =>
      t.tag_name.toLowerCase().includes(keyword.toLowerCase()) ||
      t.description?.toLowerCase().includes(keyword.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased">
      <Navbar />

      {/* HEADER SECTION */}
      <section className="bg-gradient-to-r from-[#0066FF] to-[#0052cc] text-white pt-10 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto space-y-4 relative z-10">
          <div className="flex items-center gap-2 text-xs text-white/80 font-medium">
            <Link
              href="/training-management"
              className="hover:text-white hover:bg-white/20 flex items-center gap-1.5 transition-all bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm border border-white/10"
            >
              <ArrowLeft size={14} /> Quản lý đào tạo
            </Link>
            <ChevronRight size={12} className="opacity-50" />
            <span className="text-white font-semibold tracking-wide flex items-center gap-1.5">
              <TagIcon size={14} /> Quản lý Tag
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight drop-shadow-md">
            QUẢN LÝ DANH MỤC TAG
          </h1>
          <p className="text-sm text-blue-100 max-w-2xl font-medium leading-relaxed">
            Thiết lập và quản lý các Nhãn (Tag) phân loại hệ thống. Các Tag này
            được dùng để gán nhãn cho Khóa học, Môn học và Tài liệu.
          </p>
        </div>
      </section>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-6 -mt-14 pb-20 relative z-20">
        <div className="bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] p-6 md:p-8 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)]">
          {/* TOOLBAR */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="relative flex-1 max-w-md">
              <Search
                size={18}
                className="absolute left-4 top-3.5 text-slate-400"
              />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm kiếm Tag theo tên hoặc mô tả..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#0066FF]/10 focus:border-[#0066FF] transition-all"
              />
            </div>

            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="bg-[#0066FF] hover:bg-blue-700 text-white px-5 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer"
            >
              <Plus size={16} /> Thêm Tag Mới
            </button>
          </div>

          {/* TAGS TABLE / LIST */}
          {filteredTags.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
              <TagIcon size={48} className="text-slate-300" />
              <p className="text-sm font-medium text-slate-500">
                Không tìm thấy Tag nào phù hợp.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-black uppercase tracking-wider">
                    <th className="pb-4 px-4">Tên Tag</th>
                    <th className="pb-4 px-4">Mô tả</th>
                    <th className="pb-4 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredTags.map((tag) => (
                    <tr
                      key={tag.tag_id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-4 px-4">
                        <span className="bg-blue-50 text-[#0066FF] border border-blue-100 px-3 py-1 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 shadow-sm">
                          <TagIcon size={12} />
                          {tag.tag_name}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <p className="text-xs text-slate-600 font-medium line-clamp-1 max-w-md">
                          {tag.description || (
                            <span className="italic text-slate-400">
                              Chưa có mô tả
                            </span>
                          )}
                        </p>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(tag)}
                            className="p-2 text-slate-400 hover:text-[#0066FF] hover:bg-blue-50 rounded-xl transition-all"
                            title="Chỉnh sửa Tag"
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            onClick={() => handleOpenDelete(tag)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="Xóa Tag"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* MODAL: THÊM TAG MỚI */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-8 space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-[#0066FF] rounded-xl">
                  <TagIcon size={20} />
                </div>
                Tạo Tag Mới
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">
                  Tên Tag <span className="text-red-500">*</span>
                </label>
                <input
                  value={formData.tag_name}
                  onChange={(e) =>
                    setFormData({ ...formData, tag_name: e.target.value })
                  }
                  placeholder="Nhập tên tag (VD: DevOps, Next.js...)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-medium focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#0066FF]/10 focus:border-[#0066FF] transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">
                  Mô Tả
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Mô tả phạm vi hoặc ý nghĩa của tag..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-medium focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#0066FF]/10 focus:border-[#0066FF] transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-bold text-slate-600 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleCreateTag}
                className="px-6 py-2.5 bg-[#0066FF] hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all"
              >
                Lưu Tag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CHỈNH SỬA TAG */}
      {showEditModal && selectedTag && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-8 space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-[#0066FF] rounded-xl">
                  <Edit3 size={20} />
                </div>
                Cập Nhật Tag
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">
                  Tên Tag <span className="text-red-500">*</span>
                </label>
                <input
                  value={formData.tag_name}
                  onChange={(e) =>
                    setFormData({ ...formData, tag_name: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-medium focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#0066FF]/10 focus:border-[#0066FF] transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">
                  Mô Tả
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-medium focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#0066FF]/10 focus:border-[#0066FF] transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-bold text-slate-600 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleUpdateTag}
                className="px-6 py-2.5 bg-[#0066FF] hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all"
              >
                Cập Nhật
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: XÁC NHẬN XÓA */}
      {showDeleteModal && selectedTag && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[2rem] max-w-sm w-full p-6 space-y-5 text-center shadow-2xl relative">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={24} />
            </div>

            <div className="space-y-2">
              <h3 className="font-extrabold text-lg text-slate-800">
                Xác Nhận Xóa Tag?
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Bạn có chắc chắn muốn xóa tag{" "}
                <strong className="text-slate-800">
                  "{selectedTag.tag_name}"
                </strong>{" "}
                không? Thao tác này không thể hoàn tác.
              </p>
            </div>

            <div className="flex justify-center gap-3 pt-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteTag}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-500/20"
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
