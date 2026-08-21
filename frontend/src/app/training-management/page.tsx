"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  ArrowRight,
  ChevronRight,
  GraduationCap,
  LayoutDashboard,
} from "lucide-react";

const menuItems = [
  {
    title: "Chương trình đào tạo mẫu",
    desc: "Xây dựng và quản lý cấu trúc chi tiết của khung chương trình đào tạo.",
    path: "/training-management/curriculum",
  },
  {
    title: "Duyệt khóa học",
    desc: "Kiểm tra nội dung, đánh giá chất lượng và phê duyệt khóa học mới.",
    path: "/training-management/course-approval",
  },
  {
    title: "Quản lý khóa học",
    desc: "Theo dõi, chỉnh sửa thông tin và cập nhật tài nguyên của khóa học.",
    path: "/training-management/course-management",
  },
  {
    title: "Quản lý môn học",
    desc: "Quản lý nội dung môn học, module, bài học và tài liệu giảng dạy.",
    path: "/training-management/course-content",
  },
  {
    title: "Quản lý nhãn khóa học",
    desc: "Thêm, chỉnh sửa và xóa các nhãn dùng để phân loại khóa học.",
    path: "/training-management/tag-management",
  },
  {
    title: "Gán nhãn cho khóa học",
    desc: "Liên kết nhãn phù hợp với từng khóa học để hỗ trợ tìm kiếm và phân loại.",
    path: "/training-management/course-tag",
  },
];

export default function FacultyDashboard() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased">
      <Navbar />

      {/* HEADER SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#0066FF] to-[#0052cc] px-6 pb-24 pt-10 text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-cyan-300 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-medium text-white/80">
            <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 shadow-sm backdrop-blur-md">
              <LayoutDashboard size={14} /> Trang quản trị
            </span>
            <ChevronRight size={12} className="opacity-50" />
            <span className="flex items-center gap-1.5 font-semibold tracking-wide text-white">
              <GraduationCap size={15} /> Quản lý đào tạo
            </span>
          </div>

          <h1 className="text-3xl font-black uppercase tracking-tight drop-shadow-md md:text-4xl">
            QUẢN LÝ ĐÀO TẠO
          </h1>

          <p className="max-w-2xl text-sm font-medium leading-relaxed text-blue-100">
            Quản lý tập trung chương trình đào tạo, khóa học, môn học và hệ
            thống nhãn trên một giao diện thống nhất.
          </p>
        </div>
      </section>

      {/* MAIN CONTENT AREA */}
      <main className="relative z-20 mx-auto -mt-14 max-w-7xl px-6 pb-20">
        <div className="rounded-[2rem] border border-white bg-white/80 p-6 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] backdrop-blur-xl md:p-8">
          <div className="mb-8 flex flex-col gap-3 border-b border-slate-100 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0066FF]">
                Danh mục chức năng
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-800">
                Chọn chức năng quản lý
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Có {menuItems.length} chức năng quản lý đang được hiển thị.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Hệ thống đang hoạt động
            </div>
          </div>

          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {menuItems.map((item, index) => (
              <Link
                key={item.path}
                href={item.path}
                className="group relative flex min-h-[210px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/60"
              >
                <div className="absolute right-0 top-0 h-24 w-24 translate-x-10 -translate-y-10 rounded-full bg-blue-50 transition-transform duration-300 group-hover:scale-150" />

                <div className="relative z-10 flex h-full flex-col">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-all duration-300 group-hover:border-[#0066FF] group-hover:bg-[#0066FF] group-hover:text-white">
                      <ArrowRight
                        size={17}
                        className="transition-transform duration-300 group-hover:translate-x-0.5"
                      />
                    </div>
                  </div>

                  <h3 className="text-lg font-extrabold text-slate-800 transition-colors group-hover:text-[#0066FF]">
                    {item.title}
                  </h3>

                  <p className="mt-2 flex-1 text-sm font-medium leading-6 text-slate-500">
                    {item.desc}
                  </p>

                  <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs font-bold text-[#0066FF]">
                    Truy cập chức năng
                    <ArrowRight
                      size={15}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </div>
                </div>
              </Link>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}
