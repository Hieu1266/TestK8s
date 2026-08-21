'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  getInstructorCourseIdsAction,
  getAllStructureCommentsForCourseAction,
  updateStructureCommentStatusAction,
  getModuleByIdAction,
  getModulesBySubjectAction,
  getLessonsByModuleAction,
  getSubjectsByCourseAction,
  TeacherStructureComment,
  CommentStatus,
  StructurePart,
} from '@/actions/structureComment_action';

const PART_CONFIG: Record<
  StructurePart,
  { label: string; bg: string; text: string; border: string }
> = {
  COURSE: {
    label: 'Khóa học',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  SUBJECT: {
    label: 'Môn học',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
  },
  MODULE: {
    label: 'Module',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  LESSON: {
    label: 'Bài học',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
  },
};

type CommentWithCourse = TeacherStructureComment & { course_id: string };

export default function TesterCommentsPage() {
  const router = useRouter();

  const [comments, setComments] = useState<CommentWithCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<CommentStatus | 'all'>('all');
  const [partFilter, setPartFilter] = useState<StructurePart | 'all'>('all');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErrorMessage(null);

      const courseIdsResult = await getInstructorCourseIdsAction();
      if (cancelled) return;

      if (!courseIdsResult.success || !courseIdsResult.data) {
        setErrorMessage(courseIdsResult.message || 'Không thể tải danh sách khóa học.');
        setLoading(false);
        return;
      }

      if (courseIdsResult.data.length === 0) {
        setComments([]);
        setLoading(false);
        return;
      }

      const results = await Promise.all(
        courseIdsResult.data.map(async (courseId) => {
          const r = await getAllStructureCommentsForCourseAction(courseId);
          return { courseId, r };
        })
      );
      if (cancelled) return;

      const failedOne = results.find(({ r }) => !r.success);
      const allComments: CommentWithCourse[] = results
        .filter(({ r }) => r.success && r.data)
        .flatMap(({ courseId, r }) => r.data!.map((c) => ({ ...c, course_id: courseId })));

      setComments(allComments);
      if (allComments.length === 0 && failedOne) {
        setErrorMessage(failedOne.r.message || 'Không thể tải nhận xét từ tester.');
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const testers = useMemo(() => {
    const map = new Map<string, string>();
    comments.forEach((c) => map.set(c.tester_id, c.tester_username));
    return Array.from(map.entries());
  }, [comments]);

  const filtered = useMemo(() => {
    return comments.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (partFilter !== 'all' && c.structure_part !== partFilter) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.comment.toLowerCase().includes(q) ||
        c.tester_username.toLowerCase().includes(q)
      );
    });
  }, [comments, statusFilter, partFilter, search]);

  const stats = useMemo(() => {
    const total = comments.length;
    const pending = comments.filter((c) => c.status === 'PENDING').length;
    const resolved = comments.filter((c) => c.status === 'RESOLVED').length;
    return { total, pending, resolved, testerCount: testers.length };
  }, [comments, testers]);

  async function toggleStatus(comment: CommentWithCourse) {
    const nextStatus: CommentStatus = comment.status === 'PENDING' ? 'RESOLVED' : 'PENDING';
    setUpdatingId(comment.comment_id);
    const result = await updateStructureCommentStatusAction(comment.comment_id, nextStatus);
    setUpdatingId(null);

    if (result.success) {
      setComments((prev) =>
        prev.map((c) => (c.comment_id === comment.comment_id ? { ...c, status: nextStatus } : c))
      );
    } else {
      alert(result.message || 'Không thể cập nhật trạng thái.');
    }
  }

  async function handleOpenComment(c: CommentWithCourse) {
    if (navigatingId) return;

    if (c.structure_part === 'MODULE') {
      setNavigatingId(c.comment_id);
      const moduleResult = await getModuleByIdAction(c.part_id);
      setNavigatingId(null);

      if (moduleResult.success && moduleResult.data) {
        router.push(
          `/instructor-management/course-content/${moduleResult.data.subject_id}/modules/${c.part_id}`
        );
      } else {
        alert(moduleResult.message || 'Không thể mở module này.');
      }
      return;
    }

    if (c.structure_part === 'LESSON') {
      setNavigatingId(c.comment_id);

      const subjectsResult = await getSubjectsByCourseAction(c.course_id);
      if (!subjectsResult.success || !subjectsResult.data) {
        setNavigatingId(null);
        alert(subjectsResult.message || 'Không thể tìm bài học này.');
        return;
      }

      for (const subject of subjectsResult.data) {
        const modulesResult = await getModulesBySubjectAction(subject.subject_id);
        if (!modulesResult.success || !modulesResult.data) continue;

        for (const mod of modulesResult.data) {
          const lessonsResult = await getLessonsByModuleAction(mod.module_id);
          if (!lessonsResult.success || !lessonsResult.data) continue;

          const found = lessonsResult.data.find((l) => l.lesson_id === c.part_id);
          if (found) {
            setNavigatingId(null);
            router.push(
              `/instructor-management/course-content/${subject.subject_id}/modules/${mod.module_id}`
            );
            return;
          }
        }
      }

      setNavigatingId(null);
      alert('Không tìm thấy bài học tương ứng.');
      return;
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-600">
      <Navbar />

      {/* Hero Banner Section (Tăng padding bottom để làm nền cho phần thống kê đè lên) */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0052D4] via-[#0066FF] to-[#4364F7] text-white pt-12 pb-20 px-6 shadow-md">
        <div className="absolute -top-10 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 right-10 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-100 hover:text-white transition-all mb-5 bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-xl border border-white/20 backdrop-blur-md shadow-sm active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Quay lại bảng điều khiển
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-blue-100 text-xs font-medium mb-3 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse" />
                Hệ thống Quản lý Giảng dạy LUMER
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
                <span>💬</span> Nhận xét từ Tester
              </h1>
              <p className="text-blue-100 mt-2 text-sm md:text-base max-w-2xl leading-relaxed">
                Tổng hợp tất cả góp ý kiểm thử của Tester theo Môn học, Module và Bài học. Nhấp đúp vào thẻ bài học hoặc module để đi thẳng tới giao diện biên tập.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Metric Cards Section (Tách ra giữa Banner và Nội dung chính) */}
      <section className="max-w-7xl mx-auto px-6 -mt-10 relative z-20">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Tổng nhận xét', value: stats.total, icon: '📋', accent: 'border-l-blue-500' },
            { label: 'Chưa xử lý', value: stats.pending, icon: '⏳', accent: 'border-l-amber-500' },
            { label: 'Đã xử lý', value: stats.resolved, icon: '✅', accent: 'border-l-emerald-500' },
            { label: 'Tester góp ý', value: stats.testerCount, icon: '👤', accent: 'border-l-indigo-500' },
          ].map((s) => (
            <div
              key={s.label}
              className={`bg-white rounded-2xl p-5 border border-slate-200/80 border-l-4 ${s.accent} shadow-md hover:shadow-lg transition-all flex items-center justify-between`}
            >
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{s.label}</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{s.value}</p>
              </div>
              <span className="text-2xl p-2.5 rounded-xl bg-slate-50 border border-slate-100 shadow-inner">
                {s.icon}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Main Content Area (Bộ lọc & Danh sách nhận xét) */}
      <section className="max-w-7xl mx-auto px-6 pt-6 pb-12">
        {/* Filter & Search Bar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          {/* Search Input */}
          <div className="relative w-full sm:max-w-md">
            <svg
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm nội dung, tiêu đề, tên tester..."
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20 focus:border-[#0066FF] transition"
            />
          </div>

          {/* Select Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={partFilter}
              onChange={(e) => setPartFilter(e.target.value as StructurePart | 'all')}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-700 focus:outline-none focus:border-[#0066FF] transition cursor-pointer"
            >
              <option value="all">Tất cả cấp độ</option>
              <option value="SUBJECT">Môn học</option>
              <option value="MODULE">Module</option>
              <option value="LESSON">Bài học</option>
              <option value="COURSE">Khóa học</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CommentStatus | 'all')}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-700 focus:outline-none focus:border-[#0066FF] transition cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="PENDING">Chưa xử lý</option>
              <option value="RESOLVED">Đã xử lý</option>
            </select>
          </div>
        </div>

        {/* Comment List Section */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 text-sm text-slate-500 py-24 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="w-8 h-8 rounded-full border-3 border-slate-100 border-t-[#0066FF] animate-spin" />
            <p className="font-semibold text-slate-600">Đang đồng bộ nhận xét kiểm thử...</p>
          </div>
        ) : errorMessage ? (
          <div className="bg-red-50 border border-red-200/80 rounded-2xl p-6 text-center text-sm font-semibold text-red-600 shadow-sm">
            🚨 {errorMessage}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-16 text-center text-sm text-slate-500 shadow-sm">
            <p className="text-3xl mb-2">🔍</p>
            Không tìm thấy nhận xét nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((c) => {
              const clickable = c.structure_part === 'MODULE' || c.structure_part === 'LESSON';
              const isNavigating = navigatingId === c.comment_id;
              const partStyle = PART_CONFIG[c.structure_part];

              return (
                <div
                  key={c.comment_id}
                  onDoubleClick={() => clickable && handleOpenComment(c)}
                  className={`group bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm transition-all duration-200 relative overflow-hidden ${
                    clickable ? 'cursor-pointer hover:shadow-xl hover:border-blue-300 hover:-translate-y-0.5' : ''
                  }`}
                >
                  {/* Top Highlight Line on Hover */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-[#0066FF] opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Navigation Overlay/Status */}
                  {isNavigating && (
                    <div className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-[#0066FF] bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-200 border-t-[#0066FF] animate-spin" />
                      Đang tìm và mở nội dung tương ứng...
                    </div>
                  )}

                  {/* Card Header Tags & Action Button */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Structure Part Tag */}
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-md border ${partStyle.bg} ${partStyle.text} ${partStyle.border}`}
                      >
                        {partStyle.label}
                      </span>

                      {/* Status Tag */}
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-md border ${
                          c.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            c.status === 'PENDING' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                        />
                        {c.status === 'PENDING' ? 'Chưa xử lý' : 'Đã xử lý'}
                      </span>
                    </div>

                    {/* Toggle Status Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStatus(c);
                      }}
                      disabled={updatingId === c.comment_id}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all active:scale-95 disabled:opacity-50 ${
                        c.status === 'PENDING'
                          ? 'border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/80 hover:border-emerald-300'
                          : 'border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      {updatingId === c.comment_id ? (
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                          Đang lưu...
                        </span>
                      ) : c.status === 'PENDING' ? (
                        '✓ Đánh dấu đã xử lý'
                      ) : (
                        '↺ Mở lại nhận xét'
                      )}
                    </button>
                  </div>

                  {/* Title & Comment Content */}
                  <h3 className="mt-4 text-base font-bold text-slate-900 group-hover:text-[#0066FF] transition-colors flex items-center gap-2">
                    {c.title}
                  </h3>
                  <p className="mt-2 text-xs md:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                    {c.comment}
                  </p>

                  {/* Card Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-600">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white text-[11px] font-bold shadow-xs">
                        {c.tester_username?.[0]?.toUpperCase() ?? '?'}
                      </span>
                      <span>{c.tester_username}</span>
                    </div>

                    {clickable && (
                      <span className="text-xs font-semibold text-[#0066FF] opacity-70 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-blue-50/80 px-2.5 py-1 rounded-lg border border-blue-100">
                        <span>Nhấp đúp để đến bài học</span>
                        <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}