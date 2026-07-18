import Link from "next/link";
import { FileText } from "lucide-react";
import type { ThuTucIndexItem } from "@/lib/types";

export default function ProcedureList({ items }: { items: ThuTucIndexItem[] }) {
  return (
    <ul className="mt-2">
      {items.map((item) => (
        <li key={item.ten} className="flex items-start gap-3 py-3">
          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
          {item.coChiTiet && item.slug ? (
            <Link
              href={`/thu-tuc/${item.slug}`}
              className="font-medium leading-snug hover:text-brand"
            >
              {item.ten}
            </Link>
          ) : (
            <a href="#" className="font-medium leading-snug hover:text-brand">
              {item.ten}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
