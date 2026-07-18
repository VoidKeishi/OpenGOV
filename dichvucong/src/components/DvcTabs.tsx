"use client";

import { useState } from "react";
import ProcedureList from "@/components/ProcedureList";
import PaginationBar from "@/components/PaginationBar";
import type { ThuTucIndexItem } from "@/lib/types";

const PAGE_SIZE = 20;

export default function DvcTabs({
  congDan,
  doanhNghiep,
}: {
  congDan: ThuTucIndexItem[];
  doanhNghiep: ThuTucIndexItem[];
}) {
  const [tab, setTab] = useState<"cong-dan" | "doanh-nghiep">("cong-dan");
  const items = tab === "cong-dan" ? congDan : doanhNghiep;

  return (
    <div>
      <div className="flex border-b border-line" role="tablist">
        {(
          [
            ["cong-dan", "Công Dân"],
            ["doanh-nghiep", "Doanh nghiệp"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-6 py-3 text-[17px] font-semibold ${
              tab === key
                ? "border-brand text-brand"
                : "border-transparent text-ink hover:text-brand"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <ProcedureList items={items.slice(0, PAGE_SIZE)} />
      <PaginationBar pageSize={PAGE_SIZE} total={items.length} />
    </div>
  );
}
