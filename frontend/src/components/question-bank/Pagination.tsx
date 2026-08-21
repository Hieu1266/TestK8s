"use client";

interface Props {
  currentPage: number;

  totalPages: number;

  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,

  totalPages,

  onPageChange,
}: Props) {
  return (
    <div className="flex justify-center items-center gap-3 py-8">
      <button
        disabled={currentPage == 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="px-4 py-2 rounded-xl border bg-white disabled:opacity-40"
      >
        ←
      </button>

      <span className="font-bold">
        Trang {currentPage} / {totalPages}
      </span>

      <button
        disabled={currentPage == totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="px-4 py-2 rounded-xl border bg-white disabled:opacity-40"
      >
        →
      </button>
    </div>
  );
}
