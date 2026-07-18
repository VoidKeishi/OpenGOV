// Gen-UI card renderers (WIDGET.md §3.4, §5.4). Payloads come straight from
// DB records: every field may be null/absent, arrays are loose — render
// defensively via deterministic formatters (format.ts), never recompute
// numbers, hide internal keys (id/case_code/fee type codes), silently skip
// unknown card types.
import type { Card } from '../types';
import { useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { clamp, curatedChannelLabel, feeTypeLabel, fmtDate, fmtDuration, fmtMoney, methodLabel } from './format';

const has = (v: unknown): boolean => v != null && v !== '';

function ProcedureCard({ p }: { p: Record<string, any> }) {
  return (
    <div class="og-card">
      <div class="og-card-title">
        {has(p.name) ? p.name : 'Thủ tục hành chính'}
        {has(p.code) ? <span class="og-card-sub"> ({p.code})</span> : null}
        {p.limited ? <span class="og-badge-pill">chỉ có thông tin cơ bản</span> : null}
      </div>
      <dl>
        {has(p.executing_agency) && (
          <>
            <dt>Cơ quan thực hiện</dt>
            <dd>{p.executing_agency}</dd>
          </>
        )}
        {has(p.promulgating_agency) && (
          <>
            <dt>Cơ quan ban hành</dt>
            <dd>{p.promulgating_agency}</dd>
          </>
        )}
        {has(p.category) && (
          <>
            <dt>Lĩnh vực</dt>
            <dd>{p.category}</dd>
          </>
        )}
      </dl>
      {has(p.source_url) && (
        <a class="og-link-btn" href={p.source_url} target="_blank" rel="noopener noreferrer">
          Xem trên Cổng DVC ↗
        </a>
      )}
      {has(p.updated_at) && <div class="og-card-sub">Dữ liệu cập nhật: {fmtDate(p.updated_at)}</div>}
    </div>
  );
}

function FeesCard({ p }: { p: Record<string, any> }) {
  const channels: any[] = Array.isArray(p.channels) ? p.channels : [];
  const notes: any[] = Array.isArray(p.fee_notes) ? p.fee_notes.filter(has) : [];
  return (
    <div class="og-card">
      <div class="og-card-title">Phí, lệ phí</div>
      {channels.map((ch, i) => (
        <div key={i} class="og-check-group">
          <div class="og-check-group-label">{methodLabel(ch?.method)}</div>
          {(Array.isArray(ch?.fees) ? ch.fees : []).filter(has).map((f: any, j: number) => (
            <div key={j}>
              {has(f?.value_vnd) && (
                <div>
                  {feeTypeLabel(f?.type)}: <strong>{fmtMoney(f.value_vnd)}</strong>
                </div>
              )}
              {has(f?.text) && <div class="og-card-sub">{clamp(f.text, 160)}</div>}
            </div>
          ))}
        </div>
      ))}
      {notes.map((n: any, i: number) => (
        <div key={i} class="og-card-sub">
          {curatedChannelLabel(n?.channel) ? `${curatedChannelLabel(n.channel)}: ` : ''}
          {clamp(n?.text, 200)}
        </div>
      ))}
    </div>
  );
}

function ProcessingCard({ p }: { p: Record<string, any> }) {
  const channels: any[] = (Array.isArray(p.channels) ? p.channels : []).filter((ch: any) => has(ch?.processing));
  // Channel rows already carry the same numbers — only fall back to the loose cases without them.
  const cases: any[] = channels.length ? [] : (Array.isArray(p.processing_cases) ? p.processing_cases : []);
  return (
    <div class="og-card">
      <div class="og-card-title">Thời gian xử lý</div>
      {channels.map((ch, i) => (
        <div key={i}>
          {methodLabel(ch?.method)}: <strong>{fmtDuration(ch.processing) || clamp(ch.processing?.text, 120) || '—'}</strong>
        </div>
      ))}
      {cases.map((c: any, i: number) => (
        <div key={i}>{fmtDuration(c) || clamp(c?.text, 120) || '—'}</div>
      ))}
    </div>
  );
}

function DeadlinesCard({ p }: { p: Record<string, any> }) {
  const deadlines: any[] = Array.isArray(p.deadlines) ? p.deadlines.filter(has) : [];
  return (
    <div class="og-card">
      <div class="og-card-title">Thời hạn cần lưu ý</div>
      {deadlines.map((d: any, i: number) => (
        <div key={i} class="og-check-group">
          {has(d?.label) && <div class="og-check-group-label">{d.label}</div>}
          {(fmtDuration(d) || has(d?.from)) && (
            <div>
              {fmtDuration(d)}
              {has(d?.from) ? ` kể từ ${d.from}` : ''}
            </div>
          )}
          {has(d?.source_quote) && <div class="og-card-sub">"{clamp(d.source_quote, 140)}"</div>}
        </div>
      ))}
    </div>
  );
}

function LegalBasisCard({ p }: { p: Record<string, any> }) {
  const docs: any[] = Array.isArray(p.legal_basis) ? p.legal_basis.filter(has) : [];
  return (
    <div class="og-card">
      <div class="og-card-title">Căn cứ pháp lý</div>
      <ul>
        {docs.map((b: any, i: number) => (
          <li key={i}>
            <strong>{has(b?.code) ? b.code : ''}</strong>
            {has(b?.name) ? ` — ${clamp(b.name, 90)}` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LegalFragmentsCard({ p }: { p: Record<string, any> }) {
  const [open, setOpen] = useState(false); // collapsed by default (§3.4)
  const frags: any[] = Array.isArray(p.fragments) ? p.fragments : [];
  return (
    <div class="og-card">
      <button class="og-collapse-head" onClick={() => setOpen(!open)}>
        Căn cứ pháp lý — {frags.length} trích đoạn {open ? '▾' : '▸'}
      </button>
      {open &&
        frags.map((f, i) => (
          <div key={i} class="og-fragment">
            <div>
              <strong>{has(f?.title) ? f.title : has(f?.article) ? f.article : 'Trích đoạn'}</strong>
            </div>
            {has(f?.doc_title) && (
              <div class="og-card-sub">
                {f.doc_title}
                {has(f?.article) ? ` — ${f.article}` : ''}
              </div>
            )}
            {has(f?.source_url) && (
              <a href={f.source_url} target="_blank" rel="noopener noreferrer">
                Mở nguồn ↗
              </a>
            )}
          </div>
        ))}
    </div>
  );
}

/** R2 checklist card. Tick state is client-only, persisted in the transcript cache. */
function ChecklistCard({
  p,
  cardIndex,
  ticks,
  onTick,
}: {
  p: Record<string, any>;
  cardIndex: number;
  ticks: Record<string, boolean>;
  onTick: (key: string) => void;
}) {
  const qty = (q: any): string => {
    const parts: string[] = [];
    if (q?.original > 0) parts.push(`${q.original} bản chính`);
    if (q?.copy > 0) parts.push(`${q.copy} bản sao`);
    return parts.length ? ` (${parts.join(', ')})` : '';
  };
  const groups: any[] = Array.isArray(p.groups) ? p.groups : [];
  return (
    <div class="og-card">
      <div class="og-card-title">Giấy tờ cần chuẩn bị</div>
      {groups.map((g, gi) => (
        <div key={gi} class="og-check-group">
          {has(g?.label) && <div class="og-check-group-label">{g.label}</div>}
          {g?.type === 'ONE_OF' && <div class="og-check-group-sub">MỘT TRONG các giấy tờ sau</div>}
          {(Array.isArray(g?.items) ? g.items : []).map((it: any, ii: number) => {
            const key = `${cardIndex}:${it?.id ?? `${gi}.${ii}`}`;
            return (
              <label key={key} class="og-check-item">
                <input type="checkbox" checked={!!ticks[key]} onChange={() => onTick(key)} />
                <span>
                  {has(it?.label) ? it.label : 'Giấy tờ'}
                  <span class="og-qty">{qty(it?.quantity)}</span>
                  {it?.conditional ? <span class="og-badge-pill">ⓘ tùy trường hợp</span> : null}
                </span>
              </label>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function CardView({
  card,
  cardIndex,
  ticks,
  onTick,
}: {
  card: Card;
  cardIndex: number;
  ticks: Record<string, boolean>;
  onTick: (key: string) => void;
}): ComponentChildren {
  const p = card?.payload ?? {};
  switch (card?.type) {
    case 'procedure':
      return <ProcedureCard p={p} />;
    case 'fees':
      return <FeesCard p={p} />;
    case 'processing':
      return <ProcessingCard p={p} />;
    case 'deadlines':
      return <DeadlinesCard p={p} />;
    case 'legal_basis':
      return <LegalBasisCard p={p} />;
    case 'legal_fragments':
      return <LegalFragmentsCard p={p} />;
    case 'checklist':
      return <ChecklistCard p={p} cardIndex={cardIndex} ticks={ticks} onTick={onTick} />;
    default:
      return null; // unknown card type → silently ignored (§3.4 forward-compat)
  }
}
