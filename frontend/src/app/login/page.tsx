"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGoogleLogin } from '@react-oauth/google';
import Navbar from "@/components/Navbar";
import { loginUserAction, registerAccount, loginGoogleUserAction, registerGoogleUserAction } from "@/actions/authUser";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams?.get("mode") || "login";

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rePassword, setRePassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const nextIsLoginMode = mode === "login";
    if (isLoginMode && !nextIsLoginMode) {
      setEmail("");
    }
    setPassword("");
    setRePassword("");
    setName("");
    setShowPassword(false);
    setIsLoginMode(nextIsLoginMode);
  }, [mode]);

  // ------------------ Xử lý Đăng Ký ----------------------
  const handleRegisterSubmit = async () => {
    try {
      const result = await registerAccount(name, email, password);
      if (result.success) {
        alert(result.message);
        router.push('/login?mode=login');
      } else {
        alert(`Đăng ký thất bại: ${result.message}`);
      }
    } catch (error: any) {
      alert('Có lỗi xảy ra khi đăng ký!');
    }
  };

  // ------------------ Xử lý Đăng Nhập Thường ----------------------
  const handleLoginSubmit = async () => {
    try {
      const result = await loginUserAction(email, password);

      if (result.success) {
        alert(result.message);

        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userEmail", email);

        const userRole = result.user?.role;

        // BẮT BUỘC: Dùng window.location.href để xóa Router Cache của Next.js, kích hoạt Middleware kiểm tra quyền

        // SỬA TẠI ĐÂY: Kiểm tra đúng chữ "Instructor"
        if (userRole === "Admin") {
          localStorage.setItem("role", "admin");
          window.location.href = "/admin";
        } else if (userRole === "Instructor" || userRole === "Faculty") {
          localStorage.setItem("role", "faculty");
          window.location.href = "/instructor-management";
        } else if (userRole === "Manager") {
          localStorage.setItem("role", "manager");
          window.location.href = "/training-management";
        } else if (userRole === "Tester") {
          localStorage.setItem("role", "tester");
          window.location.href = "/tester-dashboard";
        } else {
          localStorage.setItem("role", "student");
          window.location.href = "/dashboard-student";
        } 
      } else {
        alert(`Đăng nhập thất bại: ${result.message}`);
      }
    } catch (error: any) {
      alert('Có lỗi xảy ra khi đăng nhập!');
    }
  };

  // ------------------ Xử lý Đăng Nhập Google ----------------------
  const handleGoogleLogin = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      if (!tokenResponse.access_token) {
        setError("Không lấy được mã xác thực từ Google.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await loginGoogleUserAction(tokenResponse.access_token);

        if (result.success) {
          localStorage.setItem("isLoggedIn", "true");
          localStorage.setItem("userEmail", result.user?.email || "");

          const userRole = result.user?.role;

          // BẮT BUỘC: Dùng window.location.href tương tự như luồng đăng nhập thường

          // SỬA TẠI ĐÂY: Kiểm tra đúng chữ "Instructor"
          if (userRole === "Admin") {
            localStorage.setItem("role", "admin");
            window.location.href = "/admin";
          } else if (userRole === "Instructor" || userRole === "Faculty") {
            localStorage.setItem("role", "faculty");
            window.location.href = "/training-management";
          } else if (userRole === "Tester") {
            localStorage.setItem("role", "tester");
            window.location.href = "/tester-dashboard";
          } else {
            localStorage.setItem("role", "student");
            window.location.href = "/dashboard-student";
          }
        } else {
          setError(result.message);
          alert(`Đăng nhập Google thất bại: ${result.message}`);
        }
      } catch (err) {
        setError("Có lỗi xảy ra trong quá trình xử lý phiên đăng nhập.");
        alert("Có lỗi xảy ra khi đăng nhập bằng Google!");
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setError("Đăng nhập bằng Google bị hủy.");
      alert("Đăng nhập bằng Google bị hủy.");
    }
  });
  const handleGoogleRegister = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      if (!tokenResponse.access_token) {
        setError("Không lấy được mã xác thực từ Google.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await registerGoogleUserAction(tokenResponse.access_token);

        if (result.success) {
          alert("Đăng ký tài khoản Google thành công! Vui lòng tiến hành đăng nhập.");

          // --- CHUYỂN HƯỚNG VỀ TRANG LOGIN  ---
          router.push('/login');
        } else {
          // Nếu email đã tồn tại, lỗi 400 từ Backend sẽ nhảy vào đây
          setError(result.message);
          alert(`Đăng ký thất bại: ${result.message}`);
        }
      } catch (err) {
        setError("Có lỗi xảy ra trong quá trình xử lý phiên đăng ký.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError("Đăng ký bằng Google bị hủy.")
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLoginMode && (!name || !rePassword))) {
      alert("Vui lòng nhập đầy đủ thông tin!");
      return;
    }
    if (!isLoginMode && password !== rePassword) {
      alert("Mật khẩu xác nhận không chính xác!");
      return;
    }

    if (isLoginMode) {
      handleLoginSubmit();
    } else {
      handleRegisterSubmit();
    }
  };

  return (
    <div className="max-w-md w-full mx-auto mt-16 p-6 bg-white border border-gray-200 rounded-2xl shadow-xs">
      <h2 className="text-xl font-black text-gray-900 mb-6 text-center">
        {isLoginMode ? "Đăng nhập tài khoản" : "Đăng ký tài khoản mới"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLoginMode && (
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-500 uppercase">Tên Người Dùng</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Họ tên người dùng"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:outline-blue-500"
            />
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-gray-500 uppercase">Email của bạn</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@lumer.com"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:outline-blue-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-gray-500 uppercase">Mật khẩu</label>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:outline-blue-500"
          />
        </div>

        {!isLoginMode && (
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-500 uppercase">Xác nhận mật khẩu</label>
            <input
              type={showPassword ? "text" : "password"}
              value={rePassword}
              onChange={(e) => setRePassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:outline-blue-500"
            />
          </div>
        )}

        <div className="flex items-center space-x-2 pt-1">
          <input
            type="checkbox"
            id="show-password"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
            className="w-3.5 h-3.5 text-[#0066FF] border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
          />
          <label htmlFor="show-password" className="text-xs text-gray-600 select-none cursor-pointer">
            Hiển thị mật khẩu
          </label>
        </div>

        <button
          type="submit"
          className="w-full bg-[#0066FF] hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs transition mt-2 cursor-pointer"
        >
          {isLoginMode ? "Đăng nhập" : "Đăng ký tài khoản"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => router.push(isLoginMode ? "/login?mode=register" : "/login?mode=login")}
          className="text-xs text-[#0066FF] font-bold hover:underline"
        >
          {isLoginMode ? "Chưa có tài khoản? Đăng ký ngay" : "Đã có tài khoản? Quay lại đăng nhập"}
        </button>
      </div>

      <div className="mt-6">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <span className="relative bg-white px-3 text-xs text-gray-400">Hoặc</span>
        </div>

        <div className="mt-4 flex justify-center">
          {isLoginMode ?
            <button
              type="button"
              onClick={() => handleGoogleLogin()}
              className={`flex items-center space-x-2 border border-gray-200 rounded-full px-5 py-2 text-xs font-semibold text-gray-700 transition shadow-2xs ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.58c-.28 1.48-1.12 2.74-2.38 3.58v2.96h3.84c2.24-2.06 3.53-5.1 3.53-8.65z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.84-2.96c-1.08.72-2.45 1.16-4.09 1.16-3.15 0-5.81-2.13-6.76-5.01H1.17v3.07C3.16 21.18 7.31 24 12 24z" />
                <path fill="#FBBC05" d="M5.24 14.28a7.17 7.17 0 0 1 0-4.56V6.65H1.17a11.94 11.94 0 0 0 0 10.7l4.07-3.07z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.16 2.82 1.17 6.65l4.07 3.07c.95-2.88 3.61-5.01 6.76-5.01z" />
              </svg>
              <span>Google</span>
            </button> :
            <button
              type="button"
              onClick={() => handleGoogleRegister()}
              className={`flex items-center space-x-2 border border-gray-200 rounded-full px-5 py-2 text-xs font-semibold text-gray-700 transition shadow-2xs ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.58c-.28 1.48-1.12 2.74-2.38 3.58v2.96h3.84c2.24-2.06 3.53-5.1 3.53-8.65z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.84-2.96c-1.08.72-2.45 1.16-4.09 1.16-3.15 0-5.81-2.13-6.76-5.01H1.17v3.07C3.16 21.18 7.31 24 12 24z" />
                <path fill="#FBBC05" d="M5.24 14.28a7.17 7.17 0 0 1 0-4.56V6.65H1.17a11.94 11.94 0 0 0 0 10.7l4.07-3.07z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.16 2.82 1.17 6.65l4.07 3.07c.95-2.88 3.61-5.01 6.76-5.01z" />
              </svg>
              <span>Google</span>
            </button>
          }
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col">
      <Navbar />
      <Suspense fallback={<div className="text-center p-10 text-xs text-gray-400">Đang tải biểu mẫu...</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}