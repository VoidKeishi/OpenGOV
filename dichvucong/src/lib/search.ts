// So khớp không dấu, không phân biệt hoa thường.
// Lưu ý: NFD không tách "đ/Đ" — phải thay riêng.
export function stripDiacritics(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export function matches(name: string, keyword: string): boolean {
  const kw = keyword.trim();
  if (!kw) return false;
  return stripDiacritics(name).includes(stripDiacritics(kw));
}
