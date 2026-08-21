"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";

import Navbar from "@/components/Navbar";
import {
  Users,
  ArrowLeft,
  Search,
  X,
  Loader2,
  AlertCircle,
  UserPlus,
  UserMinus,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { getSubjectByIdAction } from "@/actions/getSubject";
import { getTesterListAction } from "@/actions/getUser";
import {
  getSubjectCollaboratorsAction,
  addSubjectCollaboratorAction,
  removeSubjectCollaboratorAction,
} from "@/actions/getCollaborator";
import { SubjectData } from "@/types/subjects";
import { CourseCollaborator } from "@/types/collaborator";
import { UserGeneralInfo } from "@/types/user";

export default function SubjectCollaboratorPage() {
  const router = useRouter();
  const params = useParams();
  const subjectId = params.subject_id as string;

  const [subject, setSubject] = useState<SubjectData | null>(null);
  const [collaborators, setCollaborators] = useState<CourseCollaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [removingId, setRemovingId] = useState<string | null>(null);

  // Modal thêm CTV
  const [showAddModal, setShowAddModal] = useState(false);
  const [testerSearch, setTesterSearch] = useState("");
  const [testers, setTesters] = useState<UserGeneralInfo[]>([]);
  const [testersLoading, setTestersLoading] = useState(false);
  const [testersError, setTestersError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subjectData, collabData] = await Promise.all([
        getSubjectByIdAction(subjectId),
        getSubjectCollaboratorsAction(subjectId),
      ]);
      setSubject(subjectData);
      setCollaborators(collabData || []);
    } catch (err: any) {
      console.error("Lỗi tải dữ liệu cộng tác viên:", err?.message || err);
      setError(err?.message || "Không thể tải dữ liệu môn học.");
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Danh sách Tester để thêm (loại trừ những người đã là CTV), có debounce tìm kiếm
  useEffect(() => {
    if (!showAddModal) return;

    setTestersLoading(true);
    setTestersError(null);

    const timer = setTimeout(() => {
      getTesterListAction(testerSearch)
        .then((res) => {
          if (!res.success) {
            setTestersError(res.message || "Không thể tải danh sách Tester.");
            setTesters([]);
            return;
          }
          setTesters((res.list as UserGeneralInfo[]) || []);
        })
        .catch((err) =>
          setTestersError(err?.message || "Lỗi tải danh sách Tester."),
        )
        .finally(() => setTestersLoading(false));
    }, 350);

    return () => clearTimeout(timer);
  }, [showAddModal, testerSearch]);

  const assignedIds = new Set(collaborators.map((c) => c.collaborator_id));
  const availableTesters = testers.filter((t) => !assignedIds.has(t.user_id));

  async function handleRemove(collaboratorId: string) {
    setRemovingId(collaboratorId);
    try {
      await removeSubjectCollaboratorAction(subjectId, collaboratorId);
      setCollaborators((prev) =>
        prev.filter((c) => c.collaborator_id !== collaboratorId),
      );
    } catch (err: any) {
      alert(err?.message || "Không thể xóa cộng tác viên này.");
    } finally {
      setRemovingId(null);
    }
  }

  async function handleAdd(tester: UserGeneralInfo) {
    setAddingId(tester.user_id);
    try {
      const newLink = await addSubjectCollaboratorAction(
        subjectId,
        tester.user_id,
      );
      setCollaborators((prev) => [
        ...prev,
        { ...newLink, username: tester.username },
      ]);
    } catch (err: any) {
      alert(err?.message || "Không thể thêm cộng tác viên này.");
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 font-sans">
      <Navbar />

      {/* Hero Header - Đã đổi tông màu Xanh Dương chuẩn như Banner LUMER */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#0052CC] via-[#0066FF] to-[#3B82F6] text-white py-12 px-6 shadow-lg">
        {/* Hiệu ứng mảng sáng mờ nền */}
        <div className="absolute -top-12 -right-12 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 right-1/3 w-80 h-80 bg-blue-300/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <button
              onClick={() =>
                router.push("/instructor-management/collaborator-manage")
              }
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/25 px-3 py-1.5 rounded-full backdrop-blur-md transition-all active:scale-95"
            >
              <ArrowLeft size={14} /> Danh sách môn học
            </button>

            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider bg-white/20 text-blue-50 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/20">
              <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse" />
              Phân công Cộng Tác Viên
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
            {subject?.title || "Đang tải môn học..."}
          </h1>
          <p className="text-blue-100/90 mt-2 text-sm md:text-base max-w-2xl leading-relaxed font-normal">
            Quản lý và phân công đội ngũ Kiểm thử (Tester) hỗ trợ đánh giá, tối
            ưu nội dung cho môn học này.
          </p>
        </div>
      </section>

      {/* Nội dung chính */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <Loader2 size={36} className="animate-spin text-[#0066FF]" />
            <p className="text-sm font-semibold text-slate-600">
              Đang tải danh sách cộng tác viên...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-700 text-sm flex items-center justify-center gap-2 shadow-sm">
            <AlertCircle size={20} className="shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {!loading && !error && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-slate-100 bg-slate-50/40">
              <div className="flex items-center gap-2.5 text-slate-800">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center shrink-0 border border-blue-100">
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-none">
                    Cộng tác viên đã phân công
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-normal">
                    Tổng số:{" "}
                    <strong className="text-blue-600">
                      {collaborators.length}
                    </strong>{" "}
                    Tester
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center justify-center gap-2 bg-[#0066FF] hover:bg-[#0052CC] text-white font-semibold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-blue-500/20 active:scale-95"
              >
                <UserPlus size={16} />
                Thêm cộng tác viên
              </button>
            </div>

            {/* Danh sách CTV */}
            {collaborators.length === 0 ? (
              <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-blue-50/60 flex items-center justify-center text-blue-500 border border-blue-100">
                  <Users size={32} />
                </div>
                <h4 className="text-base font-bold text-slate-800">
                  Môn học chưa có cộng tác viên
                </h4>
                <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                  Nhấn{" "}
                  <span className="font-semibold text-blue-600">
                    "Thêm cộng tác viên"
                  </span>{" "}
                  ở trên để tìm và phân công Tester tham gia hỗ trợ kiểm thử.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {collaborators.map((c) => (
                  <li
                    key={c.collab_id}
                    className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-blue-50/30 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#0052CC] to-[#3B82F6] text-white text-sm font-bold shadow-sm">
                        {(c.username || "?")[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-800 truncate">
                            {c.username || "Không xác định tên"}
                          </p>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200/60">
                            <ShieldCheck size={11} /> Tester
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemove(c.collaborator_id)}
                      disabled={removingId === c.collaborator_id}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 bg-rose-50/50 hover:bg-rose-100/80 hover:border-rose-300 transition-all disabled:opacity-50 shrink-0 active:scale-95"
                    >
                      {removingId === c.collaborator_id ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          Đang xóa...
                        </>
                      ) : (
                        <>
                          <UserMinus size={14} />
                          Xóa
                        </>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>

      {/* Modal thêm CTV */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowAddModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-slate-100"
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0066FF] flex items-center justify-center">
                  <UserPlus size={18} />
                </div>
                Thêm cộng tác viên mới
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Thanh tìm kiếm */}
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  autoFocus
                  placeholder="Tìm theo tên hoặc email Tester..."
                  value={testerSearch}
                  onChange={(e) => setTesterSearch(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-[#0066FF] focus:ring-4 focus:ring-[#0066FF]/10 transition"
                />
              </div>
            </div>

            {/* Danh sách kết quả */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {testersLoading && (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-500">
                  <Loader2 size={24} className="animate-spin text-[#0066FF]" />
                  <p className="text-xs font-medium text-slate-500">
                    Đang tìm kiếm Tester...
                  </p>
                </div>
              )}

              {!testersLoading && testersError && (
                <div className="p-6 text-center text-rose-600 text-sm flex items-center justify-center gap-2">
                  <AlertCircle size={16} />
                  {testersError}
                </div>
              )}

              {!testersLoading &&
                !testersError &&
                availableTesters.length === 0 && (
                  <div className="p-10 text-center text-slate-500 text-sm">
                    {testerSearch
                      ? `Không tìm thấy Tester nào khớp với từ khóa "${testerSearch}".`
                      : "Không còn Tester nào khả dụng để thêm vào môn học này."}
                  </div>
                )}

              {!testersLoading &&
                !testersError &&
                availableTesters.length > 0 && (
                  <ul className="divide-y divide-slate-100">
                    {availableTesters.map((t) => (
                      <li
                        key={t.user_id}
                        className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50 transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                            {t.username?.[0]?.toUpperCase() ?? "?"}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {t.username}
                            </p>
                            <p className="text-xs text-slate-400 flex items-center gap-1 truncate mt-0.5">
                              <Mail size={11} className="shrink-0" /> {t.email}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleAdd(t)}
                          disabled={addingId === t.user_id}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 transition-all disabled:opacity-50 shrink-0 active:scale-95"
                        >
                          {addingId === t.user_id ? (
                            <>
                              <Loader2 size={13} className="animate-spin" />
                              Đang thêm...
                            </>
                          ) : (
                            <>
                              <UserPlus size={13} />
                              Thêm
                            </>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
