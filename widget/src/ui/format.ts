// Deterministic display formatters for card payloads (WIDGET.md §3.4). Values come
// straight from the DB — these map closed enums to Vietnamese labels and format
// money/dates/durations. Unknown enum values fall back to the raw string (forward-compat,
// never throw); numbers are never recomputed.

const METHOD_LABELS: Record<string, string> = {
  ONLINE: 'Nộp trực tuyến',
  DIRECT: 'Nộp trực tiếp',
  POSTAL: 'Nộp qua bưu chính',
};

const UNIT_LABELS: Record<string, string> = {
  WORKING_DAY: 'ngày làm việc',
  DAY: 'ngày',
  HOUR: 'giờ',
  MONTH: 'tháng',
};

const FEE_TYPE_LABELS: Record<string, string> = {
  FEE: 'Lệ phí',
  SERVICE_FEE: 'Phí dịch vụ',
  PRICE_LEVEL: 'Mức giá',
};

export function methodLabel(method: unknown): string {
  return (typeof method === 'string' && METHOD_LABELS[method]) || String(method ?? '') || 'Kênh nộp';
}

export function feeTypeLabel(type: unknown): string {
  return (typeof type === 'string' && FEE_TYPE_LABELS[type]) || 'Mức thu';
}

/** "10.000 đ" — dot-grouped VND. Non-numbers → ''. */
export function fmtMoney(value: unknown): string {
  if (typeof value !== 'number' || !isFinite(value)) return '';
  return `${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} đ`;
}

/** ISO date(-time) → "dd/mm/yyyy" by string slicing (no Date, no timezone drift). */
export function fmtDate(iso: unknown): string {
  if (typeof iso !== 'string') return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/** {qty, unit} → "7 ngày làm việc"; unknown unit (incl. OTHER) → '' so callers fall back to source text. */
export function fmtDuration(p: unknown): string {
  const q = (p as any)?.qty;
  const unit = (p as any)?.unit;
  if (typeof q !== 'number' || typeof unit !== 'string' || !UNIT_LABELS[unit]) return '';
  return `${q} ${UNIT_LABELS[unit]}`;
}

export function clamp(s: unknown, max: number): string {
  const str = String(s ?? '');
  return str.length > max ? `${str.slice(0, max).trimEnd()}…` : str;
}

/** Curated fee_notes/steps channel keys (truc_tuyen | truc_tiep | buu_chinh | all). */
const CURATED_CHANNEL_LABELS: Record<string, string> = {
  truc_tuyen: 'Trực tuyến',
  truc_tiep: 'Trực tiếp',
  buu_chinh: 'Bưu chính',
};

/** Label prefix for a curated channel key; 'all'/unknown → '' (no prefix). */
export function curatedChannelLabel(channel: unknown): string {
  return (typeof channel === 'string' && CURATED_CHANNEL_LABELS[channel]) || '';
}
