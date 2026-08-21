"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

// Types
import { TagName } from "@/types/tag";
import { GeneralCourseInfo } from "@/types/course";

// Actions API
import { getTop5Tags } from "@/actions/tag";
import { getCourseList, searchCourses } from "@/actions/getCourse";

// ============================================================================
// DANH SÁCH DỮ LIỆU CÂU HỎI THƯỜNG GẶP (FAQ DATA)
// ============================================================================
const FAQ_ITEMS = [
  {
    id: 1,
    question: "LUMER LMS cung cấp những hình thức khóa học nào?",
    answer: "Chúng tôi cung cấp cả khóa học ngắn hạn (chuyên sâu kỹ năng thực chiến) và khóa học dài hạn (lộ trình chuyển ngành từ cơ bản đến nâng cao)."
  },
  {
    id: 2,
    question: "Tôi có được cấp chứng chỉ sau khi hoàn thành khóa học không?",
    answer: "Có. Sau khi bạn hoàn thành 100% bài học và vượt qua bài kiểm tra cuối khóa, hệ thống sẽ tự động cấp chứng chỉ điện tử có mã định danh xác thực."
  },
  {
    id: 3,
    question: "Tôi có thể xem lại video bài học sau khi hoàn thành khóa học không?",
    answer: "Có. Bạn có quyền truy cập trọn đời vào tài nguyên bài học của khóa học đã đăng ký."
  },
  {
    id: 4,
    question: "Làm thế nào để được giảng viên hỗ trợ khi gặp bài tập khó?",
    answer: "Mỗi khóa học đều có kênh Q&A riêng biệt bên dưới bài học. Bạn cũng có thể tham gia cộng đồng Discord/Zalo dành riêng cho học viên để tương tác trực tiếp với Giảng viên và Mentor."
  }
];

// ============================================================================
// HELPER BADGE LOẠI KHÓA HỌC (ĐÃ CÓ FIX CHỐNG TRÀN CHỮ / MÉO BADGE)
// ============================================================================
function getCourseTypeBadge(course: any) {
  const typeStr = (course?.course_type || course?.type || "").toString().toUpperCase();
  const isLong = typeStr.includes("LONG") || course?.is_long_term === true;

  if (isLong) {
    return (
      <span className="bg-purple-100 text-purple-700 border border-purple-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0"></span>
        Dài hạn
      </span>
    );
  }

  return (
    <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0"></span>
      Ngắn hạn
    </span>
  );
}

