import { formatSeconds } from './helpers';

type QuickNoteBoxProps = {
  open: boolean;
  content: string;
  saving: boolean;
  currentTimeSeconds: number;
  onOpen: () => void;
  onContentChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

/** Ô "Thêm ghi chú nhanh" hiển thị bên dưới video, gắn theo mốc thời gian hiện tại */
export default function QuickNoteBox({
  open,
  content,
  saving,
  currentTimeSeconds,
  onOpen,
  onContentChange,
  onSave,
  onCancel,
}: QuickNoteBoxProps) {
  return (
    <div className="bg-white border border-[#ECEAF0] rounded-2xl p-4 shadow-sm mt-4">
      {!open ? (
        <button
          onClick={onOpen}
          className="text-sm font-bold text-[#5B5FEF] hover:text-[#4B4FEF] flex items-center gap-2 cursor-pointer"
        >
          📝 Thêm ghi chú nhanh tại mốc {formatSeconds(currentTimeSeconds)}
        </button>
      ) : (
        <div className="flex gap-2">
          <input
            autoFocus
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="Nhập nội dung ghi chú..."
            className="flex-1 text-sm bg-[#F7F8FB] border border-[#E7E9F0] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#5B5FEF]"
            onKeyDown={(e) => e.key === 'Enter' && onSave()}
          />
          <button
            onClick={onSave}
            disabled={saving || !content.trim()}
            className="text-white text-xs font-bold px-5 rounded-xl bg-[#5B5FEF] disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Lưu...' : 'Lưu'}
          </button>
          <button
            onClick={onCancel}
            className="text-xs font-bold px-3 text-[#565A70] cursor-pointer"
          >
            Hủy
          </button>
        </div>
      )}
    </div>
  );
}
