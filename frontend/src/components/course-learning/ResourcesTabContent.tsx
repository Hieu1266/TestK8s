import { LessonResourceItem } from '@/types/lessons';

type ResourcesTabContentProps = {
  loading: boolean;
  resources: LessonResourceItem[];
  courseBackendUrl?: string;
};

/** Nội dung tab "Tài liệu": danh sách tài liệu đính kèm có thể tải về */
export default function ResourcesTabContent({ loading, resources, courseBackendUrl }: ResourcesTabContentProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-[#8A8FA3] py-12">
        <div className="w-5 h-5 rounded-full border-2 border-[#E7E9F0] border-t-[#5B5FEF] animate-spin" />
        Đang tải danh sách tài liệu...
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <p className="text-sm text-[#8A8FA3] font-semibold py-12 text-center bg-white border border-[#ECEAF0] rounded-2xl">
        Bài học này chưa có tài liệu đính kèm.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {resources.map((item) => {
        const downloadUrl = `${courseBackendUrl}/lesson-resources/download/${item.resource_id}`;

        return (
          <div
            key={item.resource_id}
            className="bg-white border border-[#ECEAF0] rounded-2xl p-5 flex items-center justify-between shadow-sm hover:border-[#D0D4F7] transition-all"
          >
            <div className="flex items-center gap-4 min-w-0 pr-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EEF0FE] text-[#5B5FEF] flex items-center justify-center font-bold text-xs uppercase shrink-0">
                {item.file_extension || 'TỆP'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#161826] truncate" title={item.file_name}>
                  {item.file_name}
                </p>
                <span className="text-xs text-[#8A8FA3] font-semibold uppercase mt-0.5 block">
                  Định dạng: .{item.file_extension}
                </span>
              </div>
            </div>

            <a
              href={downloadUrl}
              download={item.file_name}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-2 bg-[#F7F8FB] hover:bg-[#EEF0FE] text-[#5B5FEF] border border-[#ECEAF0] text-xs font-bold px-5 py-2.5 rounded-full transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Tải về
            </a>
          </div>
        );
      })}
    </div>
  );
}
