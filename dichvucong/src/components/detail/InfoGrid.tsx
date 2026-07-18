import type { ThuTucInfo } from "@/lib/types";

const PAIR_ROWS: [keyof ThuTucInfo, string][] = [
  ["maThuTuc", "Mã thủ tục"],
  ["soQuyetDinh", "Số quyết định"],
  ["capThucHien", "Cấp thực hiện"],
  ["loaiThuTuc", "Loại thủ tục"],
  ["linhVuc", "Lĩnh vực"],
  ["doiTuongThucHien", "Đối tượng thực hiện"],
  ["coQuanCoThamQuyen", "Cơ quan có thẩm quyền"],
  ["diaChiTiepNhanHS", "Địa chỉ tiếp nhận HS"],
  ["coQuanDuocUyQuyen", "Cơ quan được ủy quyền"],
  ["coQuanPhoiHop", "Cơ quan phối hợp"],
];

function Cell({
  label,
  value,
  full = false,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div
      className={`flex flex-col border-b border-l border-line md:flex-row ${
        full ? "md:col-span-2" : ""
      }`}
    >
      <div
        className={`shrink-0 bg-[#f3f3f3]/50 px-3 py-2 text-[15px] font-bold ${
          full ? "md:w-1/4" : "md:w-1/2"
        }`}
      >
        {label}
      </div>
      <div className={`min-h-9 px-3 py-2 text-[15px] ${full ? "md:w-3/4" : "md:w-1/2"}`}>
        {value}
      </div>
    </div>
  );
}

export default function InfoGrid({ info }: { info: ThuTucInfo }) {
  return (
    <div className="grid border-r border-t border-line md:grid-cols-2">
      <Cell full label="Tên thủ tục" value={info.tenThuTuc} />
      {PAIR_ROWS.map(([key, label]) => (
        <Cell key={key} label={label} value={info[key]} />
      ))}
    </div>
  );
}
