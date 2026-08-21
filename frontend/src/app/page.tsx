'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { getFeaturedCourses } from '@/actions/getCourse';
import { GeneralCourseInfo } from '@/types/course';

export default function LandingPage() {
  const [topCourses, setTopCourses] = useState<GeneralCourseInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  // Gọi API lấy Top 5 khóa học nổi bật
  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true);
      try {
        const courses = await getFeaturedCourses();
        setTopCourses(courses.slice(0, 5));
      } catch (error) {
        console.error('Lỗi khi tải Top 5 khóa học:', error);
        setTopCourses([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, []);

  // Xử lý khi click vào nút "Bắt đầu ngay"
  const handleGetStarted = (e: React.MouseEvent) => {
    e.preventDefault();

    // 1. Kiểm tra sự tồn tại của Cookie 'token'
    const hasTokenCookie = document.cookie
      .split('; ')
      .some((item) => item.trim().startsWith('token='));

    // 2. Kiểm tra thêm localStorage (Dự phòng trường hợp token là HttpOnly cookie nên JS không đọc được)
    const isLoggedInStorage = localStorage.getItem('isLoggedIn') === 'true';

    if (hasTokenCookie || isLoggedInStorage) {
      router.push('/dashboard-student');
    } else {
      router.push('/login?mode=register');
    }
  };

  const featuredCourse = topCourses[0];
  const remainingCourses = topCourses.slice(1, 5);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      <Navbar />

      {/* 1. HERO SECTION */}
      <section className="border-b border-slate-200/80 bg-white py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-6">
          <div className="inline-block bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
            Nền tảng đào tạo công nghệ LUMER
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight max-w-3xl mx-auto">
            Hệ thống quản lý & học tập từ xa hiệu quả
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            Cung cấp chương trình đào tạo chuẩn hóa, giúp bạn chủ động thời gian, nâng cao kỹ năng chuyên môn và làm chủ tri thức mọi lúc, mọi nơi.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            {/* ĐÃ SỬA: Thay Link thành button kèm sự kiện handleGetStarted */}
            <button
              onClick={handleGetStarted}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-7 py-3.5 rounded-lg shadow-sm transition cursor-pointer"
            >
              Bắt đầu ngay
            </button>
            <Link
              href="/home"
              className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm px-6 py-3.5 rounded-lg transition"
            >
              Xem danh sách khóa học
            </Link>
          </div>
        </div>
      </section>

      {/* 2. STATS SECTION */}
      <section className="border-b border-slate-200 bg-slate-100/50 py-8">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <p className="text-2xl font-black text-slate-900">10.000+</p>
            <p className="text-xs text-slate-500 font-medium mt-1">Học viên tham gia</p>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">98%</p>
            <p className="text-xs text-slate-500 font-medium mt-1">Tỷ lệ hài lòng</p>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">24/7</p>
            <p className="text-xs text-slate-500 font-medium mt-1">Hỗ trợ giảng viên</p>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">100%</p>
            <p className="text-xs text-slate-500 font-medium mt-1">Lộ trình thực chiến</p>
          </div>
        </div>
      </section>

      {/* 3. COURSES SECTION (Top 5 từ API) */}
      <section id="courses" className="max-w-5xl mx-auto px-6 py-16 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-200 pb-4 gap-2">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Khóa học đề xuất</span>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">5 Khóa học nổi bật</h2>
          </div>
          <p className="text-xs text-slate-500">Chương trình đào tạo được cập nhật mới nhất</p>
        </div>

        {/* Trạng thái Loading Skeleton */}
        {isLoading ? (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-8 animate-pulse h-48" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="bg-white border border-slate-200 rounded-xl p-6 animate-pulse h-36" />
              ))}
            </div>
          </div>
        ) : topCourses.length > 0 ? (
          <div className="space-y-6">
            {/* Khóa 1: Featured Card (Khóa hot nhất) */}
            {featuredCourse && (
              <div className="bg-white border-2 border-blue-600 rounded-xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xs">
                <div className="space-y-3 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                      Nổi bật
                    </span>
                    <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded uppercase">
                      {featuredCourse.is_long_term ? 'Dài hạn' : 'Ngắn hạn'}
                    </span>
                    {featuredCourse.enrollment_count !== undefined && (
                      <span className="text-xs font-medium text-slate-500">
                        🔥 {featuredCourse.enrollment_count} lượt đăng ký
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900">{featuredCourse.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {featuredCourse.description || 'Chưa có mô tả cho khóa học này.'}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    {featuredCourse.tags?.map((tag, idx) => (
                      <span key={idx} className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="w-full md:w-auto shrink-0 flex flex-col items-end gap-3">
                  <p className="text-sm font-extrabold text-blue-600">
                    {featuredCourse.price === 0 ? 'Miễn phí' : `${featuredCourse.price.toLocaleString('vi-VN')} VNĐ`}
                  </p>
                  <Link
                    href={`/course-preview/${featuredCourse.course_id}`}
                    className="w-full sm:w-auto text-center bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-3 rounded-lg transition"
                  >
                    Xem chi tiết
                  </Link>
                </div>
              </div>
            )}

            {/* 4 Khóa học còn lại (Grid 2x2) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {remainingCourses.map((course) => (
                <div
                  key={course.course_id}
                  className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between hover:border-slate-300 transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase inline-block">
                        {course.is_long_term ? 'Dài hạn' : 'Ngắn hạn'}
                      </span>
                      <span className="text-xs font-bold text-blue-600">
                        {course.price === 0 ? 'Miễn phí' : `${course.price.toLocaleString('vi-VN')} đ`}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 line-clamp-1">{course.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {course.description || 'Chưa có mô tả.'}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex gap-1 overflow-hidden">
                      {course.tags?.slice(0, 2).map((tag, idx) => (
                        <span key={idx} className="text-[10px] text-slate-400 font-medium">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <Link
                      href={`/course-preview/${course.course_id}`}
                      className="text-blue-600 hover:text-blue-800 font-bold shrink-0"
                    >
                      Xem khóa học →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
            Hiện chưa có khóa học nổi bật nào.
          </div>
        )}
      </section>

      {/* 4. FOOTER CALL TO ACTION */}
      <section className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Bắt đầu hành trình học tập tại LUMER</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">Tạo tài khoản ngay hôm nay để truy cập vào kho bài giảng và tài nguyên miễn phí.</p>
          <div className="pt-2">
            <Link
              href="/login?mode=register"
              className="inline-block bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-6 py-3 rounded-lg transition"
            >
              Đăng ký tài khoản
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}