import type { Metadata } from "next";
import Breadcrumb from "@/components/layout/Breadcrumb";
import SubNav from "@/components/layout/SubNav";
import { ListSearchBar } from "@/components/SearchBar";
import DvcTabs from "@/components/DvcTabs";
import { sortThuTuc, THU_TUC_INDEX } from "@/lib/data";

export const metadata: Metadata = {
  title: "Dịch vụ công trực tuyến - Cổng Dịch vụ công Quốc gia (Demo)",
};

export default function DvcTrucTuyenPage() {
  // Toàn trình → có chi tiết → vỏ, mỗi tab — CLONE_SPEC.md 3.3
  const congDan = sortThuTuc(THU_TUC_INDEX.filter((t) => t.nhom === "cong-dan"));
  const doanhNghiep = sortThuTuc(
    THU_TUC_INDEX.filter((t) => t.nhom === "doanh-nghiep"),
  );

  return (
    <>
      <SubNav active="Dịch vụ công trực tuyến" />
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Dịch vụ công trực tuyến" },
        ]}
      />
      <div className="mx-auto max-w-[1168px] px-4 pb-10">
        <ListSearchBar
          placeholder="Nhập từ khóa tìm kiếm dịch vụ công"
          withAdvanced
          withButton
        />
        <div className="mt-6">
          <DvcTabs congDan={congDan} doanhNghiep={doanhNghiep} />
        </div>
      </div>
    </>
  );
}
