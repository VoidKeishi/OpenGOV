import Link from "next/link";
import { FileText } from "lucide-react";
import type { ThuTucIndexItem } from "@/lib/types";

// Chip "Toàn trình" — DVC trực tuyến toàn trình (CLONE_SPEC.md 3.2)
export function ToanTrinhChip() {
  return (
    <span className="ml-2 inline-block whitespace-nowrap rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white">
      Toàn trình
    </span>
  );
}

export default function ProcedureList({ items }: { items: ThuTucIndexItem[] }) {
  return (
    <ul className="mt-2">
      {items.map((item) => (
        <li key={item.ten} className="flex items-start gap-3 py-3">
          <FileText
            className={`mt-0.5 h-5 w-5 shrink-0 ${
              item.coChiTiet ? "text-brand" : "text-muted/60"
            }`}
          />
          {item.coChiTiet && item.slug ? (
            <span className="min-w-0 font-medium leading-snug">
              <Link href={`/thu-tuc/${item.slug}`} className="hover:text-brand">
                {item.ten}
              </Link>
              {item.toanTrinh && <ToanTrinhChip />}
            </span>
          ) : (
            // Entry "vỏ" — chưa có trang chi tiết: không render như link (CLONE_SPEC.md 3.2b)
            <span className="min-w-0 font-medium leading-snug text-muted">
              {item.ten}
              <span className="ml-2 inline-block whitespace-nowrap rounded-full border border-line bg-surface px-2 py-0.5 text-xs font-medium text-muted">
                Đang cập nhật
              </span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
