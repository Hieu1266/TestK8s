"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  Search, ArrowLeft, ChevronRight, BookOpen, Layers, FileText, Plus, Trash2, X, Paperclip, ExternalLink, Info, UserCheck, UserPlus, Edit3, FolderOpen, Inbox, LayoutGrid, Download, GraduationCap, Clock, GripVertical
} from "lucide-react";

import { Course } from "@/types/course";
import { getCoursesAction } from "@/actions/getCourse";
import { getSubjectsByCourseAction, createSubjectAction, deleteSubject, updateSubjectAction } from "@/actions/getSubject";
import {
  getSyllabusBySubjectAction,
  createSyllabusAction,
  uploadFileAction,
  updateSyllabusAction,
  deleteSyllabusAction,
  getInstructorsAction,
  InstructorUser
} from "@/actions/getSyllabus";
import { getCurriculumsAction } from "@/actions/getCurriculum";


const URL_NGINX = process.env.NEXT_PUBLIC_NGINX_URL || "";

// 🛠️ Một số backend (vd: lỗi validate từ Zod/Joi) trả về error.message là OBJECT
// chứ không phải string. Nếu nhét thẳng vào template string sẽ ra "[object Object]".
// Hàm này luôn trả về một chuỗi có thể đọc được để hiển thị/alert.
const getErrorMessage = (error: any): string => {
  const raw = error?.response?.data?.message ?? error?.data?.message ?? error?.message ?? error?.error ?? error;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    return raw
      .map((item) => (typeof item === "string" ? item : item?.message || JSON.stringify(item)))
      .join("; ");
  }
  if (raw && typeof raw === "object") {
    try {
      return JSON.stringify(raw);
    } catch {
      return "Không xác định";
    }
  }
  return "Không xác định";
};

const getFullAssetUrl = (path?: string | null): string => {
  if (!path) return "#";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = URL_NGINX.replace(/\/$/, "");
  return `${baseUrl}${cleanPath}`;
};

