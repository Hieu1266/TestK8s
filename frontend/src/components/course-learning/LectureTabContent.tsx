import { InVideoQuizWrapper } from "@/components/InVideoQuizWrapper";
import { VideoProgress } from "@/types/video";
import { LessonStatus } from "@/types/statuses";
import { LessonWithStatus } from "./types";
import QuickNoteBox from "./QuickNoteBox";
import CompleteLessonButton from "./CompleteLessonButton";
//import LessonSlideViewer from "@/components/LessonSlideViewer";
import PresentationViewer from "@/components/PresentationViewer";
import AnnotatedContent from "@/components/AnnotatedContent";

type LectureTabContentProps = {
  courseId: string;
  currentLesson?: LessonWithStatus;
  isFocusMode: boolean;
  onFocusModeChange: (isFocused: boolean) => void;
  hasVideo: boolean;
  videoProgress: VideoProgress | null;
  videoProgressLoading: boolean;
  onProgressUpdate: (progress: VideoProgress) => void;
  onTimeUpdate: (seconds: number) => void;
  onVideoEnded: () => void;

  quickNoteOpen: boolean;
  quickNoteContent: string;
  quickNoteSaving: boolean;
  videoCurrentTime: number;
  onQuickNoteOpen: () => void;
  onQuickNoteContentChange: (value: string) => void;
  onQuickNoteSave: () => void;
  onQuickNoteCancel: () => void;

  completing: boolean;
  onCompleteAndNext: () => void;

  hasPreviousLesson: boolean;
  hasNextLesson: boolean;
  onPreviousLesson: () => void;
  onNextLesson: () => void;
  hasViewedAllSlides: boolean;
  onSlideProgressChange: (hasViewedAllSlides: boolean) => void;
};

/** Nội dung tab "Bài giảng": video (hoặc nội dung bài đọc) + ghi chú nhanh + nút hoàn thành */
export default function LectureTabContent({
  courseId,
  currentLesson,
  isFocusMode,
  onFocusModeChange,
  hasVideo,
  videoProgress,
  videoProgressLoading,
  onProgressUpdate,
  onTimeUpdate,
  onVideoEnded,
  quickNoteOpen,
  quickNoteContent,
  quickNoteSaving,
  videoCurrentTime,
  onQuickNoteOpen,
  onQuickNoteContentChange,
  onQuickNoteSave,
  onQuickNoteCancel,
  completing,
  onCompleteAndNext,
  hasPreviousLesson,
  hasNextLesson,
  onPreviousLesson,
  onNextLesson,
  hasViewedAllSlides,
  onSlideProgressChange,
}: LectureTabContentProps) {
  if (!currentLesson) {
    return (
      <div className="w-full aspect-video rounded-3xl flex flex-col items-center justify-center bg-[#12141C] text-white">
        <p className="text-sm font-bold text-white/85">
          Vui lòng chọn một bài học ở danh sách bên trái
        </p>
      </div>
    );
  }

  const hasContentBody =
    !!currentLesson.content_body && currentLesson.content_body.trim() !== "";

  return (
    <>
      {hasVideo ? (
        videoProgressLoading || !videoProgress ? (
          <div className="w-full aspect-video rounded-3xl bg-[#12141C] flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-white/70 font-semibold">
              <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
              Đang tải tiến độ video...
            </div>
          </div>
        ) : (
          <>
            <InVideoQuizWrapper
              key={currentLesson.lesson_id}
              lessonId={currentLesson.lesson_id}
              videoData={{
                url: currentLesson.video_url as string,
                progressId: videoProgress.video_progress_id,
                initialProgress: videoProgress,
              }}
              onProgressUpdate={onProgressUpdate}
              onTimeUpdate={onTimeUpdate}
              onVideoEnded={onVideoEnded}
              // Lưu ý: Nếu bạn có tính năng Seek (tua video khi bấm vào ghi chú cũ),
              // bạn cần truyền thêm 2 props này và khai báo chúng bên trong InVideoQuizWrapperProps
              // seekToSeconds={seekTarget}
              // onSeeked={() => setSeekTarget(null)}
            />

            <QuickNoteBox
              open={quickNoteOpen}
              content={quickNoteContent}
              saving={quickNoteSaving}
              currentTimeSeconds={videoCurrentTime}
              onOpen={onQuickNoteOpen}
              onContentChange={onQuickNoteContentChange}
              onSave={onQuickNoteSave}
              onCancel={onQuickNoteCancel}
            />
          </>
        )
      ) : null}

      {currentLesson.is_slide_presentation ? (
        <PresentationViewer
          key={currentLesson.lesson_id}
          courseId={courseId}
          lessonId={currentLesson.lesson_id}
          lessonTitle={currentLesson.title}
          isFocusMode={isFocusMode}
          onFocusModeChange={onFocusModeChange}
          onSlideProgressChange={onSlideProgressChange}
        />
      ) : hasContentBody ? (
        <div className="space-y-4 rounded-3xl border border-[#ECEAF0] bg-white p-8 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#5B5FEF]">
            <span>📖 Nội dung bài học</span>
          </div>

          <AnnotatedContent
            contentType="LESSON_CONTENT"
            contentId={currentLesson.lesson_id}
            html={currentLesson.content_body as string}
            className="prose prose-base max-w-none font-normal leading-relaxed text-[#2B2D3D]"
          />
        </div>
      ) : (
        !hasVideo && (
          <div className="rounded-3xl border border-[#ECEAF0] bg-white p-8 text-center text-sm text-[#8A8FA3]">
            Bài học này hiện chưa có nội dung chi tiết.
          </div>
        )
      )}

      {/* NÚT HOÀN THÀNH BÀI ĐỌC: Chỉ hiển thị khi KHÔNG có video VÀ had_quiz == false */}
      {!hasVideo &&
        !isFocusMode &&
        !currentLesson.had_quiz &&
        (!currentLesson.is_slide_presentation ||
          hasViewedAllSlides ||
          currentLesson.status === LessonStatus.COMPLETED) && (
          <CompleteLessonButton
            completing={completing}
            isOptional={currentLesson.is_optional}
            status={currentLesson.status}
            onClick={onCompleteAndNext}
          />
        )}

      {!isFocusMode &&
        currentLesson.is_slide_presentation &&
        !hasViewedAllSlides &&
        currentLesson.status !== LessonStatus.COMPLETED && (
          <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-center text-sm font-medium text-blue-700">
            Hãy xem tất cả slide để mở nút chuyển sang bài tiếp theo.
          </p>
        )}
    </>
  );
}
