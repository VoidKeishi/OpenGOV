import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type RelatedItem = { slug: string; ten: string; coQuan: string };

export default function RelatedPanel({ items }: { items: RelatedItem[] }) {
  if (!items.length) return null;
  return (
    <div className="overflow-hidden rounded-xs border border-line">
      <div className="bg-ink/10 px-3 py-2 font-medium lg:text-lg">
        Thủ tục hành chính khác
      </div>
      <ul className="divide-y divide-line px-3">
        {items.map((item) => (
          <li key={item.slug} className="py-3">
            <Link
              href={`/thu-tuc/${item.slug}`}
              className="flex items-start gap-2 font-medium leading-snug hover:text-brand"
            >
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <span>
                {item.ten}
                <span className="mt-1 block text-sm font-normal text-muted">
                  {item.coQuan}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
