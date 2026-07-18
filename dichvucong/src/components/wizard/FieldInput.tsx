"use client";

import type { FormField } from "@/lib/types";

const INPUT_CLS =
  "w-full rounded border border-line bg-white px-3 py-2 text-[15px] outline-none focus:border-brand";

export type FieldProps = {
  field: FormField;
  value: string;
  onChange: (name: string, value: string) => void;
  resolveOptions: (field: { options?: string[]; optionsRef?: string }) => string[];
};

export function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-[#d13438]">
      {" "}
      *
    </span>
  );
}

// 1 field của tờ khai — controlled, chỉ validate native (required/type/pattern),
// KHÔNG logic kiểm tra thêm (CLONE_SPEC.md 3.5.2).
export default function FieldInput({ field, value, onChange, resolveOptions }: FieldProps) {
  const id = field.name;

  if (field.type === "radio") {
    return (
      <fieldset>
        <legend className="mb-1.5 block text-[15px] font-medium">
          {field.label}
          {field.required && <RequiredMark />}
        </legend>
        <div className="flex items-center gap-6 py-1.5">
          {(field.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-[15px]">
              <input
                type="radio"
                name={field.name}
                value={opt}
                required={field.required}
                checked={value === opt}
                onChange={(e) => onChange(field.name, e.target.value)}
                className="accent-brand"
              />
              {opt}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 py-1.5 text-[15px] font-medium">
        <input
          type="checkbox"
          name={field.name}
          id={id}
          required={field.required}
          checked={value === "Đã đồng ý"}
          onChange={(e) => onChange(field.name, e.target.checked ? "Đã đồng ý" : "")}
          className="h-4 w-4 accent-brand"
        />
        {field.label}
        {field.required && <RequiredMark />}
      </label>
    );
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[15px] font-medium">
        {field.label}
        {field.required && <RequiredMark />}
      </label>
      {field.type === "textarea" ? (
        <textarea
          id={id}
          name={field.name}
          required={field.required}
          placeholder={field.placeholder}
          rows={3}
          value={value}
          onChange={(e) => onChange(field.name, e.target.value)}
          className={INPUT_CLS}
        />
      ) : field.type === "select" ? (
        <select
          id={id}
          name={field.name}
          required={field.required}
          value={value}
          onChange={(e) => onChange(field.name, e.target.value)}
          className={INPUT_CLS}
        >
          <option value="">-- Chọn --</option>
          {resolveOptions(field).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          name={field.name}
          type={field.type}
          required={field.required}
          placeholder={field.placeholder}
          pattern={field.pattern}
          maxLength={field.maxLength}
          inputMode={field.inputMode as React.HTMLAttributes<HTMLInputElement>["inputMode"]}
          step={field.step}
          value={value}
          onChange={(e) => onChange(field.name, e.target.value)}
          className={INPUT_CLS}
        />
      )}
    </div>
  );
}
