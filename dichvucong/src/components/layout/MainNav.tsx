"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, House } from "lucide-react";
import { NAV_ITEMS } from "./nav-data";

export default function MainNav() {
  const pathname = usePathname();
  // Trang trong: mục "Thông tin và dịch vụ" active (đối chiếu dvc-truc-tuyen.desktop.png)
  const infoActive = pathname !== "/";

  return (
    <nav className="hidden bg-surface md:block">
      <div className="mx-auto flex max-w-[1168px] items-stretch px-4">
        <Link
          href="/"
          aria-label="Trang chủ"
          className="flex w-14 items-center justify-center bg-brand text-white"
        >
          <House className="h-5 w-5" />
        </Link>
        {NAV_ITEMS.map((item) =>
          item.children ? (
            <div key={item.label} className="group relative">
              <button
                type="button"
                className={`flex h-12 items-center gap-1.5 px-5 text-[15px] font-semibold ${
                  item.label === "Thông tin và dịch vụ" && infoActive
                    ? "bg-brand text-white"
                    : "text-ink group-hover:text-brand"
                }`}
              >
                {item.label}
                <ChevronDown className="h-4 w-4" />
              </button>
              <div className="invisible absolute left-0 top-full z-20 min-w-60 border border-line bg-white shadow-md group-focus-within:visible group-hover:visible">
                {item.children.map((c) => (
                  <Link
                    key={c.label}
                    href={c.href}
                    className="block px-4 py-2.5 text-[15px] hover:bg-surface hover:text-brand"
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <Link
              key={item.label}
              href={item.href ?? "#"}
              className="flex h-12 items-center px-5 text-[15px] font-semibold text-ink hover:text-brand"
            >
              {item.label}
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}
