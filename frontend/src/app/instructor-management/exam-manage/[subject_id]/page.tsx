"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import QuestionPoolManager from "@/components/exam-management/QuestionPoolManager";
import CreateQuizDrawer from "@/components/exam-management/CreateQuizDrawer";
import EditQuizModal from "@/components/exam-management/EditQuizModal";
import {
  Quiz,
  QuizCreatePayload,
  QuizUpdatePayload,
} from "@/types/exam-management";
import {
  getQuizzesAction,
  createQuizAction,
  deleteQuizAction,
  updateQuizAction,
} from "@/actions/getQuizzes";
import {
  HelpCircle,
  FileText,
  Users,
  Link2,
  ArrowLeft,
  Plus,
  Search,
  Loader2,
  SearchX,
  Layers,
} from "lucide-react";

export default function SubjectDetailPage({
  params,
}: {
  params: Promise<{ subject_id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const subjectId = resolvedParams.subject_id;

  const [activeTab, setActiveTab] = useState<"QUIZZES" | "POOLS">("QUIZZES");

  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchQuizzes = useCallback(
    async (searchQuery: string = "") => {
      setIsLoadingQuizzes(true);
      try {
        const data = await getQuizzesAction(subjectId, searchQuery);
        setQuizzes(data);
      } catch (error) {
        console.error("Lỗi khi tải danh sách bài thi:", error);
      } finally {
        setIsLoadingQuizzes(false);
      }
    },
    [subjectId],
  );

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const handleDeleteQuiz = async (quizId: string, title: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa bài thi "${title}" không?`)) {
      const result = await deleteQuizAction(
        quizId,
        `/instructor-management/exam-manage/${subjectId}`,
      );
      if (result.success) {
        setQuizzes((prev) => prev.filter((q) => q.quiz_id !== quizId));
      } else {
        alert(`Lỗi khi xóa bài thi: ${result.error}`);
      }
    }
  };

  const handleCreateQuizSuccess = async (newQuizData: any) => {
    const payload: QuizCreatePayload = {
      title: newQuizData.title,
      description: newQuizData.description,
      subject_id: subjectId,
      duration_minutes: newQuizData.duration_minutes,
      passing_percentage: newQuizData.passing_percentage,
      max_attempts: newQuizData.max_attempts,
      quiz_type: newQuizData.quiz_type,
      placement_type: newQuizData.placement_type,
      target_lesson_id: newQuizData.target_lesson_id || null,
      is_peer_review: newQuizData.is_peer_review,
    };

    const result = await createQuizAction(
      payload,
      `/instructor-management/exam-manage/${subjectId}`,
    );
    if (result.success) {
      alert("Tạo bài kiểm tra mới thành công!");
      setIsCreateDrawerOpen(false);
      await fetchQuizzes();
    } else {
      alert(`Lỗi khi tạo bài thi: ${result.error}`);
    }
  };

  const handleEditQuizSuccess = async (updatedData: Partial<Quiz>) => {
    if (!editingQuiz) return;

    const payload: QuizUpdatePayload = {
      title: updatedData.title,
      description: updatedData.description,
      duration_minutes: updatedData.duration_minutes,
      passing_percentage: updatedData.passing_percentage,
      max_attempts: updatedData.max_attempts,
      placement_type: updatedData.placement_type,
      target_lesson_id: updatedData.target_lesson_id || null,
      is_active: updatedData.is_active,
    };

    const result = await updateQuizAction(
      editingQuiz.quiz_id,
      payload,
      `/instructor-management/exam-manage/${subjectId}`,
    );

    if (!result.success) {
      alert(`Lỗi khi cập nhật bài thi: ${result.error}`);
      return;
    }

    setQuizzes((prev) =>
      prev.map((q) =>
        q.quiz_id === editingQuiz.quiz_id
          ? { ...q, ...(result.data || updatedData) }
          : q,
      ),
    );
    setEditingQuiz(null);
    alert("Cập nhật bài thi thành công!");
  };

  const filteredQuizzes = quizzes.filter(
    (q) =>
      q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.quiz_id.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Header Thông tin Môn học & Thao tác */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <button
            onClick={() => router.push("/instructor-management/exam-manage")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft size={16} />
            Quay lại danh sách môn học
          </button>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Quản lý Bài thi & Kho câu hỏi
              </h1>
            </div>

            <button
              onClick={() => setIsCreateDrawerOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-semibold text-xs rounded-xl hover:bg-blue-700 shadow-sm transition"
            >
              <Plus size={16} />
              Tạo bài thi mới
            </button>
          </div>
        </div>

        {/* Thanh Điều Hướng Tabs (Đồng bộ với QuestionBankDetailPage) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 px-6 pt-4 shadow-sm">
          <div className="flex items-center gap-6 border-b border-slate-200 pb-px overflow-x-auto">
            <Link
              href={`/instructor-management/questions-bank/${subjectId}`}
              className="pb-3 text-sm font-medium transition border-b-2 border-transparent text-slate-500 hover:text-slate-900 flex items-center gap-2 whitespace-nowrap"
            >
              <HelpCircle size={18} />
              Ngân hàng câu hỏi
            </Link>

            <span className="h-4 w-px bg-slate-200 -mt-3 hidden sm:inline-block" />

            <button
              onClick={() => setActiveTab("QUIZZES")}
              className={`pb-3 text-sm transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
                activeTab === "QUIZZES"
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-800 font-medium"
              }`}
            >
              <FileText size={18} />
              Danh sách Bài thi ({quizzes.length})
            </button>

            <button
              onClick={() => setActiveTab("POOLS")}
              className={`pb-3 text-sm transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
                activeTab === "POOLS"
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-800 font-medium"
              }`}
            >
              <Layers size={18} />
              Kho câu hỏi (Pools)
            </button>
          </div>
        </div>

        {/* Nội dung chính theo Tab */}
        {activeTab === "QUIZZES" ? (
          <div className="space-y-4">
            {/* Thanh Tìm kiếm */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-2">
              <Search size={18} className="text-slate-400 ml-2" />
              <input
                type="text"
                placeholder="Tìm kiếm bài thi theo tên hoặc mã..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs sm:text-sm bg-transparent outline-none placeholder:text-slate-400"
              />
            </div>

            {/* Bảng Danh sách Bài thi */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50/80 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200/80">
                    <tr>
                      <th className="p-4">Tên bài kiểm tra</th>
                      <th className="p-4">Cấu hình</th>
                      <th className="p-4">Thời lượng</th>
                      <th className="p-4">Trạng thái</th>
                      <th className="p-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingQuizzes ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-12 text-center text-slate-500"
                        >
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2
                              size={28}
                              className="animate-spin text-blue-600"
                            />
                            <span className="text-xs font-medium">
                              Đang tải danh sách bài thi...
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredQuizzes.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-12 text-center text-slate-500"
                        >
                          <div className="flex flex-col items-center justify-center gap-2">
                            <SearchX size={32} className="text-slate-400" />
                            <span className="text-xs font-medium text-slate-600">
                              {searchTerm
                                ? "Không tìm thấy bài thi nào phù hợp."
                                : "Chưa có bài thi nào trong môn học này."}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredQuizzes.map((qz) => (
                        <tr
                          key={qz.quiz_id}
                          className="hover:bg-slate-50/60 transition duration-150"
                        >
                          <td className="p-4">
                            <p className="font-semibold text-slate-900 text-sm">
                              {qz.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {qz.is_peer_review && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                  <Users size={12} />
                                  Chấm chéo
                                </span>
                              )}

                              {qz.target_lesson_id && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                  <Link2 size={12} />
                                  Đã gắn bài học
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-slate-600">
                            <span className="font-medium">
                              {qz.quiz_type === "FIXED_QUESTION"
                                ? "Đề cố định"
                                : "Đề ngẫu nhiên"}
                            </span>
                          </td>
                          <td className="p-4 text-slate-600">
                            {qz.duration_minutes} phút
                          </td>
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${qz.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"}`}
                            >
                              {qz.is_active ? "Hoạt động" : "Đã ẩn"}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 text-xs font-semibold">
                              <Link
                                href={`/instructor-management/exam-manage/${subjectId}/quiz/${qz.quiz_id}`}
                                className="px-2.5 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              >
                                Cấu hình
                              </Link>
                              <span className="text-slate-300">|</span>
                              <button
                                onClick={() => setEditingQuiz(qz)}
                                className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition"
                              >
                                Sửa
                              </button>
                              <span className="text-slate-300">|</span>
                              <button
                                onClick={() =>
                                  handleDeleteQuiz(qz.quiz_id, qz.title)
                                }
                                className="px-2.5 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <QuestionPoolManager subjectId={subjectId} />
          </div>
        )}
      </main>

      {/* Drawers & Modals */}
      <CreateQuizDrawer
        subjectId={subjectId}
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        onSuccess={handleCreateQuizSuccess}
      />

      <EditQuizModal
        quiz={editingQuiz}
        subjectId={subjectId}
        onClose={() => setEditingQuiz(null)}
        onSuccess={handleEditQuizSuccess}
      />
    </div>
  );
}
