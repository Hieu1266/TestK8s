"use client";
import Navbar from "@/components/Navbar";

export default function UserManagementPage() {
  const users = [
    {
      id: 1,
      name: "Nguyễn Văn A",
      email: "a@gmail.com",
      role: "Học viên",
      status: "Hoạt động",
      joined: "12/06/2026",
    },
    {
      id: 2,
      name: "Trần Thị B",
      email: "b@gmail.com",
      role: "Giảng viên",
      status: "Hoạt động",
      joined: "05/06/2026",
    },
    {
      id: 3,
      name: "Lê Văn C",
      email: "c@gmail.com",
      role: "Học viên",
      status: "Bị khóa",
      joined: "01/06/2026",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Navbar */}
      {/* <nav className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <h1 className="text-3xl font-bold text-[#0066FF]">LUMER</h1>

            <ul className="hidden md:flex gap-8 text-slate-700">
              <li className="cursor-pointer hover:text-[#0066FF]">Khám phá</li>

              <li className="cursor-pointer hover:text-[#0066FF]">
                Việc học của tôi
              </li>

              <li className="cursor-pointer hover:text-[#0066FF]">Chứng chỉ</li>

              <li className="font-semibold text-[#0066FF] cursor-pointer">
                Quản lý người dùng
              </li>
            </ul>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Tìm kiếm..."
              className="hidden md:block border rounded-full px-4 py-2 w-72"
            />

            <img
              src="https://i.pravatar.cc/150"
              alt="avatar"
              className="w-10 h-10 rounded-full"
            />
          </div>
        </div>
      </nav> */}
      <Navbar />

      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-[#66CCFF] to-[#0066FF] text-white">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <span className="bg-white/20 px-4 py-2 rounded-full text-sm">
            Quản trị hệ thống
          </span>

          <h1 className="text-5xl font-bold mt-4">Quản lý người dùng</h1>

          <p className="text-xl mt-3 text-blue-100">
            Quản lý học viên và giảng viên trên hệ thống LUMER
          </p>

          <div className="flex items-center gap-4 mt-10">
            <img
              src="https://i.pravatar.cc/150"
              alt="avatar"
              className="w-16 h-16 rounded-full border-4 border-white"
            />

            <div>
              <h2 className="text-2xl font-semibold">Xin chào, Admin</h2>

              <p className="text-blue-100">Theo dõi và quản lý người dùng</p>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="max-w-7xl mx-auto px-6 -mt-10">
        <div className="grid md:grid-cols-4 gap-6">
          <StatCard title="1,245" text="Tổng học viên" />
          <StatCard title="48" text="Giảng viên" />
          <StatCard title="1,120" text="Đang hoạt động" />
          <StatCard title="23" text="Bị khóa" />
        </div>
      </section>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-[#0066FF]">
              Danh sách người dùng
            </h2>

            <p className="text-black mt-2">
              Quản lý toàn bộ học viên và giảng viên
            </p>
          </div>

          <button className="bg-[#0066FF] text-white px-5 py-3 rounded-xl hover:bg-blue-700">
            + Thêm người dùng
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Tìm kiếm người dùng..."
              className="flex-1 border rounded-xl px-4 py-3 text-black"
            />

            <select className="border rounded-xl px-4 text-black">
              <option>Tất cả</option>
              <option>Học viên</option>
              <option>Giảng viên</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-blue-50">
              <tr>
                <th className="text-left p-4 text-[#0066FF]">Họ tên</th>

                <th className="text-left p-4 text-[#0066FF]">Email</th>

                <th className="text-left p-4 text-[#0066FF]">Vai trò</th>

                <th className="text-left p-4 text-[#0066FF]">Trạng thái</th>

                <th className="text-left p-4 text-[#0066FF]">Ngày tham gia</th>

                <th className="text-center p-4 text-[#0066FF]">Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t hover:bg-blue-50">
                  <td className="p-4 font-medium text-black">{user.name}</td>

                  <td className="p-4 text-black">{user.email}</td>

                  <td className="p-4">
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                      {user.role}
                    </span>
                  </td>

                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        user.status === "Hoạt động"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>

                  <td className="p-4 text-black">{user.joined}</td>

                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <button className="bg-sky-400 text-white px-3 py-2 rounded-lg hover:bg-sky-500">
                        Xem
                      </button>

                      <button className="bg-[#0066FF] text-white px-3 py-2 rounded-lg hover:bg-blue-700">
                        Sửa
                      </button>

                      <button className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600">
                        Khóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-white rounded-xl shadow p-6 text-center">
      <h3 className="text-4xl font-bold text-[#0066FF]">{title}</h3>

      <p className="text-slate-500 mt-2">{text}</p>
    </div>
  );
}
