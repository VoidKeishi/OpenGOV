"use client";

import { Plus, Trash2 } from "lucide-react";
import type { FormField, Member } from "@/lib/types";

const CELL_INPUT_CLS =
  "w-full rounded border border-line bg-white px-2 py-1.5 text-[14px] outline-none focus:border-brand";

// Bảng động mục 11 mẫu CT01 — cả bảng optional (CLONE_SPEC.md 4.2).
export default function MemberTable({
  field,
  members,
  setMembers,
  resolveOptions,
}: {
  field: FormField;
  members: Member[];
  setMembers: (m: Member[]) => void;
  resolveOptions: (field: { options?: string[]; optionsRef?: string }) => string[];
}) {
  const columns = field.columns ?? [];

  const update = (row: number, col: string, value: string) => {
    setMembers(members.map((m, i) => (i === row ? { ...m, [col]: value } : m)));
  };

  return (
    <div>
      {members.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="border-b-2 border-brand bg-gray-200">
                <th className="border-l border-gray-300 px-2 py-2 text-left text-[14px] font-semibold first:border-l-0">
                  TT
                </th>
                {columns.map((c) => (
                  <th
                    key={c.name}
                    className="border-l border-gray-300 px-2 py-2 text-left text-[14px] font-semibold"
                  >
                    {c.label}
                  </th>
                ))}
                <th className="border-l border-gray-300 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={i}>
                  <td className="border border-gray-300 px-2 py-1.5 text-center text-[14px]">
                    {i + 1}
                  </td>
                  {columns.map((c) => (
                    <td key={c.name} className="border border-gray-300 px-1.5 py-1.5">
                      {c.type === "select" ? (
                        <select
                          aria-label={`${c.label} — thành viên ${i + 1}`}
                          name={`${field.name}_${i}_${c.name}`}
                          value={m[c.name] ?? ""}
                          onChange={(e) => update(i, c.name, e.target.value)}
                          className={CELL_INPUT_CLS}
                        >
                          <option value="">-- Chọn --</option>
                          {resolveOptions(c).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          aria-label={`${c.label} — thành viên ${i + 1}`}
                          name={`${field.name}_${i}_${c.name}`}
                          type={c.type}
                          pattern={c.pattern}
                          maxLength={c.maxLength}
                          inputMode={
                            c.inputMode as React.HTMLAttributes<HTMLInputElement>["inputMode"]
                          }
                          value={m[c.name] ?? ""}
                          onChange={(e) => update(i, c.name, e.target.value)}
                          className={CELL_INPUT_CLS}
                        />
                      )}
                    </td>
                  ))}
                  <td className="border border-gray-300 px-1.5 py-1.5 text-center">
                    <button
                      type="button"
                      aria-label={`Xoá thành viên ${i + 1}`}
                      onClick={() => setMembers(members.filter((_, j) => j !== i))}
                      className="text-muted hover:text-[#d13438]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button
        type="button"
        onClick={() => setMembers([...members, {}])}
        className="mt-3 flex items-center gap-1.5 rounded border border-brand px-3 py-1.5 text-[14px] font-semibold text-brand hover:bg-brand hover:text-white"
      >
        <Plus className="h-4 w-4" />
        Thêm thành viên
      </button>
    </div>
  );
}
