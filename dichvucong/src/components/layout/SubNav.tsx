import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { SUBNAV_ITEMS } from "./nav-data";

// Sub-nav thanh cam trên các trang trong (CLONE_SPEC.md mục 2.2).
export default function SubNav({ active }: { active: string }) {
  return (
    <nav className="hidden bg-brand md:block">
      <div className="mx-auto flex max-w-[1168px] items-stretch px-4">
        {SUBNAV_ITEMS.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex h-11 items-center gap-1.5 px-4 text-[15px] font-semibold text-white hover:bg-[#bc5d37] ${
              item.label === active ? "bg-[#bc5d37]" : ""
            }`}
          >
            {item.label}
            {item.caret && <ChevronDown className="h-4 w-4" />}
          </Link>
        ))}
      </div>
    </nav>
  );
}
