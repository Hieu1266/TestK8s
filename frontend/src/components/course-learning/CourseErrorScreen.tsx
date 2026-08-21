type CourseErrorScreenProps = {
  errorMessage?: string | null;
  onBackHome: () => void;
};

/** Màn hình hiển thị khi không thể tải được khóa học */
export default function CourseErrorScreen({ errorMessage, onBackHome }: CourseErrorScreenProps) {
  return (
    <div className="min-h-screen bg-[#F7F8FB] flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl border border-[#ECEAF0] text-center max-w-md shadow-sm space-y-4">
        <div className="w-12 h-12 bg-[#FDE8E8] text-[#E5484D] rounded-full flex items-center justify-center mx-auto text-lg font-bold">!</div>
        <div>
          <h3 className="font-display text-lg font-bold text-[#161826]">Không thể truy cập</h3>
          <p className="text-sm text-[#565A70] mt-1.5 leading-relaxed">{errorMessage || 'Khóa học không tồn tại.'}</p>
        </div>
        <button onClick={onBackHome} className="w-full py-3 bg-[#5B5FEF] text-white rounded-full text-sm font-bold transition-transform hover:scale-[1.02]">
          Quay về trang chủ
        </button>
      </div>
    </div>
  );
}
