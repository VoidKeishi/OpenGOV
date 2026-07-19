// Segment-first intake (WIDGET.md §5.2): the welcome screen asks whether the
// visitor needs a citizen or a business procedure, then narrows the suggestion
// chips to that branch. Client-only — picking a segment never calls the LLM.

export type Segment = 'ca_nhan' | 'doanh_nghiep';

export const GREETING_ASK =
  'Chào anh/chị! Anh/chị cần làm thủ tục cho cá nhân hay cho doanh nghiệp?';

export const BRANCH_LEAD: Record<Segment, string> = {
  ca_nhan: 'Anh/chị cần thủ tục cho cá nhân — một số việc thường gặp:',
  doanh_nghiep: 'Anh/chị cần thủ tục cho doanh nghiệp — một số việc thường gặp:',
};

export const SEGMENT_CHIPS: { key: Segment; label: string }[] = [
  { key: 'ca_nhan', label: '👤 Cá nhân' },
  { key: 'doanh_nghiep', label: '🏢 Doanh nghiệp' },
];

export const BRANCH_CHIPS: Record<Segment, string[]> = {
  ca_nhan: [
    'Tôi muốn đăng ký thường trú',
    'Đăng ký thường trú cần giấy tờ gì?',
    'Lệ phí đăng ký thường trú bao nhiêu?',
  ],
  doanh_nghiep: [
    'Tôi muốn thành lập doanh nghiệp tư nhân',
    'Phí thành lập doanh nghiệp tư nhân?',
    'Công ty tôi có cần đăng ký nội quy lao động không?',
  ],
};

// Explicit per-procedure audience — the code prefix (1.x/2.x) is a registry
// series, not an audience marker, so no prefix guessing.
const SEGMENT_BY_PROCEDURE: Record<string, Segment> = {
  '1.004222': 'ca_nhan',
  '2.001610': 'doanh_nghiep',
  '2.001955': 'doanh_nghiep',
};

/** Segment implied by the page the widget is embedded on, if any. */
export function inferSegment(procedureCode?: string): Segment | null {
  return (procedureCode && SEGMENT_BY_PROCEDURE[procedureCode]) || null;
}
