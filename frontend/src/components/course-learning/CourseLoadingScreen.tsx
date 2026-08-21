/** Màn hình hiển thị khi đang tải dữ liệu khóa học */
export default function CourseLoadingScreen() {
  return (
    <div className="min-h-screen bg-[#F7F8FB] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-3 border-[#E7E9F0] border-t-[#5B5FEF] animate-spin" />
        <span className="text-sm text-[#565A70] font-semibold">Đang tải không gian học tập...</span>
      </div>
    </div>
  );
}
