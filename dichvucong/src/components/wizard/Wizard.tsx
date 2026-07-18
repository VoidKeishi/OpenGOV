"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import StepBar from "./StepBar";
import FieldInput, { RequiredMark } from "./FieldInput";
import MemberTable from "./MemberTable";
import coQuan from "@/data/co-quan.json";
import optionsJson from "@/data/options.json";
import type { FormField, FormSchema, Member } from "@/lib/types";

const OPTIONS = optionsJson as Record<string, string[]>;

const INPUT_CLS =
  "w-full rounded border border-line bg-white px-3 py-2 text-[15px] outline-none focus:border-brand";

export type GiayTo = { ten: string; soLuong: string };

type Props = {
  slug: string;
  tenThuTuc: string;
  schema: FormSchema;
  giayTo: GiayTo[];
};

const FORM_ID = "wizard-form";

// Hiển thị ngày yyyy-mm-dd → dd/mm/yyyy (không dùng locale để SSR/client khớp nhau)
const showDate = (v: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(v) ? v.split("-").reverse().join("/") : v;

export default function Wizard({ slug, tenThuTuc, schema, giayTo }: Props) {
  const router = useRouter();
  const { user, ready, openModal } = useAuth();

  const [step, setStep] = useState(1);
  const [tinh, setTinh] = useState("");
  const [phuongXa, setPhuongXa] = useState("");
  const [data, setData] = useState<Record<string, string>>({});
  const [members, setMembers] = useState<Member[]>([]);
  const [files, setFiles] = useState<Record<number, string>>({});
  const [banSao, setBanSao] = useState<Record<number, boolean>>({});

  const allFields = useMemo(
    () => schema.sections.flatMap((s) => s.fields),
    [schema],
  );

  // Chưa đăng nhập → tự bật modal đăng nhập giả (CLONE_SPEC.md mục 6.2)
  useEffect(() => {
    if (ready && !user) openModal();
  }, [ready, user, openModal]);

  // Prefill từ fake user / hôm nay / lựa chọn bước 1 — chỉ điền chỗ còn trống
  useEffect(() => {
    if (!user) return;
    setData((d) => {
      const next = { ...d };
      for (const f of allFields) {
        if (next[f.name]) continue;
        let v = "";
        if (f.prefill === "user.hoTen") v = user.hoTen;
        else if (f.prefill === "user.soDinhDanh") v = user.soDinhDanh;
        else if (f.prefill === "user.ngaySinh") v = user.ngaySinh;
        else if (f.prefill === "today") v = new Date().toISOString().slice(0, 10);
        else if (f.prefill === "tinh") v = tinh;
        else if (f.prefill === "phuongXa") v = phuongXa;
        else if (f.defaultValue) v = f.defaultValue;
        if (v) next[f.name] = v;
      }
      return next;
    });
  }, [user, tinh, phuongXa, allFields]);

  const setField = useCallback(
    (name: string, value: string) => setData((d) => ({ ...d, [name]: value })),
    [],
  );

  const resolveOptions = useCallback(
    (f: { options?: string[]; optionsRef?: string }) => {
      if (f.options) return f.options;
      if (f.optionsRef === "tinh") return coQuan.map((t) => t.ten);
      if (f.optionsRef === "phuongXa") {
        const t = data["tinh_thanh_pho"] || tinh;
        return coQuan.find((x) => x.ten === t)?.phuongXa ?? [];
      }
      return OPTIONS[f.optionsRef ?? ""] ?? [];
    },
    [data, tinh],
  );

  const coQuanDisplay = phuongXa
    ? `${schema.coQuanPrefix} ${phuongXa}${tinh ? `, ${tinh}` : ""}`
    : "";

  if (!ready) {
    return <div className="py-20 text-center text-muted">Đang tải…</div>;
  }

  if (!user) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg">Vui lòng đăng nhập để nộp hồ sơ trực tuyến.</p>
        <button
          type="button"
          onClick={openModal}
          className="mt-4 rounded bg-brand px-8 py-2.5 font-semibold text-white hover:bg-brand-dark"
        >
          Đăng nhập
        </button>
      </div>
    );
  }

  const goNext = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step < 4) {
      setStep(step + 1);
      window.scrollTo(0, 0);
      return;
    }
    // Bước 4 — nộp giả lập: sinh mã hồ sơ phía client, lưu sessionStorage
    const maHoSo = `DVC-${schema.maHoSoPrefix}-${Math.floor(100000 + Math.random() * 900000)}`;
    const submission = {
      maHoSo,
      thoiGian: new Date().toISOString(),
      coQuan: coQuanDisplay,
      tenThuTuc,
      slug,
    };
    try {
      sessionStorage.setItem(`dvc-submission-${slug}`, JSON.stringify(submission));
    } catch {}
    router.push(`/nop-truc-tuyen/${slug}/hoan-thanh`);
  };

  const goBack = () => {
    setStep(step - 1);
    window.scrollTo(0, 0);
  };

  return (
    <div>
      <StepBar current={step} />
      <div className="mt-6 rounded border border-line bg-white p-4 md:p-6">
        {step === 1 && (
          <form id={FORM_ID} onSubmit={goNext}>
            <fieldset>
              <legend className="mb-3 text-base font-bold text-brand-dark">
                Cơ quan tiếp nhận
              </legend>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="chon_tinh" className="mb-1.5 block text-[15px] font-medium">
                    Tỉnh/Thành phố
                    <RequiredMark />
                  </label>
                  <select
                    id="chon_tinh"
                    name="chon_tinh"
                    required
                    value={tinh}
                    onChange={(e) => {
                      setTinh(e.target.value);
                      setPhuongXa("");
                    }}
                    className={INPUT_CLS}
                  >
                    <option value="">-- Chọn Tỉnh/ Thành phố --</option>
                    {coQuan.map((t) => (
                      <option key={t.ten} value={t.ten}>
                        {t.ten}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="chon_phuong_xa" className="mb-1.5 block text-[15px] font-medium">
                    Phường/Xã
                    <RequiredMark />
                  </label>
                  <select
                    id="chon_phuong_xa"
                    name="chon_phuong_xa"
                    required
                    value={phuongXa}
                    onChange={(e) => setPhuongXa(e.target.value)}
                    className={INPUT_CLS}
                  >
                    <option value="">-- Chọn Phường/ Xã --</option>
                    {(coQuan.find((t) => t.ten === tinh)?.phuongXa ?? []).map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {coQuanDisplay && (
                <p className="mt-4 rounded bg-surface px-3 py-2.5 text-[15px]">
                  Cơ quan tiếp nhận: <strong>{coQuanDisplay}</strong>
                </p>
              )}
            </fieldset>
            <fieldset className="mt-6">
              <legend className="mb-3 text-base font-bold text-brand-dark">
                Thông tin người nộp hồ sơ
              </legend>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label htmlFor="nguoi_nop_ho_ten" className="mb-1.5 block text-[15px] font-medium">
                    Họ và tên
                  </label>
                  <input
                    id="nguoi_nop_ho_ten"
                    name="nguoi_nop_ho_ten"
                    type="text"
                    readOnly
                    value={user.hoTen}
                    className={`${INPUT_CLS} bg-surface`}
                  />
                </div>
                <div>
                  <label
                    htmlFor="nguoi_nop_so_dinh_danh"
                    className="mb-1.5 block text-[15px] font-medium"
                  >
                    Số định danh cá nhân
                  </label>
                  <input
                    id="nguoi_nop_so_dinh_danh"
                    name="nguoi_nop_so_dinh_danh"
                    type="text"
                    readOnly
                    value={user.soDinhDanh}
                    className={`${INPUT_CLS} bg-surface`}
                  />
                </div>
                <div>
                  <label
                    htmlFor="nguoi_nop_ngay_sinh"
                    className="mb-1.5 block text-[15px] font-medium"
                  >
                    Ngày sinh
                  </label>
                  <input
                    id="nguoi_nop_ngay_sinh"
                    name="nguoi_nop_ngay_sinh"
                    type="text"
                    readOnly
                    value={showDate(user.ngaySinh)}
                    className={`${INPUT_CLS} bg-surface`}
                  />
                </div>
              </div>
            </fieldset>
          </form>
        )}

        {step === 2 && (
          <form id={FORM_ID} onSubmit={goNext}>
            <h2 className="text-lg font-bold text-brand-dark">{schema.tenToKhai}</h2>
            <p className="mt-1 text-sm text-muted">{schema.canCuMau}</p>
            <p className="mt-3 rounded bg-surface px-3 py-2.5 text-[15px]">
              Kính gửi: <strong>{coQuanDisplay || "(chưa chọn cơ quan ở bước 1)"}</strong>
            </p>
            {schema.sections.map((section) => (
              <fieldset key={section.legend} className="mt-6 border-t border-line pt-4">
                <legend className="float-left mb-3 w-full text-base font-bold text-brand-dark">
                  {section.legend}
                </legend>
                {section.note && (
                  <p className="mb-3 clear-left text-sm italic text-muted">{section.note}</p>
                )}
                <div className="clear-left grid gap-x-6 gap-y-4 md:grid-cols-2">
                  {section.fields.map((f) =>
                    f.type === "member-table" ? (
                      <div key={f.name} className="md:col-span-2">
                        <MemberTable
                          field={f}
                          members={members}
                          setMembers={setMembers}
                          resolveOptions={resolveOptions}
                        />
                      </div>
                    ) : (
                      <div
                        key={f.name}
                        className={f.type === "textarea" ? "md:col-span-2" : ""}
                      >
                        <FieldInput
                          field={f}
                          value={data[f.name] ?? ""}
                          onChange={setField}
                          resolveOptions={resolveOptions}
                        />
                      </div>
                    ),
                  )}
                </div>
              </fieldset>
            ))}
          </form>
        )}

        {step === 3 && (
          <form id={FORM_ID} onSubmit={goNext}>
            <h2 className="text-lg font-bold text-brand-dark">Giấy tờ đính kèm</h2>
            <p className="mt-1 text-sm text-muted">
              Theo thành phần hồ sơ của thủ tục. Môi trường demo — tệp không được tải
              lên, chỉ hiển thị tên tệp đã chọn.
            </p>
            <ul>
              {giayTo.map((g, i) => (
                <li
                  key={i}
                  className="flex flex-col gap-2 border-b border-line py-4 md:flex-row md:items-center md:gap-6"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] leading-snug">{g.ten}</p>
                    {g.soLuong && (
                      <p className="mt-1 text-sm whitespace-pre-line text-muted">{g.soLuong}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 md:w-[340px]">
                    <input
                      type="file"
                      id={`giay_to_${i}`}
                      name={`giay_to_${i}`}
                      aria-label={`Chọn tệp cho: ${g.ten}`}
                      onChange={(e) =>
                        setFiles((fs) => ({
                          ...fs,
                          [i]: e.target.files?.[0]?.name ?? "",
                        }))
                      }
                      className="text-sm file:mr-3 file:rounded file:border file:border-brand file:bg-white file:px-3 file:py-1.5 file:font-semibold file:text-brand hover:file:bg-brand hover:file:text-white"
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name={`giay_to_${i}_ban_sao`}
                        checked={banSao[i] ?? false}
                        onChange={(e) =>
                          setBanSao((b) => ({ ...b, [i]: e.target.checked }))
                        }
                        className="h-4 w-4 accent-brand"
                      />
                      Bản sao điện tử
                    </label>
                  </div>
                </li>
              ))}
            </ul>
          </form>
        )}

        {step === 4 && (
          <form id={FORM_ID} onSubmit={goNext}>
            <h2 className="text-lg font-bold text-brand-dark">Xem lại & Nộp hồ sơ</h2>
            <p className="mt-3 rounded bg-surface px-3 py-2.5 text-[15px]">
              Cơ quan tiếp nhận: <strong>{coQuanDisplay}</strong>
            </p>
            {schema.sections.map((section) => {
              const rows = section.fields.filter(
                (f) => f.type !== "member-table" && (data[f.name] ?? "") !== "",
              );
              const hasMembers = section.fields.some((f) => f.type === "member-table");
              if (!rows.length && !(hasMembers && members.length)) return null;
              return (
                <section key={section.legend} className="mt-5">
                  <h3 className="border-b border-line pb-1.5 text-[15px] font-bold text-brand-dark">
                    {section.legend}
                  </h3>
                  <dl className="mt-2 grid gap-x-6 gap-y-1.5 md:grid-cols-2">
                    {rows.map((f) => (
                      <div key={f.name} className="flex gap-2 text-[15px]">
                        <dt className="text-muted">{f.label}:</dt>
                        <dd className="min-w-0 font-medium whitespace-pre-wrap">
                          {f.type === "date" ? showDate(data[f.name]) : data[f.name]}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {hasMembers && members.length > 0 && (
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-[15px]">
                      {members.map((m, i) => (
                        <li key={i}>
                          {(section.fields
                            .find((f) => f.type === "member-table")
                            ?.columns ?? [])
                            .map((c) =>
                              m[c.name]
                                ? `${c.label}: ${c.type === "date" ? showDate(m[c.name]) : m[c.name]}`
                                : null,
                            )
                            .filter(Boolean)
                            .join(" — ") || "(chưa nhập)"}
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              );
            })}
            <section className="mt-5">
              <h3 className="border-b border-line pb-1.5 text-[15px] font-bold text-brand-dark">
                Giấy tờ đính kèm
              </h3>
              <ul className="mt-2 space-y-1.5 text-[15px]">
                {giayTo.map((g, i) => (
                  <li key={i} className="flex flex-wrap gap-2">
                    <span className="min-w-0 flex-1">{g.ten}</span>
                    <span className="font-medium">
                      {files[i] ? files[i] : <span className="text-muted">Chưa đính kèm</span>}
                      {banSao[i] ? " (Bản sao điện tử)" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <label className="mt-6 flex items-start gap-2.5 rounded bg-surface px-3 py-3 text-[15px]">
              <input
                type="checkbox"
                name="cam_ket"
                required
                className="mt-0.5 h-4 w-4 accent-brand"
              />
              <span>
                Tôi xin cam đoan những lời khai trên là đúng sự thật và chịu trách
                nhiệm trước pháp luật về nội dung đã khai.
                <RequiredMark />
              </span>
            </label>
          </form>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              className="rounded border border-brand px-6 py-2.5 font-semibold text-brand hover:bg-brand hover:text-white"
            >
              Quay lại
            </button>
          ) : (
            <span />
          )}
          <button
            type="submit"
            form={FORM_ID}
            className="rounded bg-brand px-8 py-2.5 font-semibold text-white hover:bg-brand-dark"
          >
            {step === 4 ? "Nộp hồ sơ" : "Tiếp tục"}
          </button>
        </div>
      </div>
    </div>
  );
}
