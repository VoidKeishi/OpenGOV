import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/layout/Breadcrumb";
import SubNav from "@/components/layout/SubNav";
import HoanThanh from "@/components/wizard/HoanThanh";
import { getThuTuc, PILOT_SLUGS } from "@/lib/data";

export const dynamicParams = false;

export function generateStaticParams() {
  return PILOT_SLUGS.map((slug) => ({ slug }));
}

export const metadata: Metadata = {
  title: "Nộp hồ sơ thành công - Cổng Dịch vụ công Quốc gia (Demo)",
};

export default async function HoanThanhPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!getThuTuc(slug)) notFound();

  return (
    <>
      <SubNav active="Dịch vụ công trực tuyến" />
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Nộp hồ sơ trực tuyến" },
          { label: "Xác nhận" },
        ]}
      />
      <div className="mx-auto max-w-[1168px] px-4 pb-10">
        <HoanThanh slug={slug} />
      </div>
    </>
  );
}
