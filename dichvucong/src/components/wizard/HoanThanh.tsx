"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleCheck } from "lucide-react";

type Submission = {
  maHoSo: string;
  thoiGian: string;
  coQuan: string;
  tenThuTuc: string;
  slug: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

function formatThoiGian(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ngày ${pad(d.getDate())}/${pad(
    d.getMonth() + 1,
  )}/${d.getFullYear()}`;
}

export default function HoanThanh({ slug }: { slug: string }) {
  // undefined = đang đọc sessionStorage (sau mount, tránh lệch hydration)
  const [sub, setSub] = useState<Submission | null | undefined>(undefined);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`dvc-submission-${slug}`);
      setSub(raw ? (JSON.parse(raw) as Submission) : null);
    } catch {
      setSub(null);
    }
  }, [slug]);

  if (sub === undefined) {
    return <div className="py-24 text-center text-muted">Đang tải…</div>;
  }

  if (sub === null) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg">Không tìm thấy thông tin hồ sơ vừa nộp.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href={`/nop-truc-tuyen/${slug}`}
            className="rounded bg-brand px-6 py-2.5 font-semibold text-white hover:bg-brand-dark"
          >
            Nộp hồ sơ
          </Link>
          <Link
            href="/"
            className="rounded border border-brand px-6 py-2.5 font-semibold text-brand hover:bg-brand hover:text-white"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl py-10 text-center">
      <CircleCheck className="mx-auto h-16 w-16 text-green-600" strokeWidth={1.5} />
      <h1 className="mt-4 text-2xl font-bold">Nộp hồ sơ thành công</h1>
      <div className="mt-6 rounded border border-line text-left">
        <dl className="divide-y divide-line text-[15px]">
          <div className="flex flex-wrap justify-between gap-2 px-4 py-3">
            <dt className="text-muted">Mã hồ sơ</dt>
            <dd className="text-lg font-bold text-brand-dark">{sub.maHoSo}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2 px-4 py-3">
            <dt className="text-muted">Thời gian nộp</dt>
            <dd className="font-medium">{formatThoiGian(sub.thoiGian)}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2 px-4 py-3">
            <dt className="text-muted">Cơ quan tiếp nhận</dt>
            <dd className="max-w-[60%] text-right font-medium">{sub.coQuan}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2 px-4 py-3">
            <dt className="text-muted">Thủ tục</dt>
            <dd className="max-w-[60%] text-right font-medium">{sub.tenThuTuc}</dd>
          </div>
        </dl>
      </div>
      <p className="mt-5 text-[15px] text-muted">
        Hồ sơ của bạn đã được chuyển đến cơ quan có thẩm quyền xử lý. Kết quả sẽ
        được thông báo qua Cổng.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded border border-brand px-6 py-2.5 font-semibold text-brand hover:bg-brand hover:text-white"
        >
          Về trang chủ
        </Link>
        <Link
          href="/dich-vu-cong-truc-tuyen"
          className="rounded bg-brand px-6 py-2.5 font-semibold text-white hover:bg-brand-dark"
        >
          Nộp hồ sơ khác
        </Link>
      </div>
    </div>
  );
}
