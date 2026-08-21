"use client";
import { useEffect, useState } from "react";

export default function UnauthorizedPage() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const storedRole = localStorage.getItem("role")?.toLowerCase() || null;
    setRole(storedRole);
  }, []);

  const handleGoHome = () => {
    switch (role) {
      case "admin":
        window.location.href = "/admin";
        break;
      case "faculty":
      case "instructor":
        window.location.href = "/instructor-management";
        break;
      case "student":
      case "user":
        window.location.href = "/dashboard-student";
        break;
      case "manager":
        window.location.href = "/training-management";
        break;
      case "tester":
        window.location.href = "/tester-dashboard";
        break;
      default:
        window.location.href = "/login?mode=login";
        break;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-gray-900">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-red-100 text-red-600 flex items-center justify-center rounded-full text-3xl font-bold animate-bounce">
          ⛔
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Truy Cập Bị Từ Chối!
          </h1>
          <p className="text-xs text-gray-500 leading-relaxed">
            Tài khoản của bạn không có quyền hạn để truy cập vào phân hệ này. Hành vi cố tình truy cập trái phép có thể bị ghi nhận lại hệ thống.
          </p>
        </div>

        <hr className="border-gray-100" />

        <div className="flex flex-col space-y-2">
          <button
            onClick={handleGoHome}
            className="w-full bg-[#0066FF] hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs transition cursor-pointer shadow-xs"
          >
            Quay về trang chủ của bạn
          </button>
          
          <button
            onClick={() => window.location.href = "/login?mode=login"}
            className="w-full bg-slate-100 hover:bg-slate-200 text-gray-700 font-bold py-3 rounded-xl text-xs transition cursor-pointer"
          >
            Đăng nhập tài khoản khác
          </button>
        </div>
      </div>
    </div>
  );
}