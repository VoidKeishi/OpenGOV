import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import Breadcrumb from "@/components/layout/Breadcrumb";
import SubNav from "@/components/layout/SubNav";
import InfoGrid from "@/components/detail/InfoGrid";
import Section, { SectionText } from "@/components/detail/Section";
import DataTable from "@/components/detail/DataTable";
import HoSoGroups from "@/components/detail/HoSoGroups";
import CoQuanPanel from "@/components/detail/CoQuanPanel";
import RelatedPanel from "@/components/detail/RelatedPanel";
import { getThuTuc, PILOT_SLUGS, THU_TUC_INDEX } from "@/lib/data";

export const dynamicParams = false;

export function generateStaticParams() {
  return PILOT_SLUGS.map((slug) => ({ slug }));
}

export const metadata: Metadata = {
  title: "Chi tiết thủ tục - Cổng Dịch vụ công Quốc gia (Demo)",
};

export default async function ChiTietThuTucPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tt = getThuTuc(slug);
  if (!tt) notFound();

  const related = PILOT_SLUGS.filter((s) => s !== slug).map((s) => {
    const other = getThuTuc(s)!;
    return {
      slug: s,
      ten: other.ten,
      coQuan:
        other.coQuanThucHien !== "Không có thông tin" && other.coQuanThucHien
          ? other.coQuanThucHien
          : "UBND cấp xã",
      toanTrinh: THU_TUC_INDEX.find((t) => t.slug === s)?.toanTrinh,
    };
  });

  return (
    <>
      <SubNav active="Thủ tục hành chính" />
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Thủ tục hành chính", href: "/tim-kiem" },
          { label: "Chi tiết thủ tục" },
        ]}
      />
      <div className="mx-auto max-w-[1168px] px-4 pb-10">
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-12">
          <div className="order-last min-w-0 lg:order-none lg:col-span-8">
            <h1 className="text-lg font-semibold break-words lg:text-2xl">{tt.ten}</h1>
            <div className="mt-3">
              <a href="#" aria-label="Tải bản PDF (demo)">
                <FileText className="h-9 w-9 text-red-500" strokeWidth={1.5} />
              </a>
            </div>
            <div className="my-4 border-t border-gray-300" />

            <InfoGrid info={tt.info} />

            <Section title="Thủ tục hành chính liên quan">
              <SectionText text={tt.lienQuan} />
            </Section>

            <Section title="Trình Tự Thực Hiện">
              <ul>
                {tt.trinhTu.map((item, i) => (
                  <li key={i} className="mb-4">
                    {item.title && (
                      <p className="mb-2 text-base font-semibold lg:text-lg">
                        {item.title}
                      </p>
                    )}
                    <p className="ml-4 whitespace-pre-wrap text-base lg:ml-5">
                      {item.body}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Cách Thức Thực Hiện">
              <DataTable
                columns={tt.cachThuc.columns}
                rows={tt.cachThuc.rows}
                widths={["25%", "25%", "25%", "25%"]}
              />
            </Section>

            <Section title="Thành phần hồ sơ">
              <HoSoGroups groups={tt.thanhPhanHoSo} />
            </Section>

            <Section title="Căn cứ pháp lý">
              <DataTable
                columns={tt.canCuPhapLy.columns}
                rows={tt.canCuPhapLy.rows}
                widths={
                  tt.canCuPhapLy.columns[0] === "Số ký hiệu"
                    ? ["22%", "78%"]
                    : ["78%", "22%"]
                }
              />
            </Section>

            <Section title="Cơ quan thực hiện">
              <SectionText text={tt.coQuanThucHien} />
            </Section>

            <Section title="Yêu cầu, điều kiện thực hiện">
              <SectionText text={tt.yeuCau} />
            </Section>

            <Section title="Kết quả xử lý">
              <div className="space-y-2">
                {tt.ketQua.map((kq, i) => (
                  <div key={i} className="rounded-r bg-gray-50 py-1.5 pl-3">
                    <div className="font-medium break-words">{kq.ten}</div>
                    {kq.ma && (
                      <div className="mt-1 text-sm text-muted">Mã: {kq.ma}</div>
                    )}
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Từ khóa">
              <SectionText text={tt.tuKhoa} />
            </Section>

            <Section title="Mô tả">
              <SectionText text={tt.moTa} />
            </Section>
          </div>

          <aside className="lg:col-span-4">
            <CoQuanPanel slug={slug} />
            <RelatedPanel items={related} />
          </aside>
        </div>
      </div>
    </>
  );
}
