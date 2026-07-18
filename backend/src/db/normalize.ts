/**
 * Vietnamese search normalization — the ONE function used at both seed time and
 * query time so "lam giay khai sinh" matches "Làm giấy khai sinh" (ARCHITECTURE.md §6).
 *
 * FTS5's unicode61 tokenizer folds most diacritics but NOT đ/Đ, so we pre-fold in JS:
 * lowercase → đ/Đ → d → strip remaining combining marks via NFD.
 */
export function normalizeSearch(input: string): string {
  return input
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
