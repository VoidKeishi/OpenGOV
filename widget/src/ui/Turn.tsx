// One transcript turn — the single render model for live streaming AND cache
// restore (same serializable Turn record, WIDGET.md §8). Prose above, cards
// revealed below after the stream ends (decision #8).
import type { Card, CheckTurnResult, Turn, ValidationError } from '../types';
import { miniMarkdown } from '../core/markdown';
import { visibleCards } from '../core/dedup';
import { CardView } from './cards';

export interface TurnActions {
  onTick(turnIndex: number, key: string): void;
  onRetry(turnIndex: number, retry: NonNullable<Turn['retry']>): void;
  onFieldClick(field: string): void;
  onTellMore(): void;
  onRecheck(): void;
  fieldOnDom(field: string): boolean;
  labelFor(field: string): string;
  /** Pha 2: quick-reply chip clicked — sends the text as a user message. */
  onChip(text: string): void;
  /** Pha 2: guide card button — scroll + spotlight the target. */
  onGuide(target: string): void;
  guideOnDom(target: string): boolean;
  /** Pha 2: undo a whole confirmed-prefill turn. */
  onUndoPrefill(turnIndex: number): void;
}

const SEV_ICON: Record<ValidationError['severity'], { icon: string; cls: string }> = {
  error: { icon: '✕', cls: 'og-sev og-sev-error' },
  warning: { icon: '⚠', cls: 'og-sev og-sev-warning' },
  info: { icon: 'ⓘ', cls: 'og-sev og-sev-info' },
};

function resultHeader(errors: ValidationError[]): string {
  const nErr = errors.filter((e) => e.severity === 'error').length;
  const nWarn = errors.filter((e) => e.severity === 'warning').length;
  const parts: string[] = [];
  if (nErr > 0) parts.push(`${nErr} lỗi`);
  if (nWarn > 0) parts.push(`${nWarn} cảnh báo`);
  return parts.length ? parts.join(', ') : `${errors.length} lưu ý`;
}

function CheckResultView({
  res,
  actions,
}: {
  res: CheckTurnResult;
  actions: TurnActions;
}) {
  const scopeLine = (
    <div class="og-result-scope">
      Đã kiểm tra {res.checked_fields} trường có quy tắc.
      {!res.llm_available && ' Bước kiểm tra ngữ nghĩa bằng AI được bỏ qua.'}
    </div>
  );
  const recheck = (
    <button class="og-link-btn" onClick={() => actions.onRecheck()}>
      Kiểm tra lại
    </button>
  );

  if (!res.errors.length) {
    return (
      <div class="og-greenbox">
        ✓ Không phát hiện lỗi trong các mục đã kiểm tra
        {scopeLine}
        {recheck}
      </div>
    );
  }

  return (
    <div class="og-card">
      <div class="og-result-head">Kết quả kiểm tra — {resultHeader(res.errors)}</div>
      {res.errors.map((err, i) => {
        const sev = SEV_ICON[err.severity] ?? SEV_ICON.info;
        const onDom = err.field ? actions.fieldOnDom(err.field) : false;
        const label = err.field ? actions.labelFor(err.field) : 'Hồ sơ';
        return (
          <button
            key={i}
            class="og-result-item"
            data-clickable={onDom ? '1' : undefined}
            disabled={!onDom}
            onClick={() => onDom && err.field && actions.onFieldClick(err.field)}
          >
            <span class="og-result-label">
              <span class={sev.cls}>{sev.icon}</span>
              <span>
                {label}
                {err.source === 'llm' && <span class="og-badge-ai"> AI</span>}
                {err.field && !onDom && <span class="og-elsewhere"> (ở bước khác)</span>}
              </span>
            </span>
            <div class="og-result-msg">{err.message}</div>
            {err.suggestion && <div class="og-result-sug">→ Gợi ý: {err.suggestion}</div>}
          </button>
        );
      })}
      <div class="og-result-scope">
        Kết quả dựa trên thông tin trên form. Đã kiểm tra {res.checked_fields} trường có quy tắc.
        {!res.llm_available && ' Bước kiểm tra ngữ nghĩa bằng AI được bỏ qua.'}
      </div>
      <div class="og-chips">
        {res.no_case_facts && (
          <button class="og-chip" onClick={() => actions.onTellMore()}>
            Kể thêm tình huống để kiểm tra sâu hơn
          </button>
        )}
        {recheck}
      </div>
    </div>
  );
}

