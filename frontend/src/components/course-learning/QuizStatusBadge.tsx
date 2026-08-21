type QuizStatusBadgeProps = {
  submitStatus?: string | null;
};

/** Badge nhỏ hiển thị trạng thái nộp bài quiz (dùng trong sidebar) */
export default function QuizStatusBadge({ submitStatus }: QuizStatusBadgeProps) {
  switch (submitStatus) {
    case 'GRADED':
      return (
        <span
          className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: '#E6F4EA', color: '#137333', border: '1px solid #CEEAD6' }}
          title="Đã chấm điểm"
        >
          ĐÃ CHẤM
        </span>
      );
    case 'SUBMITTED':
      return (
        <span
          className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: '#FEF7E0', color: '#B06000', border: '1px solid #FDE293' }}
          title="Đã nộp bài, đang chờ chấm điểm"
        >
          ĐÃ NỘP BÀI
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span
          className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: '#E8F0FE', color: '#1A73E8', border: '1px solid #AECBFA' }}
          title="Đang làm bài"
        >
          ĐANG LÀM
        </span>
      );
    default:
      return (
        <span
          className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: '#FDF3DA', color: '#9A6B00' }}
        >
          KIỂM TRA
        </span>
      );
  }
}
