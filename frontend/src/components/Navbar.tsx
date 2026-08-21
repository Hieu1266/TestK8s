"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { logoutUserAction } from "@/actions/authUser";

export default function Navbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);
  const [role, setRole] = useState("");

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem("isLoggedIn") === "true");
    const savedRole = (localStorage.getItem("role") || "").toLowerCase();
    setRole(savedRole);

    const handleClickOutside = (event: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getUserMenuConfig = () => {
    switch (role) {
      case "admin":
        return { label: "Quản lý hệ thống", path: "/admin" };
      case "manager":
        return { label: "Không gian quản lý", path: "/training-management" };
      case "instructor":
      case "faculty":
        return { label: "Không gian giảng dạy", path: "/instructor-management" };
      case "tester":
        return { label: "Không gian kiểm thử", path: "/tester-dashboard" };
      case "user":
      case "student":
      default:
        return { label: "Việc học của tôi", path: "/dashboard-student" };
    }
  };

  const handleLogout = async () => {
    try {
      // 1. Gọi Next.js Server Action để xóa cookie httpOnly (token)
      await logoutUserAction();

      // 2. Xóa các cookie phía client (phòng khi có cookie không phải httpOnly)
      document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
      document.cookie = "user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";

      // 3. Xóa dữ liệu trong localStorage
      localStorage.clear();

      // 4. Cập nhật state
      setIsLoggedIn(false);
      setShowUserMenu(false);
      alert("Đã đăng xuất tài khoản!");

      // 5. Chuyển hướng và làm sạch cache trình duyệt
      window.location.href = "/";
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);
    }
  };

  const menuConfig = getUserMenuConfig();

  const getAvatarText = () => {
    switch (role) {
      case "admin": return "AD";
      case "manager": return "MN";
      case "instructor":
      case "faculty": return "GV";
      case "tester": return "TS";
      default: return "ST";
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 px-6 py-3.5 flex justify-between items-center font-sans">
      <div className="flex items-center space-x-6">
        <Link
          href={isLoggedIn ? "/home" : "/"}
          className="text-base font-black text-[#0066FF] tracking-tight no-underline"
        >
          LUMER <span className="text-blue-400 font-medium text-xs">elearning</span>
        </Link>
      </div>

      <div className="flex items-center space-x-4">
        {isLoggedIn ? (
          <div className="relative" ref={userRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-8 h-8 bg-[#0b1b35] hover:bg-slate-800 text-white font-black text-xs rounded-full flex items-center justify-center cursor-pointer border border-slate-200 transition uppercase"
            >
              {getAvatarText()}
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 z-50 divide-y divide-gray-100">
                <div className="py-1">
                  <Link
                    href={menuConfig.path}
                    onClick={() => setShowUserMenu(false)}
                    className="block px-4 py-2 text-xs font-bold text-gray-700 hover:bg-slate-50 hover:text-[#0066FF] transition no-underline"
                  >
                    {menuConfig.label}
                  </Link>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition cursor-pointer border-none bg-transparent"
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link href="/login?mode=login" className="text-xs font-bold text-gray-700 hover:text-blue-600 transition no-underline">
              Đăng nhập
            </Link>
            <Link href="/login?mode=register" className="bg-blue-50 hover:bg-blue-100 text-[#0066FF] border border-blue-100 text-xs font-bold px-4 py-2 rounded-xl transition no-underline">
              Đăng ký tài khoản
            </Link>
          </>
        )}
      </div>
    </header>
  );
}