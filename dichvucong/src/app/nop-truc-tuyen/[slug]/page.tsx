import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/layout/Breadcrumb";
import SubNav from "@/components/layout/SubNav";
import Wizard, { type GiayTo } from "@/components/wizard/Wizard";
import { getFormSchema, getThuTuc, PILOT_SLUGS } from "@/lib/data";
import type { ThuTuc } from "@/lib/types";

export const dynamicParams = false;

export function generateStaticParams() {
  return PILOT_SLUGS.map((slug) => ({ slug }));
}

export const metadata: Metadata = {
  title: "Nộp hồ sơ trực tuyến - Cổng Dịch vụ công Quốc gia (Demo)",
};

// Bước 3 chỉ lấy nhóm giấy tờ đúng trường hợp demo của từng thủ tục
// (hồ sơ thật có nhiều nhóm theo trường hợp — CLONE_SPEC.md 3.5.3).
function giayToChoForm(tt: ThuTuc): GiayTo[] {
  let groups = tt.thanhPhanHoSo;
  if (tt.slug === "dang-ky-khai-sinh") {
    groups = groups.filter(
      (g) => g.nhom.startsWith("*") && !g.nhom.startsWith("* Lưu ý"),
    );
  } else if (tt.slug === "dang-ky-thuong-tru") {
    groups = groups.filter((g) =>
      g.nhom.includes("thuộc quyền sở hữu của mình"),
    );
    groups = groups.slice(0, 1);
  } else if (tt.slug === "cap-gpxd-nha-o-rieng-le") {
    groups = groups.filter((g) => g.nhom.includes("nhà ở riêng lẻ"));
  }
  return groups.flatMap((g) =>
    g.rows.map((r) => ({ ten: r.tenGiayTo, soLuong: r.soLuong })),
  );
}

export default async function NopTrucTuyenPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tt = getThuTuc(slug);
  const schema = getFormSchema(slug);
  if (!tt || !schema) notFound();

  return (
    <>
      <SubNav active="Dịch vụ công trực tuyến" />
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Chi tiết thủ tục", href: `/thu-tuc/${slug}` },
          { label: "Nộp hồ sơ trực tuyến" },
        ]}
      />
      <div className="mx-auto max-w-[1168px] px-4 pb-10">
        <h1 className="mb-1 text-xl font-semibold lg:text-2xl">
          Nộp hồ sơ trực tuyến
        </h1>
        <p className="mb-6 text-[15px] text-muted">{tt.ten}</p>
        <Wizard
          slug={slug}
          tenThuTuc={tt.ten}
          schema={schema}
          giayTo={giayToChoForm(tt)}
        />
      </div>
    </>
  );
}
