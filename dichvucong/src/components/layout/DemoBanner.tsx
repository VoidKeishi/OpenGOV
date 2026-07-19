"use client";

// Deviation chủ ý (CLONE_SPEC.md mục 6.1): banner nhận diện môi trường demo,
// kèm toggle "Phase 2 preview" (mục 6.6) bật markup trợ lý trên trang tờ khai.
import { setPhase2, usePhase2 } from "@/lib/phase2";

export default function DemoBanner() {
  const phase2 = usePhase2();
  return (
    <div className="bg-accent px-4 py-2 text-center text-sm font-bold text-ink">
      MÔI TRƯỜNG DEMO — Không phải Cổng Dịch vụ công quốc gia. Dữ liệu chỉ dùng
      minh hoạ.
      <label className="ml-3 inline-flex cursor-pointer items-center gap-1.5 align-middle font-normal">
        <input
          type="checkbox"
          checked={phase2}
          onChange={(e) => setPhase2(e.target.checked)}
          className="h-3.5 w-3.5 accent-brand"
        />
        Phase 2 preview
      </label>
    </div>
  );
}
