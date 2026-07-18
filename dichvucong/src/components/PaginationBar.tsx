import { ChevronLeft, ChevronRight } from "lucide-react";

// Thanh phân trang trình bày (demo 1 trang — CLONE_SPEC.md 3.2): Trước disabled, Sau không đổi trang.
export default function PaginationBar({
  pageSize,
  total,
}: {
  pageSize: number;
  total: number;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-[15px]">
      <div className="flex items-center gap-2">
        <label htmlFor="page-size">Hiển thị</label>
        <select
          id="page-size"
          name="page_size"
          defaultValue={String(pageSize)}
          className="rounded border border-line bg-white px-2 py-1.5"
        >
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
        </select>
        <span>trên {total} văn bản</span>
      </div>
      <div className="flex items-center gap-3">
        <span>Trang</span>
        <span className="flex items-center overflow-hidden rounded border border-line">
          <button
            type="button"
            disabled
            className="flex items-center gap-1 border-r border-line px-3 py-1.5 text-muted/60"
          >
            <ChevronLeft className="h-4 w-4" />
            Trước
          </button>
          <button
            type="button"
            className="flex items-center gap-1 px-3 py-1.5 font-semibold text-brand"
          >
            Sau
            <ChevronRight className="h-4 w-4" />
          </button>
        </span>
      </div>
    </div>
  );
}
