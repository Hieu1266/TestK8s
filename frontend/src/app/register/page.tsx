'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { registerGoogleUserAction } from '@/actions/authUser';

export default function RegisterPage() {
  const router = useRouter();

  // Quản lý các trạng thái Form thông thường
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });

  // Quản lý trạng thái UI chung
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 1. Xử lý đăng ký bằng Email & Mật khẩu thông thường
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role_id: null, // Backend của bạn sẽ tự nhận diện và gán role_id = 2
          username: formData.username,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Đăng ký tài khoản thành công! Đang chuyển hướng...');
        setTimeout(() => {
          router.push('/login');
        }, 2000); // Chờ 2 giây để người dùng đọc thông báo thành công
      } else {
        setError(data.detail || 'Đăng ký thất bại, vui lòng thử lại.');
      }
    } catch (err) {
      console.error('Lỗi kết nối:', err);
      setError('Không thể kết nối đến máy chủ Backend.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Xử lý đăng ký google
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8 border border-t-4 border-t-[#0066FF]">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">Đăng Ký Tài Khoản</h2>

        {/* Hiển thị các Alert trạng thái hệ thống nếu có */}
        {error && (
          <div className="text-red-500 text-xs bg-red-50 border border-red-200 p-2.5 rounded-md mb-4 text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="text-green-600 text-xs bg-green-50 border border-green-200 p-2.5 rounded-md mb-4 text-center font-semibold">
            {success}
          </div>
        )}

        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900">Họ và tên</label>
            <input
              required
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="mt-1 w-full p-2.5 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#66CCFF] focus:border-transparent"
              placeholder="Nguyen Van A"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900">Email</label>
            <input
              required
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 w-full p-2.5 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#66CCFF] focus:border-transparent"
              placeholder="name@example.com"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900">Mật khẩu</label>
            <input
              required
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="mt-1 w-full p-2.5 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#66CCFF] focus:border-transparent"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-[#0066FF] hover:bg-[#0052cc] text-white font-semibold py-2.5 rounded-md transition duration-200 shadow-sm font-semibold text-sm ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
          >
            {loading ? 'Đang xử lý...' : 'Đăng ký'}
          </button>
        </form>

        {/* --- CỤM NÚT BẤM CUSTOM ĐĂNG NHẬP GOOGLE --- */}
        <div className="mt-6">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <span className="relative bg-white px-3 text-xs text-gray-400">Hoặc</span>
          </div>

          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => handleGoogleRegister()}
              disabled={loading}
              className={`flex items-center space-x-2 border border-gray-200 rounded-full px-5 py-2 text-xs font-semibold text-gray-700 transition shadow-2xs ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'
                }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.58c-.28 1.48-1.12 2.74-2.38 3.58v2.96h3.84c2.24-2.06 3.53-5.1 3.53-8.65z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.84-2.96c-1.08.72-2.45 1.16-4.09 1.16-3.15 0-5.81-2.13-6.76-5.01H1.17v3.07C3.16 21.18 7.31 24 12 24z" />
                <path fill="#FBBC05" d="M5.24 14.28a7.17 7.17 0 0 1 0-4.56V6.65H1.17a11.94 11.94 0 0 0 0 10.7l4.07-3.07z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.16 2.82 1.17 6.65l4.07 3.07c.95-2.88 3.61-5.01 6.76-5.01z" />
              </svg>
              <span>Google</span>
            </button>
          </div>
        </div>

        <p className="mt-4 text-sm text-center text-gray-700">
          Đã có tài khoản?{' '}
          <Link href="/login" className="text-[#0066FF] hover:underline font-bold">
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  );
}