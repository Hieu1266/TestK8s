'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';

// Import Types & Actions
import { CoursePreview } from '@/types/course';
import { fetchCoursePreview, enrollCourseAction } from '@/actions/getCourse';

function CoursePreviewContent() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [course, setCourse] = useState<CoursePreview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      setLoading(true);
      const data = await fetchCoursePreview(id);
      setCourse(data);
      setLoading(false);
    }

    loadData();
  }, [id]);

  const handleRegister = async () => {
    setSubmitting(true);

    try {
      // Bọc try/catch để đảm bảo không bị đứng giao diện nếu Action throw error
      const result = await enrollCourseAction(id);

      if (result && result.success) {
        alert(`Đăng ký thành công khóa học: ${course?.title}!`);
        router.replace('/course/' + id);
      } else {
        const msg = result?.message || "Đăng ký không thành công.";

        // Chuẩn hóa chuỗi để so sánh linh hoạt hơn
        const lowerMsg = msg.toLowerCase();

        const isAlreadyEnrolled =
          lowerMsg.includes("đã đăng ký") ||
          lowerMsg.includes("already enrolled") ||
          lowerMsg.includes("người dùng đã đăng ký");

        if (isAlreadyEnrolled) {
          alert("Bạn đã đăng ký khóa học này rồi! Hệ thống sẽ chuyển bạn tới trang học.");
          setTimeout(() => {
            router.replace('/course/' + id);
          }, 100);
          return;
        }

        if (lowerMsg.includes("vui lòng đăng nhập")) {
          alert(msg);
          router.push('/login?mode=login');
          return;
        }

        // Hiện alert cho các trường hợp còn lại
        alert(msg);
      }
    } catch (err: any) {
      console.error("Lỗi khi xử lý đăng ký:", err);
      alert(err?.message || "Có lỗi xảy ra khi kết nối tới máy chủ.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-xs text-gray-400">Đang tải dữ liệu khóa học...</div>;
  }

  if (!course) {
    return <div className="p-10 text-center text-xs text-red-500">Không tìm thấy thông tin khóa học!</div>;
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      {/* Banner chính */}
      <div className="bg-[#0b1b35] text-white py-12 px-8">
        <div className="max-w-5xl mx-auto space-y-3">
          <div className="flex flex-wrap gap-2">
            {course.tag_list.map((tag, idx) => (
              <span key={idx} className="text-[10px] bg-blue-900/50 text-[#66CCFF] border border-blue-400/30 font-bold px-2 py-0.5 rounded-md uppercase">
                {tag}
              </span>
            ))}
          </div>

          <h1 className="text-2xl font-black">{course.title}</h1>

          <p className="text-xs text-gray-400">
            Giảng viên: {course.instructor_list.length > 0 ? course.instructor_list.join(', ') : 'Đang cập nhật'}
          </p>
        </div>
      </div>

      {/* Chi tiết khóa học */}
      <div className="max-w-5xl w-full mx-auto px-8 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase text-gray-400">Cấu trúc chương trình học</h3>

            {course.course_structure.map((subject, idx) => (
              <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-white space-y-3 shadow-2xs">
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-xs text-gray-900 font-bold uppercase">
                    Môn {idx + 1}: {subject.title}
                  </span>
                  {subject.instructor_name && (
                    <span className="text-[10px] text-gray-400 italic">
                      👨‍🏫 {subject.instructor_name}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 pl-2">
                  {subject.modules_preview.map((mod, mIdx) => (
                    <div key={mIdx} className="py-1 flex items-center text-xs text-gray-600 font-medium">
                      <span className="w-6 text-[10px] text-gray-400 font-bold">{mIdx + 1}.</span>
                      <span>{mod.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nút đăng ký học */}
        <div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-3 text-center sticky top-6">
            <h4 className="text-[11px] font-bold text-gray-400 uppercase">Học trực tuyến</h4>
            <h3 className="text-sm font-black text-gray-900">Bắt đầu học ngay hôm nay</h3>

            <button
              onClick={handleRegister}
              disabled={submitting}
              className="w-full bg-[#0066FF] hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
            >
              {submitting ? 'Đang xử lý...' : 'Đăng ký tham gia'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CoursePreviewPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <Suspense fallback={<div className="p-10 text-center text-xs text-gray-400">Đang tải cấu trúc dữ liệu...</div>}>
        <CoursePreviewContent />
      </Suspense>
    </div>
  );
}