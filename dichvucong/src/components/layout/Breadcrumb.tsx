import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type Crumb = { label: string; href?: string };

// Desktop: "Trang chủ › … › trang hiện tại". Mobile: hàng "‹ <trang hiện tại>"
// (đối chiếu detail-khai-sinh.mobile.png).
export default function Breadcrumb({ items }: { items: Crumb[] }) {
  const last = items[items.length - 1];
  const back = items.length > 1 ? items[items.length - 2] : undefined;

  return (
    <div className="mx-auto max-w-[1168px] px-4">
      <nav aria-label="Breadcrumb" className="hidden items-center gap-2 py-4 text-[15px] md:flex">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="h-4 w-4 text-muted" />}
              {isLast ? (
                <span className="font-semibold">{item.label}</span>
              ) : (
                <Link href={item.href ?? "#"} className="text-muted hover:text-brand">
                  {item.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
      <div className="py-3 md:hidden">
        <Link
          href={back?.href ?? "/"}
          className="flex items-center gap-1.5 font-medium"
        >
          <ChevronLeft className="h-5 w-5" />
          {last?.label}
        </Link>
      </div>
    </div>
  );
}
