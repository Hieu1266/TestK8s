"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import SubjectHeader from "@/components/question-bank/SubjectHeader";
import SubjectInfoComponent from "@/components/SubjectInfo";
import QuestionFilter from "@/components/question-bank/QuestionFilter";
import QuestionCard from "@/components/question-bank/QuestionCard";
import Pagination from "@/components/question-bank/Pagination";
import AddQuestionModal from "@/components/question-bank/AddQuestionModal";
import { Question, SubjectInfo } from "@/types/questions-bank";
import { LessonShort } from "@/types/lessons";
import {
  SearchX,
  Loader2,
  X,
  HelpCircle,
  FileText,
} from "lucide-react";

import {
  getQuestionsBySubjectAction,
  getSubjectDetailAction,
  getQuestionDetailAction,
  saveQuestionAction,
  deleteQuestionAction,
  generateFillInBlankQuestions,
} from "@/actions/getQuestionBank";

import { getLessonsBySubjectAction } from "@/actions/getLesson";

export default function QuestionBankDetailPage() {
  const params = useParams();

  // Mã môn học từ URL
  const subjectId = (params?.subject_id as string) || (params?.id as string) || "";

  // State quản lý bộ lọc
  const [selectedType, setSelectedType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // State quản lý phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // State dữ liệu môn học & câu hỏi
  const [subject, setSubject] = useState<SubjectInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [editLoadingId, setEditLoadingId] = useState<string | null>(null);

  // State Modal Thêm / Chỉnh sửa câu hỏi
  const [openModal, setOpenModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | undefined>(undefined);

  // State Modal Sinh câu hỏi tự động từ Bài học (Lesson)
  const [openGenerateModal, setOpenGenerateModal] = useState(false);
  const [lessons, setLessons] = useState<LessonShort[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [maxPoints, setMaxPoints] = useState<number>(1.0);
  const [isGenerating, setIsGenerating] = useState(false);

  // Tải thông tin môn học và danh sách câu hỏi
  const fetchData = useCallback(async () => {
    if (!subjectId) return;
    setLoading(true);

    try {
      const [subjectRes, questionsRes] = await Promise.all([
        getSubjectDetailAction(subjectId),
        getQuestionsBySubjectAction(subjectId),
      ]);

      const questionList = questionsRes || [];
      setQuestions(questionList);

      if (subjectRes) {
        setSubject({
          ...subjectRes,
          totalQuestions: questionList.length,
        });
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu ngân hàng câu hỏi:", error);
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Lọc danh sách câu hỏi theo từ khóa và loại câu hỏi
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      // Tìm kiếm nội dung hoặc tiêu đề
      const matchesSearch =
        !searchTerm.trim() ||
        (q.content && q.content.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (q.question_title && q.question_title.toLowerCase().includes(searchTerm.toLowerCase()));

      // Lọc theo loại câu hỏi (hỗ trợ cả Enum lẫn tiếng Việt)
      const qType = String(q.question_type || "").toUpperCase();
      const sType = String(selectedType || "").toUpperCase().trim();

      const isAllType =
        !selectedType ||
        sType === "ALL" ||
        sType === "TẤT CẢ" ||
        sType === "TẤT CẢ LOẠI";

      let matchesType = isAllType;

      if (!isAllType) {
        if (sType === "MULTIPLE_CHOICE") {
          matchesType = qType === "MULTIPLE_CHOICE" || qType === "TRẮC NGHIỆM";
        } else if (sType === "TRUE_FALSE") {
          matchesType = qType === "TRUE_FALSE" || qType.includes("ĐÚNG");
        } else if (sType === "FILL_IN_BLANK") {
          matchesType = qType === "FILL_IN_BLANK" || qType.includes("ĐIỀN");
        } else if (sType === "ESSAY") {
          matchesType = qType === "ESSAY" || qType.includes("TỰ LUẬN");
        } else {
          matchesType = qType === sType;
        }
      }

      return matchesSearch && matchesType;
    });
  }, [questions, searchTerm, selectedType]);

  // Phân trang
  const totalPages = Math.ceil(filteredQuestions.length / pageSize) || 1;
  const displayQuestions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredQuestions.slice(start, start + pageSize);
  }, [filteredQuestions, currentPage, pageSize]);

  // Reset về trang 1 khi thay đổi tìm kiếm hoặc bộ lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedType]);

  // Xử lý chỉnh sửa câu hỏi
  const handleEdit = async (question: Question) => {
    setEditLoadingId(question.question_id);
    try {
      const detail = await getQuestionDetailAction(question.question_id);
      setEditingQuestion(detail || question);
      setOpenModal(true);
    } catch (error) {
      console.error("Lỗi khi tải chi tiết câu hỏi:", error);
      setEditingQuestion(question);
      setOpenModal(true);
    } finally {
      setEditLoadingId(null);
    }
  };

  // Xử lý lưu câu hỏi
  const handleSave = async (questionData: Question) => {
    const res = await saveQuestionAction(questionData);
    if (res.success) {
      setOpenModal(false);
      setEditingQuestion(undefined);
      fetchData();
    } else {
      alert(`Lỗi khi lưu câu hỏi: ${res.error}`);
    }
  };

  // Xử lý xóa câu hỏi
  const handleDelete = async (questionId: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa câu hỏi này khỏi ngân hàng?")) {
      const res = await deleteQuestionAction(questionId, subjectId);
      if (res.success) {
        fetchData();
      } else {
        alert(`Không thể xóa câu hỏi: ${res.error}`);
      }
    }
  };

  // Mở modal sinh tự động và tải danh sách bài học
  const handleOpenGenerateModal = async () => {
    setOpenGenerateModal(true);
    const lessonData = await getLessonsBySubjectAction(subjectId);
    setLessons(lessonData || []);
    if (lessonData && lessonData.length > 0) {
      setSelectedLessonId(lessonData[0].lesson_id);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!selectedLessonId) {
      alert("Vui lòng chọn bài học!");
      return;
    }
    setIsGenerating(true);
    try {
      await generateFillInBlankQuestions(selectedLessonId, numQuestions, maxPoints);
      alert(`Tạo thành công ${numQuestions} câu hỏi ngẫu nhiên từ bài học!`);
      setOpenGenerateModal(false);
      fetchData();
    } catch (error: any) {
      console.error("Lỗi khi sinh câu hỏi ngẫu nhiên:", error);
      alert(error?.message || "Có lỗi xảy ra khi tạo câu hỏi tự động.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Header Thông tin Môn học */}
        <SubjectHeader subject={subject} />

        {/* 🟢 THANH ĐIỀU HƯỚNG TABS (Chuyển giữa Ngân hàng câu hỏi và Quản lý bài thi) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 px-6 pt-4 shadow-sm">
          <div className="flex items-center gap-6 border-b border-slate-200 pb-px overflow-x-auto">
            <button
              className="pb-3 text-sm font-semibold transition border-b-2 border-emerald-600 text-emerald-600 flex items-center gap-2 whitespace-nowrap"
            >
              <HelpCircle size={18} />
              Ngân hàng câu hỏi ({questions.length})
            </button>

            <span className="h-4 w-px bg-slate-200 -mt-3 hidden sm:inline-block" />

            <Link
              href={`/instructor-management/exam-manage/${subjectId}`}
              className="pb-3 text-sm font-medium transition border-b-2 border-transparent text-slate-500 hover:text-slate-900 flex items-center gap-2 whitespace-nowrap"
            >
              <FileText size={18} />
              Quản lý Bài thi & Kho câu hỏi
            </Link>
          </div>
        </div>

        {/* Thống kê môn học */}
        {subject && (
          <SubjectInfoComponent
            subject={{
              ...subject,
              totalQuestions: questions.length,
            }}
          />
        )}

        {/* Thanh công cụ Tìm kiếm, Bộ lọc & Nút bấm */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
          <QuestionFilter
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedType={selectedType}
            onTypeChange={setSelectedType}
            onAddQuestion={() => {
              setEditingQuestion(undefined);
              setOpenModal(true);
            }}
            onGenerateAuto={handleOpenGenerateModal}
          />
        </div>

        {/* Danh sách câu hỏi */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <Loader2 className="animate-spin text-emerald-600 mb-3" size={32} />
            <p className="text-xs text-slate-500 font-medium">Đang tải danh sách câu hỏi...</p>
          </div>
        ) : (
          <section className="space-y-4">
            {filteredQuestions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                  <SearchX size={24} />
                </div>
                <p className="text-xs font-medium text-slate-600">
                  {searchTerm || selectedType
                    ? "Không tìm thấy câu hỏi nào phù hợp với bộ lọc."
                    : "Chưa có câu hỏi nào trong ngân hàng môn học này."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayQuestions.map((question, index) => (
                  <div
                    key={question.question_id || index}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-200 overflow-hidden"
                  >
                    <QuestionCard
                      question={question}
                      index={(currentPage - 1) * pageSize + index}
                      onEdit={() => handleEdit(question)}
                      onDelete={() => handleDelete(question.question_id)}
                      isEditLoading={editLoadingId === question.question_id}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Phân trang */}
        {!loading && totalPages > 1 && (
          <div className="flex justify-center pt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </main>

      {/* Modal Thêm / Chỉnh sửa câu hỏi */}
      <AddQuestionModal
        open={openModal}
        subjectId={subjectId}
        onClose={() => {
          setOpenModal(false);
          setEditingQuestion(undefined);
        }}
        onSave={handleSave}
        editQuestion={editingQuestion}
      />

      {/* Modal Sinh câu hỏi ngẫu nhiên từ Bài học (Lesson) */}
      {openGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                Sinh câu hỏi ngẫu nhiên từ bài học
              </h3>
              <button
                onClick={() => setOpenGenerateModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Chọn bài học
              </label>
              {lessons.length === 0 ? (
                <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  Chưa có bài học nào thuộc môn học này!
                </p>
              ) : (
                <select
                  value={selectedLessonId}
                  onChange={(e) => setSelectedLessonId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  {lessons.map((l) => (
                    <option key={l.lesson_id} value={l.lesson_id}>
                      {l.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số lượng câu
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Điểm câu hỏi
                </label>
                <input
                  type="number"
                  step="0.25"
                  min={0}
                  max={10}
                  value={maxPoints}
                  onChange={(e) => setMaxPoints(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setOpenGenerateModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleGenerateQuestions}
                disabled={isGenerating || lessons.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition disabled:opacity-50"
              >
                {isGenerating && <Loader2 size={14} className="animate-spin" />}
                Tạo danh sách
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}