function HomeContent() {
  const [selectedTag, setSelectedTag] = useState<TagName | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  const [openFaqId, setOpenFaqId] = useState<number | null>(1);

  const [topTags, setTopTags] = useState<TagName[]>([]);
  const [courses, setCourses] = useState<GeneralCourseInfo[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState<boolean>(true);

  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // 1. Fetch Top 5 Tags
  useEffect(() => {
    const fetchTags = async () => {
      setIsLoadingTags(true);
      const tags = await getTop5Tags();
      setTopTags(tags);
      setIsLoadingTags(false);
    };
    fetchTags();
  }, []);

  // 2. Fetch Khóa học (Debounce tránh giật UI)
  useEffect(() => {
    const fetchData = async () => {
      setIsSearching(true);

      try {
        if (searchQuery.trim() !== "") {
          const searchRes = await searchCourses({
            q: searchQuery,
            tag_id: selectedTag?.tag_id,
            page: 1,
            size: 20,
          });
          setCourses(searchRes.items);
        } else {
          const listData = await getCourseList(selectedTag?.tag_id, "COURSE_REGISTRATION");
          setCourses(listData);
        }
      } catch (error) {
        console.error("Lỗi khi tải danh sách khóa học:", error);
        setCourses([]);
      } finally {
        setCurrentIndex(0);
        setIsSearching(false);
        setIsInitialLoading(false);
      }
    };

    const delayDebounce = setTimeout(fetchData, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery, selectedTag]);

  const currentCourse = courses[currentIndex] || courses[0];

  const handleNextCourse = () => {
    if (courses.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % courses.length);
    }
  };

  const handlePrevCourse = () => {
    if (courses.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + courses.length) % courses.length);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <Navbar />

      <main className="max-w-6xl w-full mx-auto px-6 py-8 space-y-12 flex-1">
        {/* ===================================================================== */}
        {/* 1. SEARCH BAR & BỘ LỌC TAGS */}
        {/* ===================================================================== */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                LUMER LMS Platform
              </span>
              <h1 className="text-lg font-extrabold text-slate-900">
                Trung tâm Khám phá Khóa học
              </h1>
            </div>

            <div className="w-full sm:w-80 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo tên hoặc mô tả..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white text-xs font-semibold px-3.5 py-2.5 rounded-xl outline-none transition"
              />
              {isSearching && !isInitialLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 items-center">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${selectedTag === null
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
            >
              Tất cả
            </button>

            {isLoadingTags ? (
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="w-20 h-7 bg-slate-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : (
              topTags.map((tag) => (
                <button
                  key={tag.tag_id}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${selectedTag?.tag_id === tag.tag_id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                  #{tag.tag_name}
                </button>
              ))
            )}
          </div>
        </div>

        {/* ===================================================================== */}
        {/* 2. KHU VỰC HIỂN THỊ KHÓA HỌC */}
        {/* ===================================================================== */}
        <div className="min-h-[440px] relative transition-all">
          {isInitialLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[440px]">
              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-8 animate-pulse flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-32 h-6 bg-slate-200 rounded-full" />
                  <div className="w-3/4 h-8 bg-slate-200 rounded-lg" />
                  <div className="w-full h-16 bg-slate-100 rounded-lg" />
                </div>
                <div className="w-full h-10 bg-slate-200 rounded-xl mt-6" />
              </div>
              <div className="lg:col-span-4 space-y-3">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-20 bg-white border border-slate-200 rounded-2xl animate-pulse" />
                ))}
              </div>
            </div>
          ) : courses.length > 0 && currentCourse ? (
            <div className={`grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch transition-opacity duration-200 ${isSearching ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
              {/* Showcase Khóa học Tiêu Điểm */}
              <div className="lg:col-span-8 bg-white border-2 border-slate-900 rounded-3xl p-7 md:p-8 flex flex-col justify-between relative shadow-md min-h-[440px] overflow-hidden">
                <div className="relative z-10 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">

                      {getCourseTypeBadge(currentCourse)}
                    </div>

                    {/* HIỆU ỨNG 3 GẠCH DI CHUYỂN & ĐỔI MÀU */}
                    <div className="flex items-center gap-2 bg-slate-100/80 px-3 py-1.5 rounded-full">
                      {Array.from({ length: Math.min(courses.length, 3) }).map((_, idx) => {
                        const activeIndex = currentIndex % Math.min(courses.length, 3);
                        const isActive = idx === activeIndex;

                        return (
                          <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            aria-label={`Chuyển tới khóa học ${idx + 1}`}
                            className={`h-2 rounded-full transition-all duration-300 ease-out cursor-pointer ${isActive
                              ? "w-8 bg-blue-600 shadow-xs"
                              : "w-3 bg-slate-300 hover:bg-slate-400"
                              }`}
                          />
                        );
                      })}
                      <span className="text-[10px] font-black font-mono text-slate-500 ml-1">
                        {currentIndex + 1}/{courses.length}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">
                      {currentCourse.title}
                    </h2>
                    <p className="text-xs md:text-sm text-slate-600 leading-relaxed max-w-xl">
                      {currentCourse.description || "Chưa có mô tả cho khóa học này."}
                    </p>
                    <p className="text-xs font-extrabold text-blue-600">
                      Giá: {currentCourse.price === 0 ? "Miễn phí" : `${currentCourse.price.toLocaleString("vi-VN")} VNĐ`}
                    </p>
                  </div>
                </div>

                {/* Mũi tên điều hướng Chuyển Khóa Học */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
                  <button
                    onClick={handleNextCourse}
                    className="bg-slate-900 hover:bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-base shadow-lg transition transform active:scale-90 cursor-pointer"
                    title="Khóa tiếp theo"
                  >
                    ➔
                  </button>
                  <button
                    onClick={handlePrevCourse}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 w-10 h-10 rounded-full flex items-center justify-center font-bold text-base transition transform active:scale-90 cursor-pointer"
                    title="Khóa trước"
                  >
                    ←
                  </button>
                </div>

                <div className="relative z-10 pt-6 mt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                    {currentCourse.tags.map((tagName, idx) => (
                      <span key={idx} className="bg-slate-100 text-slate-700 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                        #{tagName}
                      </span>
                    ))}
                  </div>

                  <Link
                    href={`/course-preview/${currentCourse.course_id}`}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-xs transition shrink-0 text-center"
                  >
                    Xem khóa học →
                  </Link>
                </div>
              </div>

              {/* Sidebar Queue bên phải */}
              <div className="lg:col-span-4 space-y-2 max-h-[440px] overflow-y-auto pr-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Danh sách tìm thấy ({courses.length}):
                </span>

                {courses.map((course, idx) => {
                  const isActive = idx === currentIndex;

                  return (
                    <button
                      key={course.course_id}
                      onClick={() => setCurrentIndex(idx)}
                      className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between gap-2.5 cursor-pointer ${isActive
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-white text-slate-900 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                    >
                      {/* min-w-0 giúp Flexbox xử lý cắt chữ truncate chính xác */}
                      <div className="flex items-center justify-between gap-2 w-full min-w-0">
                        <h3 className="text-xs font-bold truncate leading-snug min-w-0 flex-1" title={course.title}>
                          {course.title}
                        </h3>
                        {/* shrink-0 giúp Badge giữ nguyên hình dạng không bao giờ bị ép dẹp */}
                        <div className="shrink-0">
                          {getCourseTypeBadge(course)}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {course.tags.slice(0, 3).map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isActive ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-500"
                              }`}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="min-h-[440px] flex flex-col items-center justify-center bg-white border border-dashed border-slate-200 rounded-3xl p-8 space-y-3">
              <p className="text-xs font-bold text-slate-600">Không tìm thấy khóa học nào phù hợp với từ khóa.</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedTag(null);
                }}
                className="text-xs bg-slate-100 text-slate-700 font-bold px-4 py-2 rounded-xl hover:bg-slate-200 transition cursor-pointer"
              >
                Xóa tìm kiếm
              </button>
            </div>
          )}
        </div>

        {/* ===================================================================== */}
        {/* 3. CÂU HỎI THƯỜNG GẶP (FAQ SECTION) */}
        {/* ===================================================================== */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xs">
          <div className="text-center max-w-xl mx-auto space-y-1.5">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
              Hỗ trợ học viên
            </span>
            <h2 className="text-xl font-extrabold text-slate-900">
              Câu hỏi thường gặp (FAQ)
            </h2>
            <p className="text-xs text-slate-500">
              Giải đáp nhanh các thắc mắc phổ biến về nền tảng học tập LUMER.
            </p>
          </div>

          <div className="space-y-3 max-w-3xl mx-auto pt-2">
            {FAQ_ITEMS.map((faq) => {
              const isOpen = openFaqId === faq.id;

              return (
                <div
                  key={faq.id}
                  className="border border-slate-200/90 rounded-2xl overflow-hidden transition-all duration-200"
                >
                  <button
                    onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                    className="w-full text-left p-4 bg-slate-50/50 hover:bg-slate-100/60 flex items-center justify-between gap-4 transition cursor-pointer"
                  >
                    <span className="text-xs md:text-sm font-bold text-slate-800">
                      {faq.question}
                    </span>
                    <span className="text-sm font-bold text-slate-500 shrink-0">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="p-4 bg-white border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-xs text-slate-400">Đang tải...</div>}>
      <HomeContent />
    </Suspense>
  );
}