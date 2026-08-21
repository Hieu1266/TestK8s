"use client";

import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function TeacherDashboard() {
  const router = useRouter();

  // Danh sách chức năng
  const features = [
    {
      title: "Quản lý môn học",
      desc: "Tạo môn học, thiết lập các chương, module và quản lý danh sách bài học.",
      route: "/instructor-management/course-content",
      icon: "📁",
      tag: "Nội dung",
      badgeColor: "bg-indigo-50 text-indigo-600 border-indigo-100",
    },
    {
      title: "Ngân hàng câu hỏi",
      desc: "Kho lưu trữ câu hỏi trắc nghiệm, tự luận dùng chung để tổ chức đề thi.",
      route: "/instructor-management/questions-bank",
      icon: "🗂️",
      tag: "Dữ liệu",
      badgeColor: "bg-amber-50 text-amber-600 border-amber-100",
    },
    {
      title: "Quản lý bài thi",
      desc: "Tạo và cấu hình đề cố định / ngẫu nhiên, chấm bài thi cho sinh viên.",
      route: "/instructor-management/exam-manage",
      icon: "📝",
      tag: "Kiểm tra",
      badgeColor: "bg-emerald-50 text-emerald-600 border-emerald-100",
    },
    {
      title: "Chấm điểm & Bài nộp",
      desc: "Quản lý lượt nộp bài thi của sinh viên, chấm bài tự luận và xem ảnh đồ thị.",
      route: "/instructor-management/submission-manage",
      icon: "📊",
      tag: "Chấm điểm",
      badgeColor: "bg-blue-50 text-blue-600 border-blue-100",
    },
    {
      title: "Nhận xét khóa học",
      desc: "Nhận xét từ kiểm thử cho khóa học của bạn",
      route: "/instructor-management/tester-comment",
      icon: "💬",
      tag: "Nhận xét",
      badgeColor: "bg-blue-50 text-blue-600 border-blue-100",
    },
    {
      title: "Phân công cộng tác viên",
      desc: "Chọn môn học và phân công Tester làm cộng tác viên hỗ trợ kiểm thử.",
      route: "/instructor-management/collaborator-manage",
      icon: "🤝",
      tag: "Cộng tác",
      badgeColor: "bg-purple-50 text-purple-600 border-purple-100",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">
      <Navbar />

      {/* Hero Header Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0052D4] via-[#0066FF] to-[#4364F7] text-white py-12 px-6">
        {/* Background Accent Lines */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-blue-100 text-xs font-semibold mb-4 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse" />
                Hệ thống Quản lý Giảng dạy LUMER
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                Trang Bàn Làm Việc Giảng Viên
              </h1>
              <p className="text-blue-100 mt-2 text-sm md:text-base max-w-2xl leading-relaxed">
                Quản lý tiến độ giảng dạy, biên soạn đề cương, thiết lập ngân
                hàng câu hỏi và bài kiểm tra trực quan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Feature Grid Section */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-900">
            Chức năng quản lý chính
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Lựa chọn mô-đun để bắt đầu làm việc
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((item) => (
            <div
              key={item.title}
              onClick={() => router.push(item.route)}
              className="group bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-blue-300 hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#0066FF] opacity-0 group-hover:opacity-100 transition-opacity" />

              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="w-12 h-12 rounded-xl bg-blue-50/80 group-hover:bg-blue-100 text-2xl flex items-center justify-center transition-colors">
                    {item.icon}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${item.badgeColor}`}
                  >
                    {item.tag}
                  </span>
                </div>

                <h2 className="text-base font-bold text-slate-900 group-hover:text-[#0066FF] transition-colors">
                  {item.title}
                </h2>

                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#0066FF]">
                <span>Truy cập</span>
                <span className="group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
