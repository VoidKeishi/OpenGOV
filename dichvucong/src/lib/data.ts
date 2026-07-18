// Truy cập dữ liệu tĩnh. CHỈ import từ server component với dữ liệu thủ tục
// (file lớn) — client nhận props đã cắt gọn.
import type { FormSchema, ThuTuc, ThuTucIndexItem } from "./types";
import indexData from "@/data/thu-tuc/index.json";
import dangKyKhaiSinh from "@/data/thu-tuc/dang-ky-khai-sinh.json";
import dangKyThuongTru from "@/data/thu-tuc/dang-ky-thuong-tru.json";
import capGpxd from "@/data/thu-tuc/cap-gpxd-nha-o-rieng-le.json";
import formKhaiSinh from "@/data/form/dang-ky-khai-sinh.json";
import formThuongTru from "@/data/form/dang-ky-thuong-tru.json";
import formGpxd from "@/data/form/cap-gpxd-nha-o-rieng-le.json";

export const THU_TUC_INDEX = indexData as ThuTucIndexItem[];

export const PILOT_SLUGS = [
  "dang-ky-khai-sinh",
  "dang-ky-thuong-tru",
  "cap-gpxd-nha-o-rieng-le",
] as const;

const THU_TUC: Record<string, ThuTuc> = {
  "dang-ky-khai-sinh": dangKyKhaiSinh as ThuTuc,
  "dang-ky-thuong-tru": dangKyThuongTru as ThuTuc,
  "cap-gpxd-nha-o-rieng-le": capGpxd as ThuTuc,
};

const FORMS: Record<string, FormSchema> = {
  "dang-ky-khai-sinh": formKhaiSinh as FormSchema,
  "dang-ky-thuong-tru": formThuongTru as FormSchema,
  "cap-gpxd-nha-o-rieng-le": formGpxd as FormSchema,
};

export function getThuTuc(slug: string): ThuTuc | undefined {
  return THU_TUC[slug];
}

export function getFormSchema(slug: string): FormSchema | undefined {
  return FORMS[slug];
}
