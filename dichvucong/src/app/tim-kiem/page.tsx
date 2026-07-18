import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import { ListSearchBar } from "@/components/SearchBar";
import ProcedureList from "@/components/ProcedureList";
import PaginationBar from "@/components/PaginationBar";
import { THU_TUC_INDEX } from "@/lib/data";
import { matches } from "@/lib/search";

export const metadata: Metadata = {
  title: "Kết quả thủ tục - Cổng Dịch vụ công Quốc gia (Demo)",
};

const PAGE_SIZE = 10;

export default async function TimKiemPage({
  searchParams,
}: {
  searchParams: Promise<{ keyword?: string }>;
}) {
  const { keyword = "" } = await searchParams;
  const kw = keyword.trim();
  const results = kw
    ? THU_TUC_INDEX.filter((t) => matches(t.ten, kw))
    : THU_TUC_INDEX;

  return (
    <>
      <Breadcrumb
        items={[{ label: "Trang chủ", href: "/" }, { label: "Dành cho công dân" }]}
      />
      <div className="mx-auto max-w-[1168px] px-4 pb-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
          <div className="min-w-0 flex-1">
            <ListSearchBar
              defaultKeyword={keyword}
              placeholder="Nhập từ khoá tìm kiếm thủ tục hành chính"
            />
          </div>
          <Link
            href="/dich-vu-cong-truc-tuyen"
            className="flex shrink-0 items-center justify-center rounded bg-accent px-5 py-2.5 font-semibold text-ink hover:brightness-95"
          >
            Dịch vụ công trực tuyến
          </Link>
        </div>

        <h1 className="mt-6 text-xl font-bold md:text-2xl">
          {kw ? (
            <>
              Có {results.length} kết quả cho từ khóa &ldquo;{kw}&rdquo;
            </>
          ) : (
            <>Có {results.length} thủ tục hành chính</>
          )}
        </h1>

        <ProcedureList items={results.slice(0, PAGE_SIZE)} />
        <PaginationBar pageSize={PAGE_SIZE} total={results.length} />
      </div>
    </>
  );
}