// 📄 COMPONENT FILE CARD: THIẾT KẾ TỐI GIẢN (CHỈ XEM/TẢI)
function FileCard({ filePath, label = "Tài liệu đính kèm" }: { filePath?: string | null; label?: string }) {
  if (!filePath) return null;
  const fullUrl = getFullAssetUrl(filePath);

  const fileName = filePath.split("/").pop() || "Tai-lieu";
  const rawExt = fileName.split(".").pop() || "FILE";
  const extension = rawExt.toUpperCase();

  // Tạo màu sắc cho icon dựa trên đuôi file
  let colorClass = "from-slate-100 to-slate-50 text-slate-600 border-slate-200";
  if (["PDF"].includes(extension)) colorClass = "from-red-100 to-red-50 text-red-600 border-red-200";
  else if (["DOC", "DOCX"].includes(extension)) colorClass = "from-blue-100 to-blue-50 text-blue-600 border-blue-200";
  else if (["XLS", "XLSX"].includes(extension)) colorClass = "from-emerald-100 to-emerald-50 text-emerald-600 border-emerald-200";
  else if (["PPT", "PPTX"].includes(extension)) colorClass = "from-orange-100 to-orange-50 text-orange-600 border-orange-200";
  else if (["JPG", "JPEG", "PNG", "GIF", "WEBP"].includes(extension)) colorClass = "from-purple-100 to-purple-50 text-purple-600 border-purple-200";

  return (
    <div className="group mt-3 p-3 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition-all duration-300 flex items-center justify-between shadow-sm hover:shadow-[0_4px_15px_-3px_rgba(6,81,237,0.1)]">
      <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-[11px] font-black shrink-0 shadow-sm border ${colorClass}`}>
          {extension}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-800 text-[13px] truncate group-hover:text-[#0066FF] transition-colors">{label}</p>
          <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
            <Paperclip size={12} className="text-slate-400" /> {fileName}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <a
          href={fullUrl}
          target="_blank"
          rel="noreferrer"
          className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 hover:border-[#0066FF] hover:bg-blue-50 text-slate-500 hover:text-[#0066FF] rounded-lg transition-all shadow-sm"
          title="Mở trong tab mới / Tải về"
        >
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}

export default function CourseContentPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [curriculumFile, setCurriculumFile] = useState<string | null>(null);

  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<any | null>(null);

  const [syllabuses, setSyllabuses] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<InstructorUser[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [keyword, setKeyword] = useState<string>("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showSubjectModal, setShowSubjectModal] = useState<boolean>(false);
  const [showSyllabusModal, setShowSyllabusModal] = useState<boolean>(false);

  const [editingSubject, setEditingSubject] = useState<any | null>(null);
  const [editingSyllabus, setEditingSyllabus] = useState<any | null>(null);
  // Form State
  const [subjectForm, setSubjectForm] = useState({ title: "", description: "", order_index: 1 });
  const [syllabusForm, setSyllabusForm] = useState({ description: "", instructor_id: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // ============================================================
  // GIỮ NGUYÊN VỊ TRÍ ĐANG LÀM VIỆC KHI LOAD / RELOAD DATA
  // ============================================================
  const scrollPositionRef = useRef(0);
  const shouldRestoreScrollRef = useRef(false);

  const rememberScrollPosition = () => {
    if (typeof window === "undefined") return;
    scrollPositionRef.current = window.scrollY;
    shouldRestoreScrollRef.current = true;
  };

  const restoreScrollPosition = () => {
    if (typeof window === "undefined" || !shouldRestoreScrollRef.current) return;

    const y = scrollPositionRef.current;
    shouldRestoreScrollRef.current = false;

    // Chờ React render DOM mới xong rồi mới trả scroll về vị trí cũ.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({
          top: y,
          left: 0,
          behavior: "instant" as ScrollBehavior,
        });
      });
    });
  };

  // Nếu component bị re-render sau khi data thay đổi, vẫn giữ đúng vị trí.
  useLayoutEffect(() => {
    restoreScrollPosition();
  });

  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      try {
        const [courseData, instructorData] = await Promise.all([
          getCoursesAction(),
          getInstructorsAction()
        ]);
        if (courseData && Array.isArray(courseData)) setCourses(courseData);
        if (Array.isArray(instructorData) && instructorData.length > 0) {
          setInstructors(instructorData);
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu ban đầu:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, []);

const handleSelectCourse = async (course: any) => {
  setSelectedCourse(course);
  setSelectedSubject(null);
  setSyllabuses([]);
  setCurriculumFile(null);

  // ==============================
  // 1. LẤY FILE KHUNG CHƯƠNG TRÌNH
  // ==============================
  try {
    const curriculumRes: any = await getCurriculumsAction();

    const curriculumList = Array.isArray(curriculumRes)
      ? curriculumRes
      : curriculumRes?.data || [];

    const curriculum = curriculumList.find(
      (item: any) =>
        String(item.curriculum_id) === String(course.curriculum_id)
    );

    if (curriculum) {
      const filePath =
        curriculum.curriculum_file_path ||
        curriculum.file_path ||
        curriculum.file_url ||
        curriculum.file;

      setCurriculumFile(filePath || null);
    }
  } catch (error) {
    console.error("Lỗi khi tải file khung chương trình:", error);
    setCurriculumFile(null);
  }

  // ==============================
  // 2. LẤY DANH SÁCH MÔN HỌC
  // ==============================
  if (course?.curriculum_id) {
    try {
      const res: any = await getSubjectsByCourseAction(course.course_id);
      
      const subjectList = Array.isArray(res)
        ? res
        : res?.data || [];

      subjectList.sort(
        (a: any, b: any) =>
          (a.order_index ?? 0) - (b.order_index ?? 0)
      );

      setSubjects(subjectList);

      if (subjectList.length > 0) {
        handleSelectSubject(subjectList[0]);
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách môn học:", error);
      setSubjects([]);
    }
  }
};



const handleDragStart = (index: number) => {
  setDraggedIndex(index);
};

const handleDragOver = (e: React.DragEvent, index: number) => {
  e.preventDefault(); // bắt buộc để cho phép drop
  if (draggedIndex !== null && draggedIndex !== index) {
    setDragOverIndex(index);
  }
};

const handleDragLeave = () => {
  setDragOverIndex(null);
};

const handleDragEnd = () => {
  setDraggedIndex(null);
  setDragOverIndex(null);
};

const saveSubjectOrder = async (orderedSubjects: any[]) => {
  const updated = orderedSubjects.map((sub, idx) => ({
    ...sub,
    order_index: idx + 1,
  }));

  setSubjects(updated);

  try {
    await Promise.all(
      updated.map((sub, idx) => {
        const original = subjects.find(
          (item) => item.subject_id === sub.subject_id
        );

        if (
          original &&
          original.order_index !== idx + 1
        ) {
          return updateSubjectAction(
            sub.subject_id,
            {
              title: sub.title,
              description: sub.description || sub.title,
              order_index: idx + 1,

              // QUAN TRỌNG
              status_id: sub.status_id,
            }
          );
        }

        return Promise.resolve();
      })
    );

    if (selectedSubject) {
      const current = updated.find(
        (sub) =>
          sub.subject_id === selectedSubject.subject_id
      );

      if (current) {
        setSelectedSubject(current);
      }
    }

  } catch (error: any) {
    console.error(
      "Lỗi khi lưu thứ tự môn học:",
      error
    );

    alert(
      `Lỗi khi lưu thứ tự môn học: ${
        getErrorMessage(error)
      }`
    );

  }
};

const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
  e.preventDefault();
  setDragOverIndex(null);

  if (draggedIndex === null || draggedIndex === dropIndex) {
    setDraggedIndex(null);
    return;
  }

  const reordered = [...subjects];
  const [movedItem] = reordered.splice(draggedIndex, 1);
  reordered.splice(dropIndex, 0, movedItem);

  setDraggedIndex(null);
  await saveSubjectOrder(reordered);
};


  const handleSelectSubject = async (subject: any) => {
    rememberScrollPosition();
    setSelectedSubject(subject);
    try {
      const res: any = await getSyllabusBySubjectAction(subject.subject_id);
      if (res && (res.syllabus_id || res.id)) setSyllabuses([res]);
      else if (Array.isArray(res)) setSyllabuses(res);
      else setSyllabuses([]);
    } catch (error) {
      console.error("Lỗi khi tải đề cương:", error);
      setSyllabuses([]);
    }
  };

  const handleEditSubject = (subject: any) => {
    setEditingSubject(subject);
    setSubjectForm({
      title: subject.title || "",
      description: subject.description || "",
      order_index: Number(subject.order_index) || 1,
    });
    setShowSubjectModal(true);
  };

  const handleSaveSubject = async () => {
    if (!selectedCourse) return alert("Vui lòng chọn khóa học trước!");
    if (!subjectForm.title.trim()) return alert("Vui lòng nhập tên môn học!");

    rememberScrollPosition();
    setIsLoading(true);

    try {
      const title = subjectForm.title.trim();
      const description = subjectForm.description.trim() || title;

      if (editingSubject) {
        const oldIndex = subjects.findIndex(
          (sub) => sub.subject_id === editingSubject.subject_id
        );

        let newIndex = Number(subjectForm.order_index) - 1;
        if (!Number.isFinite(newIndex)) newIndex = oldIndex;
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= subjects.length) newIndex = subjects.length - 1;

        // Cập nhật nội dung trước. Order sẽ được chuẩn hóa bên dưới.
        await updateSubjectAction(editingSubject.subject_id, {
          title,
          description,
          order_index: oldIndex + 1,
          status_id: editingSubject.status_id,
        });

        if (oldIndex !== -1 && oldIndex !== newIndex) {
          const reordered = [...subjects];
          const [movedSubject] = reordered.splice(oldIndex, 1);
          reordered.splice(newIndex, 0, {
            ...movedSubject,
            title,
            description,
          });

          // Lưu lại toàn bộ thứ tự để luôn có STT 1..N, không trùng.
          // Gửi kèm title/description phòng trường hợp backend yêu cầu đủ trường khi update
          await Promise.all(
            reordered.map((sub, idx) =>
              updateSubjectAction(sub.subject_id, {
                title: sub.title,
                description: sub.description,
                order_index: idx + 1,
                status_id: sub.status_id,
              })
            )
          );
        } else {
          await updateSubjectAction(editingSubject.subject_id, {
            title,
            description,
            order_index: newIndex + 1,
            status_id: editingSubject.status_id,
          });
        }

        alert("Cập nhật môn học thành công!");
      } else {
        // Môn mới luôn được thêm vào cuối danh sách.
        await createSubjectAction({
          course_id: selectedCourse.course_id,
          title,
          description,
          order_index: subjects.length + 1,
        });

        alert("Tạo môn học thành công!");
      }

      setShowSubjectModal(false);
      setEditingSubject(null);
      setSubjectForm({
        title: "",
        description: "",
        order_index: subjects.length + 1,
      });

      await handleSelectCourse(selectedCourse);
    } catch (error: any) {
      console.error("Lỗi khi lưu môn học:", error);
      alert(`Lỗi khi lưu môn học: ${getErrorMessage(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSubject = async (subject: any) => {
    rememberScrollPosition();

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa môn học "${subject.title}"? Hành động này không thể hoàn tác.`
    );
    if (!confirmed) return;

    setIsLoading(true);
    try {
      await deleteSubject(subject.subject_id);
      alert("Xóa môn học thành công!");

      // Nếu đang xem đúng subject vừa xóa thì reset selection
      if (selectedSubject?.subject_id === subject.subject_id) {
        setSelectedSubject(null);
        setSyllabuses([]);
      }
      await handleSelectCourse(selectedCourse); // reload lại danh sách subject
    } catch (error: any) {
      alert(`Lỗi khi xóa môn học: ${getErrorMessage(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSyllabus = async (syl: any) => {
    rememberScrollPosition();

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa đề cương này? Hành động này không thể hoàn tác.`
    );
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const syllabusId = syl.syllabus_id || syl.id;
      await deleteSyllabusAction(syllabusId);
      alert("Xóa đề cương thành công!");
      await handleSelectSubject(selectedSubject); // reload lại đề cương của môn đang chọn
    } catch (error: any) {
      alert(`Lỗi khi xóa đề cương: ${getErrorMessage(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSyllabus = async () => {
    if (!selectedSubject) return alert("Vui lòng chọn môn học trước!");
    if (!syllabusForm.instructor_id) return alert("Vui lòng chọn Giảng viên phụ trách!");
    if (!syllabusForm.description.trim()) return alert("Vui lòng nhập mô tả đề cương!");

    rememberScrollPosition();
    setIsLoading(true);
    try {
      // Giữ file cũ nếu không chọn file mới (chỉ áp dụng khi đang edit)
      let filePath: string | null =
        editingSyllabus?.syllabus_file_path || editingSyllabus?.file_path || null;

      if (selectedFile) {
        const uploadData = new FormData();
        uploadData.append("file", selectedFile);
        const uploadRes = await uploadFileAction(uploadData);
        filePath = uploadRes.file_path;
      }

      if (editingSyllabus) {
        // 🟢 CẬP NHẬT
        const syllabusId = editingSyllabus.syllabus_id || editingSyllabus.id;
        await updateSyllabusAction(syllabusId, {
          description: syllabusForm.description.trim(),
          instructor_id: syllabusForm.instructor_id,
          syllabus_file_path: filePath ?? undefined,
        });
        alert("Cập nhật đề cương thành công!");
      } else {
        // 🟡 TẠO MỚI
        await createSyllabusAction({
          subject_id: String(selectedSubject.subject_id),
          description: syllabusForm.description.trim(),
          syllabus_file_path: filePath,
          instructor_id: syllabusForm.instructor_id,
        });
        alert("Tạo đề cương và phân công giảng viên thành công!");
      }

      setShowSyllabusModal(false);
      setSyllabusForm({ description: "", instructor_id: "" });
      setSelectedFile(null);
      setEditingSyllabus(null);
      await handleSelectSubject(selectedSubject);
    } catch (error: any) {
      alert(`Lỗi khi lưu đề cương: ${getErrorMessage(error)}`);
    } finally {
      setIsLoading(false);
    }
  };


  const filteredCourses = courses.filter((c) =>
    c.title?.toLowerCase().includes(keyword.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased selection:bg-[#0066FF]/20 selection:text-[#0066FF]">
      <Navbar />

      {/* HEADER: Giữ nguyên form cũ, tinh chỉnh gradient một chút */}
      <section className="bg-gradient-to-r from-[#0066FF] to-[#0052cc] text-white pt-10 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-30">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto space-y-4 relative z-10">
          <div className="flex items-center gap-2 text-xs text-white/80 font-medium">
            <Link href="/training-management" className="hover:text-white hover:bg-white/20 flex items-center gap-1.5 transition-all bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm border border-white/10">
              <ArrowLeft size={14} /> Quản lý đào tạo
            </Link>
            <ChevronRight size={12} className="opacity-50" />
            <span className="text-white font-semibold tracking-wide flex items-center gap-1.5">
              <GraduationCap size={14} /> Nội dung khóa học
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight drop-shadow-md">
            QUẢN LÝ MÔN HỌC & ĐỀ CƯƠNG
          </h1>
          <p className="text-sm text-blue-100 max-w-2xl font-medium leading-relaxed">
            Hệ thống quản trị nội dung đào tạo chuyên sâu. Quy trình: Chọn Khóa học <span className="opacity-60 mx-1">→</span> Khởi tạo Môn học <span className="opacity-60 mx-1">→</span> Thiết lập Đề cương & Phân công.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 -mt-14 pb-20 relative z-20">

        {/* =========================================
            VIEW 1: DANH SÁCH KHÓA HỌC (OUTER VIEW)
            ========================================= */}
        {!selectedCourse && (
          <div className="bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] p-6 md:p-10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] min-h-[600px]">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-[#0066FF] rounded-lg text-xs font-bold mb-2 border border-blue-100">
                  <LayoutGrid size={14} /> Tổng quan hệ thống
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                  Danh Sách Môn Học
                </h2>
                <p className="text-slate-500 text-sm font-medium">Hiện có <strong className="text-[#0066FF] text-base">{filteredCourses.length}</strong> khóa học đang được quản lý.</p>
              </div>

              <div className="relative w-full md:w-[400px] group">
                <Search size={18} className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-[#0066FF] transition-colors" />
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tìm kiếm nhanh khóa học..."
                  className="w-full bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#0066FF]/10 focus:border-[#0066FF]/50 transition-all placeholder:text-slate-400 shadow-sm"
                />
              </div>
            </div>

            {filteredCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-4 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                <FolderOpen size={64} className="text-slate-200" />
                <p className="text-base font-semibold text-slate-500">Chưa tìm thấy khóa học nào khớp với từ khóa.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredCourses.map((course) => (
                  <div
                    key={course.courseId}
                    onClick={() => handleSelectCourse(course)}
                    className="group bg-white border border-slate-200 hover:border-[#0066FF]/50 rounded-3xl p-6 cursor-pointer shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] hover:shadow-[0_15px_35px_-5px_rgba(6,81,237,0.15)] transition-all duration-300 relative overflow-hidden flex flex-col h-full hover:-translate-y-1"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-50/80 to-transparent rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"></div>

                    <div className="flex justify-between items-start mb-5">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#0066FF] group-hover:text-white transition-colors duration-300 shadow-sm">
                        <BookOpen size={24} />
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg font-bold border border-slate-200 tracking-wider">
                        ID: {course.courseId}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-lg text-slate-800 group-hover:text-[#0066FF] transition-colors line-clamp-2 mb-3 leading-snug">
                      {course.title}
                    </h3>

                    {course.description ? (
                      <p className="text-sm text-slate-500 font-medium line-clamp-3 leading-relaxed flex-1">
                        {course.description}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400 italic flex-1">Chưa có mô tả chi tiết cho khóa học này.</p>
                    )}

                    <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between opacity-80 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                        <Clock size={14} /> Cập nhật gần đây
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-[#0066FF] group-hover:text-white text-slate-400 transition-colors">
                        <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================
            VIEW 2: BÊN TRONG KHÓA HỌC (INNER VIEW)
            ========================================= */}
        {selectedCourse && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Banner Khóa học đang chọn */}
            <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-b from-blue-50/50 to-transparent rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

              <div className="space-y-4 flex-1 relative z-10">
                <button
                  onClick={() => setSelectedCourse(null)}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all w-fit shadow-sm hover:shadow"
                >
                  <ArrowLeft size={14} /> Trở về danh sách
                </button>

                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-2 tracking-tight">{selectedCourse.title}</h2>
                  <p className="text-slate-500 text-sm font-medium max-w-3xl leading-relaxed">{selectedCourse.description}</p>
                </div>
              </div>

              {/* Box Khung Chương Trình */}
              <div className="w-full lg:w-96 shrink-0 bg-blue-50/50 border border-blue-100/80 p-5 rounded-2xl relative z-10">
                <h4 className="text-xs font-extrabold text-[#0066FF] uppercase mb-1 flex items-center gap-1.5 tracking-wider">
                  <Info size={14} /> Khung chương trình chuẩn
                </h4>
                {curriculumFile ? (
                  <FileCard filePath={curriculumFile} label="File Khung Curriculum" />
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl text-slate-400 mt-3 shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                      <Paperclip size={14} />
                    </div>
                    <span className="text-xs font-medium italic">Khóa học này chưa đính kèm file khung chương trình.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Lưới 2 Cột: Môn Học & Đề Cương */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[800px]">

              {/* CỘT 1: DANH SÁCH MÔN HỌC (Chiếm 5 phần) */}
              <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col h-[600px] lg:h-full">
                <div className="flex justify-between items-center pb-5 border-b border-slate-100 mb-4">
                  <h3 className="font-black text-lg flex items-center gap-2.5 text-slate-800 tracking-wide">
                    <div className="p-2 bg-amber-50 rounded-xl border border-amber-100">
                      <BookOpen size={20} className="text-amber-500" />
                    </div>
                    Danh Sách Môn Học
                  </h3>
                  <button
                    onClick={() => {
                      setEditingSubject(null);
                      setSubjectForm({ title: "", description: "", order_index: subjects.length + 1 });
                      setShowSubjectModal(true);
                    }}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_4px_15px_-3px_rgba(245,158,11,0.4)] hover:shadow-[0_6px_20px_-3px_rgba(245,158,11,0.5)] active:scale-95"
                  >
                    <Plus size={16} /> Thêm Môn
                  </button>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar [overflow-anchor:none]">
                  {subjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4 bg-amber-50/30 rounded-2xl border border-dashed border-amber-200 h-full">
                      <Inbox size={48} className="text-amber-200" />
                      <p className="text-sm font-medium px-4 text-center text-slate-500">Chưa có môn học nào.<br />Bấm <strong className="text-amber-500">"+ Thêm Môn"</strong> để bắt đầu.</p>
                    </div>
                  ) : (
                    subjects.map((sub: any, index: number) => {
                      const isSelected = selectedSubject?.subject_id === sub.subject_id;
                      const subjectFile = sub.file_url || sub.file_path || sub.syllabus_file;
                      const isDragging = draggedIndex === index;
                      const isDragOver = dragOverIndex === index && draggedIndex !== index;

                      return (
                        <div
                          key={sub.subject_id}
                          draggable
                          onDragStart={() => handleDragStart(index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, index)}
                          onDragEnd={handleDragEnd}
                          onClick={() => handleSelectSubject(sub)}
                          className={`p-4 rounded-2xl cursor-pointer transition-all duration-300 group flex flex-col gap-3 ${isSelected
                            ? "border border-amber-400 bg-gradient-to-r from-amber-50 to-white shadow-[0_4px_20px_-5px_rgba(245,158,11,0.15)]"
                            : "border border-slate-100 bg-white hover:border-amber-200 hover:bg-amber-50/20 hover:shadow-md"
                            } ${isDragging ? "opacity-40 scale-[0.98]" : ""} ${isDragOver ? "border-t-4 border-t-[#0066FF] -translate-y-0.5" : ""}`}
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex gap-3.5 flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 shrink-0">
                                <GripVertical size={16} className="text-slate-300 group-hover:text-amber-400 cursor-grab active:cursor-grabbing transition-colors" />
                                <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-sm font-black shadow-sm transition-colors ${isSelected ? "bg-amber-500 text-white" : "bg-slate-50 text-slate-400 border border-slate-200 group-hover:text-amber-500"
                                  }`}>
                                  {sub.order_index || index + 1}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <span className={`font-extrabold text-sm block mb-1 truncate transition-colors ${isSelected ? 'text-amber-700' : 'text-slate-800 group-hover:text-amber-600'}`}>
                                  {sub.title}
                                </span>
                                {sub.description && (
                                  <p className="text-[12px] text-slate-500 font-medium line-clamp-1">
                                    {sub.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Nhóm nút Chỉnh sửa + Xóa + Chevron */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditSubject(sub);
                                }}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                                title="Chỉnh sửa môn học"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSubject(sub);
                                }}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="Xóa môn học"
                              >
                                <Trash2 size={16} />
                              </button>
                              <ChevronRight size={18} className={`shrink-0 transition-all ${isSelected ? 'text-amber-500 translate-x-1' : 'text-slate-300 group-hover:text-amber-300'}`} />
                            </div>
                          </div>

                          {subjectFile && (
                            <div className="border-t border-slate-100/50 pt-1">
                              <FileCard filePath={subjectFile} label="Tài liệu môn học" />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* CỘT 2: ĐỀ CƯƠNG (Chiếm 7 phần) */}
              <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col h-[600px] lg:h-full">
                <div className="flex justify-between items-center pb-5 border-b border-slate-100 mb-4">
                  <h3 className="font-black text-lg flex items-center gap-2.5 text-slate-800 tracking-wide">
                    <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                      <FileText size={20} className="text-emerald-500" />
                    </div>
                    Đề Cương & Giảng Viên
                  </h3>
                  {selectedSubject && (
                    <button
                      onClick={() => {
                        setEditingSyllabus(null);
                        setSyllabusForm({ description: "", instructor_id: "" });
                        setSelectedFile(null);
                        setShowSyllabusModal(true);
                      }}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_4px_15px_-3px_rgba(16,185,129,0.4)] hover:shadow-[0_6px_20px_-3px_rgba(16,185,129,0.5)] active:scale-95"
                    >
                      <Plus size={16} /> Tạo Đề Cương
                    </button>
                  )}
                </div>

                {selectedSubject ? (
                  <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar [overflow-anchor:none]">
                    <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl shadow-sm">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20"></div>
                      <p className="text-[13px] text-slate-600 font-medium">
                        Đang hiển thị đề cương cho: <strong className="text-slate-800">{selectedSubject.title}</strong>
                      </p>
                    </div>

                    {syllabuses.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-4 bg-emerald-50/30 rounded-3xl border border-dashed border-emerald-200 h-[70%] mt-4">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-2 border border-emerald-100">
                          <FileText size={32} className="text-emerald-300" />
                        </div>
                        <p className="text-sm font-medium px-4 text-center text-slate-500">Môn học này chưa có đề cương.<br />Hãy khởi tạo để phân công Giảng viên.</p>
                      </div>
                    ) : (
                      syllabuses.map((syl: any) => {
                        const syllabusFile = syl.syllabus_file_path || syl.file_path;
                        const instructorObj = instructors.find(i => String(i.user_id) === String(syl.instructor_id));

                        return (
                          <div key={syl.syllabus_id || syl.id} className="p-6 lg:p-8 bg-white border border-slate-200/80 rounded-3xl space-y-6 shadow-[0_8px_30px_-5px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-5px_rgba(0,0,0,0.08)] transition-all">

                            {/* Khung thông tin giảng viên xịn xò */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-gradient-to-r from-slate-50 to-white border border-slate-200 p-5 rounded-2xl gap-4 relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-1 bg-emerald-400 h-full"></div>
                              <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-200 shadow-sm">
                                  <UserCheck size={28} />
                                </div>
                                <div>
                                  <span className="font-extrabold text-slate-400 text-[10px] block uppercase tracking-widest mb-1">
                                    Giảng viên phụ trách
                                  </span>
                                  <span className="font-black text-slate-800 text-base block">
                                    {instructorObj ? instructorObj.username : "Chưa phân công"}
                                  </span>
                                  {instructorObj?.email && (
                                    <span className="text-[12px] text-slate-500 font-medium mt-0.5 block">
                                      {instructorObj.email}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Nhóm nút Chỉnh sửa + Xóa */}
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => {
                                    setEditingSyllabus(syl);
                                    setSyllabusForm({
                                      description: syl.description || "",
                                      instructor_id: String(syl.instructor_id || "")
                                    });
                                    setShowSyllabusModal(true);
                                  }}
                                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                                >
                                  <Edit3 size={14} /> Chỉnh sửa
                                </button>
                                <button
                                  onClick={() => handleDeleteSyllabus(syl)}
                                  className="px-4 py-2 bg-white hover:bg-red-50 text-red-500 border border-red-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                                >
                                  <Trash2 size={14} /> Xóa
                                </button>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <span className="text-[12px] font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
                                Mô tả / Nội dung chi tiết
                              </span>
                              <p className="font-medium text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                                {syl.description || <span className="italic text-slate-400">Chưa có thông tin mô tả chi tiết.</span>}
                              </p>
                            </div>

                            {syllabusFile && (
                              <div className="pt-4 border-t border-slate-100">
                                <span className="text-[12px] font-extrabold text-slate-800 uppercase tracking-widest block mb-1">Tài liệu đính kèm</span>
                                <FileCard filePath={syllabusFile} label="File Đề cương chi tiết" />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-70">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 mb-2">
                      <Layers size={40} className="text-slate-300" />
                    </div>
                    <p className="text-base font-medium">Vui lòng chọn một Môn học bên Cột Trái để xem</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </main>

      {/* 🔴 MODAL TẠO SUBJECT */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-8 space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                  {editingSubject ? <Edit3 size={20} /> : <BookOpen size={20} />}
                </div>
                {editingSubject ? "Chỉnh Sửa Môn Học" : "Tạo Môn Học Mới"}
              </h3>
              <button onClick={() => { setShowSubjectModal(false); setEditingSubject(null); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl">
              <p className="text-xs text-amber-800 font-medium">
                {editingSubject ? "Đang chỉnh sửa môn học:" : "Sẽ được thêm vào:"}
                <strong className="font-bold block text-sm mt-1">
                  {editingSubject ? editingSubject.title : selectedCourse?.title}
                </strong>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">Tên Môn Học <span className="text-red-500">*</span></label>
                <input
                  value={subjectForm.title}
                  onChange={(e) => setSubjectForm({ ...subjectForm, title: e.target.value })}
                  placeholder="Ví dụ: ReactJS Căn Bản..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-medium focus:outline-none focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 transition-all shadow-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">Mô Tả</label>
                <textarea
                  rows={3}
                  value={subjectForm.description}
                  onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                  placeholder="Giới thiệu tóm tắt môn học..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-medium focus:outline-none focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 transition-all resize-none shadow-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">Vị trí môn học</label>
                <input
                  type="number"
                  min={1}
                  max={Math.max(subjects.length, 1)}
                  value={subjectForm.order_index}
                  onChange={(e) =>
                    setSubjectForm({
                      ...subjectForm,
                      order_index: Number(e.target.value),
                    })
                  }
                  disabled={!editingSubject}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-medium focus:outline-none focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 transition-all shadow-sm disabled:text-slate-400 disabled:cursor-not-allowed"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  {editingSubject
                    ? "Bạn có thể nhập vị trí mới hoặc kéo thả trực tiếp ngoài danh sách."
                    : "Môn học mới sẽ tự động được thêm vào cuối danh sách."}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
              <button onClick={() => { setShowSubjectModal(false); setEditingSubject(null); }} className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-bold text-slate-600 transition-colors">
                Hủy bỏ
              </button>
              <button onClick={handleSaveSubject} disabled={isLoading} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold shadow-[0_4px_15px_-3px_rgba(245,158,11,0.4)] transition-all disabled:opacity-70 flex items-center gap-2">
                {isLoading ? (
                  "Đang xử lý..."
                ) : editingSubject ? (
                  <>
                    <Edit3 size={16} />
                    Cập Nhật Môn
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Lưu Môn Học
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 MODAL TẠO / CẬP NHẬT SYLLABUS */}
      {showSyllabusModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-8 space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><UserPlus size={20} /></div>
                {editingSyllabus ? "Cập Nhật Đề Cương" : "Thiết Lập Đề Cương"}
              </h3>
              <button
                onClick={() => {
                  setShowSyllabusModal(false);
                  setEditingSyllabus(null);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl">
              <p className="text-xs text-emerald-800 font-medium">
                Môn học hiện tại: <strong className="font-bold block text-sm mt-1">{selectedSubject?.title}</strong>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">
                  Phân Công Giảng Viên <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={syllabusForm.instructor_id}
                    onChange={(e) => setSyllabusForm({ ...syllabusForm, instructor_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 pr-10 text-sm font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 transition-all appearance-none cursor-pointer shadow-sm"
                  >
                    <option value="">-- Chọn Giảng viên --</option>
                    {instructors.map((ins) => (
                      <option key={ins.user_id} value={ins.user_id}>
                        {ins.username} ({ins.email})
                      </option>
                    ))}
                  </select>
                  <ChevronRight size={16} className="absolute right-4 top-4 text-slate-400 pointer-events-none rotate-90" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">Mô Tả Đề Cương <span className="text-red-500">*</span></label>
                <textarea
                  rows={4}
                  value={syllabusForm.description}
                  onChange={(e) => setSyllabusForm({ ...syllabusForm, description: e.target.value })}
                  placeholder="Nhập nội dung, chuẩn đầu ra..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-medium focus:outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 transition-all resize-none shadow-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">Đính Kèm File (Tùy chọn)</label>
                <div className="border border-dashed border-slate-300 rounded-xl p-1.5 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 transition-colors">
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-white file:text-emerald-600 file:shadow-sm hover:file:bg-emerald-50 cursor-pointer"
                  />
                </div>
                {editingSyllabus && (editingSyllabus.syllabus_file_path || editingSyllabus.file_path) && !selectedFile && (
                  <p className="text-[11px] text-slate-400 mt-1.5 italic">
                    Đang giữ file hiện có. Chọn file mới ở trên nếu muốn thay thế.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowSyllabusModal(false);
                  setEditingSyllabus(null);
                }}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-bold text-slate-600 transition-colors"
              >
                Hủy bỏ
              </button>
              <button onClick={handleCreateSyllabus} disabled={isLoading} className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-[0_4px_15px_-3px_rgba(16,185,129,0.4)] transition-all disabled:opacity-70 flex items-center gap-2">
                {isLoading ? "Đang xử lý..." : <><UserPlus size={16} /> {editingSyllabus ? "Cập Nhật" : "Lưu Hệ Thống"}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}