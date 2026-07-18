"use client";

import { useState } from "react";
import Link from "next/link";
import coQuan from "@/data/co-quan.json";

// Sidebar "Chọn cơ quan thực hiện" — bố cục theo detail-khai-sinh.desktop.png;
// CTA "Nộp trực tuyến" theo CLONE_SPEC.md 3.4 (deviation: không đòi VNeID).
export default function CoQuanPanel({ slug }: { slug: string }) {
  const [tinh, setTinh] = useState("");
  const wards = coQuan.find((t) => t.ten === tinh)?.phuongXa ?? [];

  return (
    <div className="mb-4 overflow-hidden rounded-xs border border-line">
      <div className="bg-ink/10 px-3 py-2 font-medium lg:text-lg">
        Chọn cơ quan thực hiện
      </div>
      <div className="space-y-3 px-3 py-4">
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="loai_co_quan"
              value="tinh"
              defaultChecked
              className="accent-brand"
            />
            Tỉnh/ Thành phố
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="loai_co_quan" value="bo" className="accent-brand" />
            Bộ ngành
          </label>
        </div>
        <select
          aria-label="Chọn Tỉnh/ Thành phố"
          value={tinh}
          onChange={(e) => setTinh(e.target.value)}
          className="w-full rounded border border-line bg-white px-2.5 py-2 text-[15px] text-muted"
        >
          <option value="">-- Chọn Tỉnh/ Thành phố --</option>
          {coQuan.map((t) => (
            <option key={t.ten} value={t.ten}>
              {t.ten}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="cap_co_quan"
              value="phuong-xa"
              defaultChecked
              className="accent-brand"
            />
            Phường/ Xã
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="cap_co_quan" value="so" className="accent-brand" />
            Sở
          </label>
        </div>
        <select
          aria-label="Chọn Phường/ Xã"
          className="w-full rounded border border-line bg-white px-2.5 py-2 text-[15px] text-muted"
          defaultValue=""
        >
          <option value="">-- Chọn Phường/ Xã --</option>
          {wards.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
        <p className="text-sm text-[#d13438]">
          Hệ thống chỉ hiển thị những cơ quan đã áp dụng dịch vụ công trực tuyến
        </p>
        <Link
          href={`/nop-truc-tuyen/${slug}`}
          className="block w-full rounded bg-brand py-2.5 text-center font-semibold text-white hover:bg-brand-dark"
        >
          Nộp trực tuyến
        </Link>
      </div>
    </div>
  );
}
