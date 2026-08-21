"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";

// ==================== DEFINITIONS & TYPES ====================
interface TopCourse {
  id: string;
  title: string;
  category: string;
  enrollments: number;
  revenue: number;
  rating: number;
}

interface RecentTransaction {
  id: string;
  studentName: string;
  courseTitle: string;
  amount: number;
  status: "Thành công" | "Đang xử lý" | "Thất bại";
  date: string;
}

interface MicroserviceStatus {
  name: string;
  status: "Healthy" | "Degraded" | "Down";
  responseTime: number;
  cpuUsage: number;
}

interface SystemLog {
  id: string;
  timestamp: string;
  service: string;
  level: "ERROR" | "WARNING" | "INFO";
  message: string;
}

export default function UnifiedAdminDashboard() {
  // State quản lý Tab hiện tại: "analytics" hoặc "system"
  const [activeTab, setActiveTab] = useState<"analytics" | "system">("analytics");

  // ==================== STATE & MOCK DATA ====================
  const [timeRange, setTimeRange] = useState("30_days");
  const [systemLoad, setSystemLoad] = useState(42);

  const kpis = [
    { title: "Tổng doanh thu (Tháng này)", value: "348,250,000 ₫", change: "+14.2%", isPositive: true, icon: "💰" },
    { title: "Học viên đăng ký mới", value: "1,284 học viên", change: "+22.5%", isPositive: true, icon: "👥" },
    { title: "Khóa học đang hoạt động", value: "42 khóa học", change: "0%", isPositive: true, icon: "📘" },
    { title: "Tỷ lệ hoàn thành môn (Avg)", value: "68.4%", change: "-2.1%", isPositive: false, icon: "🎓" },
  ];

  const [topCourses] = useState<TopCourse[]>([
    { id: "c-1", title: "Chương trình chuyên sâu Phân tích Dữ liệu (Data Analytics)", category: "Data Science", enrollments: 452, revenue: 135600000, rating: 4.8 },
    { id: "c-2", title: "Chương trình đào tạo Kỹ sư Front-End Next.js chuyên sâu", category: "Web Development", enrollments: 389, revenue: 116700000, rating: 4.9 },
    { id: "c-3", title: "Khung đào tạo Chuyên gia Thiết kế Trải nghiệm Người dùng (UI/UX)", category: "Design", enrollments: 215, revenue: 53750000, rating: 4.6 }
  ]);

  const [transactions] = useState<RecentTransaction[]>([
    { id: "TX-9981", studentName: "Nguyễn Văn A", courseTitle: "Kỹ sư Front-End Next.js", amount: 2990000, status: "Thành công", date: "Hôm nay, 16:45" },
    { id: "TX-9980", studentName: "Trần Thị B", courseTitle: "Phân tích Dữ liệu (Data Analytics)", amount: 3500000, status: "Thành công", date: "Hôm nay, 14:20" },
    { id: "TX-9979", studentName: "Lê Hoàng C", courseTitle: "Chuyên gia Thiết kế UI/UX", amount: 2500000, status: "Đang xử lý", date: "Hôm nay, 11:05" }
  ]);

  const [services] = useState<MicroserviceStatus[]>([
    { name: "User & Auth Service", status: "Healthy", responseTime: 45, cpuUsage: 22 },
    { name: "Course Content Service", status: "Healthy", responseTime: 60, cpuUsage: 35 },
    { name: "Quiz & Assessment Service", status: "Degraded", responseTime: 450, cpuUsage: 88 },
    { name: "Certificate Media Service", status: "Healthy", responseTime: 85, cpuUsage: 18 },
  ]);

  const [logs] = useState<SystemLog[]>([
    { id: "L-01", timestamp: "18:05:22", service: "Quiz Service", level: "ERROR", message: "Database connection pool timeout on submission retry." },
    { id: "L-02", timestamp: "18:02:10", service: "Quiz Service", level: "WARNING", message: "CPU Threshold exceeded 85% on node-quizz-replica-1." },
    { id: "L-04", timestamp: "17:42:01", service: "Auth Service", level: "ERROR", message: "JWT verification failed: TokenExpiredError from IP 42.113.x.x." },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSystemLoad(Math.floor(Math.random() * (46 - 38 + 1)) + 38);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${activeTab === "system" ? "bg-[#0F172A] text-slate-100" : "bg-[#F8FAFC] text-gray-900"}`}>
      
      {/* HEADER TỔNG CỦA DASHBOARD */}
      <div className="max-w-7xl w-full mx-auto px-6 pt-8 pb-2">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-gray-200/60 dark:border-slate-800 pb-4">
          
          {/* Bên trái: Tiêu đề & Cụm điều hướng Tab */}
          <div className="space-y-4">
            <div>
              <h1 className={`text-xl font-black tracking-tight ${activeTab === "system" ? "text-white" : "text-gray-900"}`}>
                {activeTab === "analytics" ? "🎓 Central Admin Command Center" : "🖥️ SRE Infrastructure Monitor"}
              </h1>
              <p className={`text-xs mt-0.5 ${activeTab === "system" ? "text-slate-400" : "text-gray-500"}`}>
                {activeTab === "analytics" ? "Quản lý dữ liệu kinh doanh và học tập toàn hệ thống" : "Giám sát hiệu năng phần cứng và microservices liên tục"}
              </p>
            </div>

            {/* THANH TABS - CHUYỂN ĐỔI THEO PHONG CÁCH HÌNH MẪU */}
            <div className="flex items-center gap-6 text-sm font-bold pt-1">
              <button
                onClick={() => setActiveTab("analytics")}
                className={`pb-2 px-1 transition relative cursor-pointer border-none bg-transparent font-bold text-xs ${
                  activeTab === "analytics" 
                    ? "text-[#0066FF]" 
                    : activeTab === "system" ? "text-slate-500 hover:text-slate-300" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                📊 Báo cáo Thống kê
                {activeTab === "analytics" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0066FF]" />}
              </button>
              <button
                onClick={() => setActiveTab("system")}
                className={`pb-2 px-1 transition relative cursor-pointer border-none bg-transparent font-bold text-xs ${
                  activeTab === "system" 
                    ? "text-[#0066FF]" 
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                ⚙️ Giám sát Hệ thống
                {activeTab === "system" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0066FF]" />}
              </button>
            </div>
          </div>

          {/* Bên phải: NÚT THOÁT VỀ ĐƯỢC THÊM VÀO */}
          <div className="self-end md:self-start">
            <Link 
              href="/admin/" 
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all no-underline ${
                activeTab === "system" 
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700" 
                  : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 shadow-3xs"
              }`}
            >
              X
            </Link>
          </div>

        </div>
      </div>

      {/* ==================== TAB 1: ADMIN ANALYTICS ==================== */}
      {activeTab === "analytics" && (
        <div className="animate-fadeIn">
          {/* Lưới chỉ số KPI */}
          <div className="max-w-7xl w-full mx-auto px-6 mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {kpis.map((kpi, idx) => (
              <div key={idx} className="bg-white border border-gray-100 p-5 rounded-2xl shadow-3xs flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">{kpi.title}</span>
                  <span className="text-lg font-black text-gray-900 block tracking-tight">{kpi.value}</span>
                  <span className={`text-[10px] font-bold ${kpi.isPositive ? "text-green-600" : "text-red-500"}`}>
                    {kpi.isPositive ? "▲" : "▼"} {kpi.change}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-md shadow-3xs">{kpi.icon}</div>
              </div>
            ))}
          </div>

          {/* Biểu đồ và Top danh mục */}
          <div className="max-w-7xl w-full mx-auto px-6 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-5 shadow-3xs">
              <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider border-b border-gray-50 pb-3 mb-4">📈 Doanh thu & Ghi danh</h3>
              <div className="h-44 flex items-end justify-between gap-2 pt-4 px-2">
                {[35, 45, 28, 60, 55, 70, 85, 65, 90, 110, 95, 120].map((height, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <div style={{ height: `${height * 1.1}px` }} className={`w-full rounded-t-sm ${i === 11 ? "bg-[#0066FF]" : "bg-blue-100"}`} />
                    <span className="text-[9px] font-mono font-bold text-gray-400">T{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-1 bg-white border border-gray-100 rounded-2xl p-5 shadow-3xs">
              <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider border-b border-gray-50 pb-3 mb-4">🎯 Thị phần Lĩnh vực</h3>
              <div className="space-y-4">
                {[{ name: "Data Science", percent: 42, color: "bg-[#0066FF]" }, { name: "Web Dev", percent: 35, color: "bg-emerald-500" }, { name: "UI/UX Design", percent: 23, color: "bg-amber-500" }].map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-medium text-gray-700"><span>{item.name}</span><b>{item.percent}%</b></div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden"><div style={{ width: `${item.percent}%` }} className={`h-full ${item.color}`} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bảng dữ liệu chi tiết */}
          <div className="max-w-7xl w-full mx-auto px-6 mt-6 pb-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-5 shadow-3xs">
              <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider border-b border-gray-50 pb-3 mb-3">⭐ Khóa học doanh thu cao</h3>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 text-[10px] uppercase font-bold"><th className="pb-2 font-bold">Khóa học</th><th className="pb-2 font-bold">Học viên</th><th className="pb-2 font-bold text-right">Doanh thu</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topCourses.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50"><td className="py-2.5 font-bold text-gray-800 max-w-[240px] truncate">{c.title}</td><td className="py-2.5 font-mono text-gray-500">{c.enrollments}</td><td className="py-2.5 text-right font-mono font-black">{c.revenue.toLocaleString()} ₫</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:col-span-1 bg-white border border-gray-100 rounded-2xl p-5 shadow-3xs">
              <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider border-b border-gray-50 pb-3 mb-3">💸 Nhật ký giao dịch</h3>
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex justify-between text-xs border-b border-gray-50 pb-2.5 last:border-none last:pb-0">
                    <div className="truncate max-w-[70%]"><div className="font-bold text-gray-800">{tx.studentName}</div><div className="text-[10px] text-gray-400 truncate">{tx.courseTitle}</div></div>
                    <div className="text-right font-mono font-black text-gray-900">+{tx.amount.toLocaleString()} ₫</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: SYSTEM MONITOR ==================== */}
      {activeTab === "system" && (
        <div className="animate-fadeIn">
          {/* Lưới phần cứng hệ thống */}
          <div className="max-w-7xl w-full mx-auto px-6 mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { title: "Tải máy chủ trung bình", value: `${systemLoad}%`, color: "text-blue-400" },
              { title: "Băng thông mạng (In/Out)", value: "142.5 Mbps", color: "text-purple-400" },
              { title: "Tỷ lệ lỗi HTTP (5xx)", value: "0.04%", color: "text-emerald-400" },
              { title: "Học viên đồng thời (CCU)", value: "2,480 /s", color: "text-amber-400" }
            ].map((metric, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{metric.title}</span>
                <span className={`text-xl font-black ${metric.color} block tracking-tight mt-1 font-mono`}>{metric.value}</span>
              </div>
            ))}
          </div>

          {/* Biểu đồ request và trạng thái microservices */}
          <div className="max-w-7xl w-full mx-auto px-6 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-3 mb-4">📈 Biểu đồ xung nhịp Request (Lưu lượng tải)</h3>
              <div className="h-44 flex items-end justify-between gap-1 pt-4 px-1">
                {[40, 45, 55, 50, 48, 52, 60, 75, 80, 95, 110, 130, 140, 120, 90, 85, 70, 75, 88, 92, 105, 115, 125].map((val, i) => (
                  <div key={i} style={{ height: `${val * 0.8}px` }} className={`flex-1 rounded-t-xs ${val > 100 ? "bg-amber-500/80" : "bg-blue-500/50"}`} />
                ))}
              </div>
            </div>

            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-3 mb-3">🛠️ Trạng thái Microservices</h3>
              <div className="space-y-2.5">
                {services.map((srv, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs bg-slate-950 p-2 rounded-xl border border-slate-800/60">
                    <div><span className="font-bold text-slate-200 block">{srv.name}</span><span className="text-[10px] text-slate-500 font-mono">CPU: {srv.cpuUsage}% | {srv.responseTime}ms</span></div>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${srv.status === "Healthy" ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-amber-400"}`}>{srv.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bảng lỗi / Console logs */}
          <div className="max-w-7xl w-full mx-auto px-6 mt-6 pb-12">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-3 mb-3">🗂️ Nhật ký sự cố tập trung</h3>
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase font-bold"><th className="pb-2">Time</th><th className="pb-2">Service</th><th className="pb-2">Level</th><th className="pb-2">Message</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-950/40"><td className="py-2.5 text-slate-400 text-[11px]">{log.timestamp}</td><td className="py-2.5 text-slate-200 font-bold">{log.service}</td><td><span className={`px-1 py-0.2 rounded text-[9px] font-bold ${log.level === "ERROR" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}>{log.level}</span></td><td className="py-2.5 text-slate-400 text-[11px] max-w-sm truncate">{log.message}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}