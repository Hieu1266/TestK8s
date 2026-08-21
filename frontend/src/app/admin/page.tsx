"use client";

import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function AdminDashboard() {
  const router = useRouter();

  const features = [
    {
      title: "Quản lý người dùng",
      desc: "Quản lý học viên và giảng viên",
      route: "/admin/user-management",
      icon: "👥",
    },
    {
      title: "Báo cáo",
      desc: "Thống kê hệ thống",
      route: "/admin/reports",
      icon: "📈",
    },
    {
      title: "Cài đặt",
      desc: "Cấu hình hệ thống",
      route: "/admin/settings",
      icon: "⚙️",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />
      {/* Header */}
      <section className="bg-gradient-to-r from-[#66CCFF] to-[#0066FF] text-white">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h1 className="text-5xl font-bold">Trang quản trị LUMER</h1>

          <p className="text-xl mt-4 text-blue-100">
            Quản lý toàn bộ hệ thống E-Learning
          </p>
          <div className="flex items-center gap-4 mt-10">
            <img
              src="https://i.pravatar.cc/150"
              alt="avatar"
              className="w-16 h-16 rounded-full border-4 border-white"
            />
            <div>
              <h2 className="text-2xl font-semibold">Xin chào, Admin</h2>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((item) => (
            <div
              key={item.title}
              onClick={() => router.push(item.route)}
              className="bg-white rounded-2xl p-8 shadow hover:shadow-xl hover:-translate-y-1 transition cursor-pointer"
            >
              <div className="text-5xl mb-4">{item.icon}</div>

              <h2 className="text-2xl font-bold text-[#0066FF]">
                {item.title}
              </h2>

              <p className="text-slate-500 mt-2">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
