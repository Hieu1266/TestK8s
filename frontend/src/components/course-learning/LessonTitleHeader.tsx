type LessonTitleHeaderProps = {
  subjectTitle?: string;
  subjectAccentColor: string;
  isOptional?: boolean;
  lessonTitle?: string;
};

/** Khối tiêu đề bài học: badge môn học + nhãn tùy chọn + tên bài học */
export default function LessonTitleHeader({
  subjectTitle,
  subjectAccentColor,
  isOptional,
  lessonTitle,
}: LessonTitleHeaderProps) {
  return (
    <div className="space-y-2 pb-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg"
          style={{
            color: subjectAccentColor,
            backgroundColor: `${subjectAccentColor}1A`,
          }}
        >
          {subjectTitle ?? 'Bài học'}
        </span>

        {isOptional && (
          <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 border border-gray-200">
            Tùy chọn (Không bắt buộc)
          </span>
        )}
      </div>

      <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#161826] leading-snug">
        {lessonTitle ? lessonTitle : 'Vui lòng chọn một bài học bên danh sách'}
      </h1>
    </div>
  );
}
