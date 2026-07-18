// Bảng dữ liệu generic cho các section chi tiết thủ tục.
// Luôn cuộn ngang trong container riêng trên mobile (CLONE_SPEC.md 3.4).
export default function DataTable({
  columns,
  rows,
  widths,
}: {
  columns: string[];
  rows: string[][];
  widths?: string[];
}) {
  return (
    <div className="w-full overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse bg-white">
          {widths && (
            <colgroup>
              {widths.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
          )}
          <thead>
            <tr className="border-b-2 border-brand bg-gray-200">
              {columns.map((c) => (
                <th
                  key={c}
                  className="border-l border-gray-300 px-4 py-2 text-left text-[16px] font-semibold first:border-l-0"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className="border border-gray-300 px-4 py-2 align-top text-[15px] whitespace-pre-line break-words hyphens-auto"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
