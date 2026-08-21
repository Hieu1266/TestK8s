export default function CourseDescriptionPage() {
  return (
    <div className="min-h-screen bg-slate-100">
      {/* Navbar */}
      <nav className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <h1 className="text-3xl font-bold text-[#0066FF]">LUMER</h1>

            <ul className="hidden md:flex gap-8 text-black">
              <li className="cursor-pointer hover:text-[#0066FF]">Khám phá</li>

              <li className="cursor-pointer hover:text-[#0066FF]">
                Việc học của tôi
              </li>

              <li className="cursor-pointer hover:text-[#0066FF]">Chứng chỉ</li>

              <li className="font-semibold text-[#0066FF] cursor-pointer">
                Khóa học
              </li>
            </ul>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Tìm kiếm khóa học..."
              className="hidden md:block border rounded-full px-4 py-2 w-72"
            />

            <img
              src="https://i.pravatar.cc/150"
              alt="avatar"
              className="w-10 h-10 rounded-full"
            />
          </div>
        </div>
      </nav>

      {/* Banner */}
      <section className="bg-gradient-to-r from-[#66CCFF] to-[#0066FF] text-white">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
            Tên nhóm của khóa học
          </span>

          <h1 className="text-5xl font-bold mt-4">Tên Khóa Học</h1>

          <p className="mt-4 text-lg text-blue-100 max-w-3xl">
            Kiến thức mà khóa học này sẽ cung cấp cho bạn, tổng quan kiến thức
            của khóa học.
          </p>

          <div className="flex items-center gap-4 mt-6">
            <img
              src="https://i.pravatar.cc/100"
              alt="teacher"
              className="w-12 h-12 rounded-full"
            />

            <div>
              <p className="font-semibold text-white">Tên Giảng Viên</p>

              <p className="text-sm text-blue-100">Chuyên môn của giảng viên</p>
            </div>
          </div>

          <button className="mt-8 bg-white text-[#0066FF] px-8 py-3 rounded-lg font-semibold hover:bg-blue-50">
            Đăng ký ngay
          </button>
        </div>
      </section>

      {/* Thông tin nhanh */}
      <section className="max-w-6xl mx-auto px-6 -mt-10">
        <div className="grid md:grid-cols-4 gap-4">
          <InfoCard title="12" text="Module" />
          <InfoCard title="5 ⭐" text="Đánh giá" />
          <InfoCard title="3 tháng" text="Thời lượng" />
          <InfoCard title="1.200+" text="Học viên" />
        </div>
      </section>

      {/* Nội dung */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Mô tả */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow">
            <h2 className="text-2xl font-bold mb-4 text-black">
              Giới thiệu khóa học
            </h2>

            <p className="text-black leading-8">
              Mô tả về khóa học. Lorem ipsum dolor sit amet consectetur
              adipisicing elit.
            </p>

            <h3 className="text-xl font-semibold mt-8 mb-3 text-black">
              Mục tiêu của khóa học
            </h3>

            <ul className="space-y-2 text-black">
              <li>✅ Mục tiêu 1</li>
              <li>✅ Mục tiêu 2</li>
              <li>✅ Mục tiêu 3</li>
              <li>✅ Mục tiêu 4</li>
              <li>✅ Mục tiêu 5</li>
            </ul>
          </div>

          {/* Sidebar */}
          <div className="bg-white p-6 rounded-xl shadow h-fit">
            <h2 className="text-xl font-bold mb-4 text-black">
              Thông tin khóa học
            </h2>

            <div className="space-y-4 text-black">
              <p>📚 12 bài học</p>
              <p>⏰ 30 giờ học</p>
              <p>🎓 Cấp độ: Cơ bản</p>
              <p>📜 Có chứng chỉ</p>
            </div>

            <button className="w-full mt-6 bg-[#0066FF] text-white py-3 rounded-lg hover:bg-blue-700">
              Học ngay
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoCard({ title, text }) {
  return (
    <div className="bg-white rounded-xl shadow p-6 text-center">
      <h3 className="text-3xl font-bold text-[#0066FF]">{title}</h3>

      <p className="text-black mt-2">{text}</p>
    </div>
  );
}
