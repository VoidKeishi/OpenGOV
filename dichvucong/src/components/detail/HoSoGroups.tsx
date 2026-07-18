import type { HoSoGroup } from "@/lib/types";
import DataTable from "./DataTable";

export default function HoSoGroups({ groups }: { groups: HoSoGroup[] }) {
  return (
    <div className="space-y-3">
      {groups.map((g, i) => (
        <div key={i} className="overflow-hidden rounded-sm border border-gray-200">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
            <h5 className="font-semibold text-gray-700">{g.nhom}</h5>
          </div>
          <DataTable
            columns={["Tên giấy tờ", "Mẫu đơn, tờ khai", "Số lượng"]}
            widths={["40%", "40%", "20%"]}
            rows={g.rows.map((r) => [r.tenGiayTo, r.mauDon, r.soLuong])}
          />
        </div>
      ))}
    </div>
  );
}