export function TurnView({
  turn,
  turnIndex,
  streaming,
  actions,
  prevCards = [],
  showChips = false,
}: {
  turn: Turn;
  turnIndex: number;
  /** true only for the live turn while tokens are arriving. */
  streaming: boolean;
  actions: TurnActions;
  /** Cards of the nearest earlier assistant turn — identical cards are not re-rendered. */
  prevCards?: Card[];
  /** Pha 2: chips render only on the LAST assistant turn while idle (§5.2). */
  showChips?: boolean;
}) {
  if (turn.role === 'user') {
    return <div class="og-turn-user">{turn.prose}</div>;
  }
  if (turn.role === 'notice') {
    return <div class="og-notice">{turn.prose}</div>;
  }
  if (turn.role === 'check' && turn.check) {
    return (
      <div class="og-turn-assistant">
        <CheckResultView res={turn.check} actions={actions} />
      </div>
    );
  }
  if (turn.role === 'prefill' && turn.prefill) {
    const pf = turn.prefill;
    return (
      <div class="og-turn-assistant">
        <div class="og-card">
          <div class="og-result-head">📝 Đã điền {pf.rows.length} trường từ hội thoại</div>
          {pf.rows.map((r, i) => (
            <div key={i} class="og-card-sub">
              {r.label}: {r.value}
            </div>
          ))}
          <div class="og-result-scope">
            Anh/chị kiểm tra lại trước khi nộp — ô được điền hộ có viền màu.
          </div>
          {pf.undone ? (
            <div class="og-card-sub">Đã hoàn tác.</div>
          ) : (
            <button class="og-link-btn" onClick={() => actions.onUndoPrefill(turnIndex)}>
              Hoàn tác toàn bộ
            </button>
          )}
        </div>
      </div>
    );
  }

  // assistant turn: prose + (revealed) cards + optional error box.
  // noRetry (422) turns carry their message in `prose` but render it inside
  // the error box only.
  const hasProse = turn.prose.length > 0 && !turn.noRetry;
  const shownCards = visibleCards(prevCards, turn.cards);
  return (
    <div class="og-turn-assistant">
      {hasProse && (
        <div
          class={streaming ? 'og-prose og-cursor' : 'og-prose'}
          dangerouslySetInnerHTML={{ __html: miniMarkdown(turn.prose) }}
        />
      )}
      {(turn.retry || turn.noRetry) && (
        <div class="og-error-box">
          {turn.noRetry ? turn.prose : 'Không kết nối được với trợ lý.'}
          {turn.retry && (
            <div>
              <button class="og-retry" onClick={() => actions.onRetry(turnIndex, turn.retry!)}>
                Thử lại
              </button>
            </div>
          )}
        </div>
      )}
      {turn.revealed && shownCards.length > 0 && (
        <div class="og-cards">
          {shownCards.map(({ card, ci }) => (
            <CardView
              key={ci}
              card={card}
              cardIndex={ci}
              ticks={turn.ticks}
              onTick={(key) => actions.onTick(turnIndex, key)}
              onGuide={actions.onGuide}
              guideOnDom={actions.guideOnDom}
            />
          ))}
        </div>
      )}
      {showChips && turn.revealed && (turn.chips?.length ?? 0) > 0 && (
        <div class="og-chips">
          {turn.chips!.map((c) => (
            <button key={c} class="og-chip" onClick={() => actions.onChip(c)}>
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
