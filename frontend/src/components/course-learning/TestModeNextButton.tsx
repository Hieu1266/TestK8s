'use client';

interface TestModeNextButtonProps {
  onNext: () => void;
  onPrev?: () => void;
  disabled?: boolean;
  disabledPrev?: boolean;
  isLast?: boolean;
  hideNext?: boolean;
}

export default function TestModeNextButton({
  onNext,
  onPrev,
  disabled,
  disabledPrev,
  isLast = false,
  hideNext = false,
}: TestModeNextButtonProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-yellow-300 bg-yellow-50 px-3 py-2 shadow-lg">
      <span className="text-xs font-semibold text-yellow-800">Chuyển bài</span>

      {onPrev && (
        <button
          onClick={onPrev}
          disabled={disabledPrev}
          className="rounded-full bg-yellow-200 px-3 py-1 text-xs font-medium text-yellow-900 hover:bg-yellow-300 disabled:opacity-40"
        >
          ← Prev
        </button>
      )}

      {!hideNext && (
        <button
          onClick={onNext}
          disabled={disabled}
          className={`rounded-full px-3 py-1 text-xs font-medium text-yellow-950 disabled:opacity-40 transition-colors ${
            isLast ? 'bg-green-400 hover:bg-green-500' : 'bg-yellow-400 hover:bg-yellow-500'
          }`}
        >
          {isLast ? 'Hoàn thành ✓' : 'Next →'}
        </button>
      )}
    </div>
  );
}