export type TableData = { columns: string[]; rows: string[][] };

export type HoSoRow = { tenGiayTo: string; mauDon: string; soLuong: string };
export type HoSoGroup = { nhom: string; rows: HoSoRow[] };

export type ThuTucInfo = {
  tenThuTuc: string;
  maThuTuc: string;
  soQuyetDinh: string;
  capThucHien: string;
  loaiThuTuc: string;
  linhVuc: string;
  doiTuongThucHien: string;
  coQuanCoThamQuyen: string;
  diaChiTiepNhanHS: string;
  coQuanDuocUyQuyen: string;
  coQuanPhoiHop: string;
};

export type ThuTuc = {
  slug: string;
  ten: string;
  info: ThuTucInfo;
  lienQuan: string;
  trinhTu: { title: string; body: string }[];
  cachThuc: TableData;
  thanhPhanHoSo: HoSoGroup[];
  canCuPhapLy: TableData;
  coQuanThucHien: string;
  yeuCau: string;
  ketQua: { ten: string; ma: string }[];
  tuKhoa: string;
  moTa: string;
};

export type ThuTucIndexItem = {
  slug?: string;
  ten: string;
  linhVuc: string;
  nhom: "cong-dan" | "doanh-nghiep";
  coChiTiet: boolean;
};

export type FormFieldType =
  | "text"
  | "date"
  | "select"
  | "textarea"
  | "number"
  | "tel"
  | "email"
  | "radio"
  | "checkbox"
  | "member-table";

export type MemberColumn = {
  name: string;
  label: string;
  type: "text" | "date" | "select";
  optionsRef?: string;
  pattern?: string;
  maxLength?: number;
  inputMode?: string;
};

export type FormField = {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  options?: string[];
  optionsRef?: string;
  pattern?: string;
  maxLength?: number;
  inputMode?: string;
  placeholder?: string;
  defaultValue?: string;
  prefill?: "user.hoTen" | "user.soDinhDanh" | "user.ngaySinh" | "today" | "phuongXa" | "tinh";
  step?: string;
  columns?: MemberColumn[];
};

export type FormSection = {
  legend: string;
  note?: string;
  fields: FormField[];
};

export type FormSchema = {
  slug: string;
  tenToKhai: string;
  canCuMau: string;
  maHoSoPrefix: string;
  coQuanPrefix: "UBND" | "Công an";
  sections: FormSection[];
};

export type TinhThanh = { ten: string; phuongXa: string[] };

export type Member = Record<string, string>;
