// Phase-2 web components (WIDGET.md §12.3): <opengov-field-hint> and
// <opengov-check-button>. Defined once at mount from the same bundle as the
// panel; the portal only writes markup. Each element owns a small shadow root;
// they talk to the panel exclusively over the internal bus.
import type { CheckTurnResult, EmbedConfig, SchemaIndexEntry, ValidationError } from './types';
import { fetchHealth, fetchSchemas, fetchSession, postValidate } from './core/api';
import { captureFields, pickMainForm } from './core/capture';
import { detect } from './core/detect';
import { EV_CHECK_RESULT, EV_PANEL_CHECK, emit, on } from './core/bus';
import { getSid } from './core/store';

let cfg: EmbedConfig | null = null;
let schemasPromise: Promise<SchemaIndexEntry[] | null> | null = null;
let llmAvailablePromise: Promise<boolean> | null = null;

const schemas = (): Promise<SchemaIndexEntry[] | null> =>
  (schemasPromise ??= fetchSchemas(cfg!.backend));
const llmAvailable = (): Promise<boolean> =>
  (llmAvailablePromise ??= fetchHealth(cfg!.backend).then((h) => !!h?.llm_available));

interface ValidateRun {
  schema: SchemaIndexEntry;
  errors: ValidationError[];
  noCaseFacts: boolean;
}

/** Detect the page's schema, capture the current step, POST /validate. */
async function runValidate(): Promise<ValidateRun | 'not_ready' | 'failed'> {
  if (!cfg) return 'failed';
  const list = (await schemas()) ?? [];
  const det = detect(list, document, location.pathname, null);
  if (det.kind !== 'DETECTED_READY') return 'not_ready';
  const schema = det.schema;
  const fields = captureFields(pickMainForm(document, schema.field_keys));
  let caseFacts: Record<string, unknown> = {};
  const sid = getSid();
  if (sid) caseFacts = (await fetchSession(cfg.backend, sid))?.case_facts ?? {};
  const res = await postValidate(cfg.backend, {
    procedure_code: schema.procedure_code,
    fields,
    case_facts: caseFacts,
  });
  if (res.kind !== 'ok') return 'failed';
  return { schema, errors: res.errors, noCaseFacts: Object.keys(caseFacts).length === 0 };
}

const SEV_ORDER: Record<ValidationError['severity'], number> = { error: 0, warning: 1, info: 2 };

const HINT_CSS = `
:host { display: block; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 12.5px; line-height: 1.45; }
.err { color: #b91c1c; margin-top: 4px; }
.err strong { font-weight: 700; }
.sug { color: #6b7280; }
.hint { color: #6b7280; margin-top: 4px; }
`;

/**
 * Inline hint/error next to one field. Validates on that field's blur
 * (debounced) and renders errors distributed by <opengov-check-button>.
 * Listens on document `focusout` (delegated) so it survives React remounts
 * of the input it annotates.
 */
class OpengovFieldHint extends HTMLElement {
  private box!: HTMLDivElement;
  private offBus: (() => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly onFocusOut = (e: Event): void => {
    const target = e.target as Element | null;
    if (!target || target.getAttribute?.('name') !== this.getAttribute('field')) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.validateSelf(), 400);
  };

  connectedCallback(): void {
    if (!this.shadowRoot) {
      const root = this.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = HINT_CSS;
      this.box = document.createElement('div');
      root.append(style, this.box);
    }
    this.renderErrors([]);
    document.addEventListener('focusout', this.onFocusOut);
    this.offBus = on(EV_CHECK_RESULT, (data) => {
      const { errors } = data as { errors: ValidationError[] };
      this.renderErrors(errors.filter((e) => e.field === this.getAttribute('field')));
    });
  }

  disconnectedCallback(): void {
    document.removeEventListener('focusout', this.onFocusOut);
    clearTimeout(this.timer);
    this.offBus?.();
    this.offBus = null;
  }

  private async validateSelf(): Promise<void> {
    const run = await runValidate();
    if (run === 'not_ready' || run === 'failed') return; // stay silent — panel paths own error UX
    this.renderErrors(run.errors.filter((e) => e.field === this.getAttribute('field')));
  }

  private renderErrors(errors: ValidationError[]): void {
    this.box.textContent = '';
    if (!errors.length) {
      const hint = this.getAttribute('hint');
      if (hint) {
        const div = document.createElement('div');
        div.className = 'hint';
        div.textContent = hint;
        this.box.appendChild(div);
      }
      return;
    }
    for (const err of [...errors].sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity])) {
      const div = document.createElement('div');
      div.className = 'err';
      const msg = document.createElement('strong');
      msg.textContent = `✕ ${err.message}`;
      div.appendChild(msg);
      if (err.suggestion) {
        const sug = document.createElement('div');
        sug.className = 'sug';
        sug.textContent = `→ ${err.suggestion}`;
        div.appendChild(sug);
      }
      this.box.appendChild(div);
    }
  }
}

const BTN_CSS = `
:host { display: inline-block; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
button { font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;
  padding: 9px 18px; border-radius: 8px; border: 1px solid var(--og-c, #ce7a58);
  color: var(--og-cd, #903938); background: #fff; }
button:hover:not(:disabled) { background: #faf1ed; }
button:disabled { cursor: wait; opacity: .6; }
.ok { color: #2e7d32; border-color: #2e7d32; }
`;

/**
 * Whole-form check next to the portal's submit button. Errors land inline in
 * the field-hints present on the page; errors without a hint (or pages with no
 * hints at all) fall back to the chat panel over the bus (§12.3).
 */
class OpengovCheckButton extends HTMLElement {
  private btn!: HTMLButtonElement;
  private resetTimer: ReturnType<typeof setTimeout> | undefined;

  connectedCallback(): void {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = BTN_CSS;
    if (cfg?.accent) {
      this.style.setProperty('--og-c', cfg.accent);
      this.style.setProperty('--og-cd', cfg.accent);
    }
    this.btn = document.createElement('button');
    this.btn.type = 'button';
    this.btn.textContent = '✓ Kiểm tra hồ sơ';
    this.btn.addEventListener('click', () => void this.check());
    root.append(style, this.btn);
  }

  private setLabel(text: string, cls = '', resetMs = 0): void {
    clearTimeout(this.resetTimer);
    this.btn.textContent = text;
    this.btn.className = cls;
    if (resetMs) {
      this.resetTimer = setTimeout(() => this.setLabel('✓ Kiểm tra hồ sơ'), resetMs);
    }
  }

  private async check(): Promise<void> {
    this.btn.disabled = true;
    this.setLabel('Đang kiểm tra…');
    const run = await runValidate();
    this.btn.disabled = false;
    if (run === 'not_ready' || run === 'failed') {
      this.setLabel(run === 'failed' ? 'Không kiểm tra được — thử lại' : 'Mở bước Tờ khai để kiểm tra', '', 3000);
      return;
    }
    this.setLabel('✓ Kiểm tra hồ sơ');

    const hintFields = new Set(
      [...document.querySelectorAll('opengov-field-hint')]
        .map((el) => el.getAttribute('field'))
        .filter(Boolean) as string[],
    );
    // Every hint re-renders from this broadcast (including clearing to zero).
    emit(EV_CHECK_RESULT, { errors: run.errors });

    const leftover = hintFields.size
      ? run.errors.filter((e) => !e.field || !hintFields.has(e.field))
      : run.errors;
    if (leftover.length) {
      const result: CheckTurnResult = {
        procedure_code: run.schema.procedure_code,
        errors: [...leftover].sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]),
        checked_fields: run.schema.field_keys.length,
        llm_available: await llmAvailable(),
        no_case_facts: run.noCaseFacts,
      };
      emit(EV_PANEL_CHECK, result);
    } else if (!run.errors.length) {
      this.setLabel('✓ Không phát hiện lỗi', 'ok', 3000);
    }
  }
}

/** Idempotent — safe to call on every boot (double-define throws otherwise). */
export function defineComponents(config: EmbedConfig): void {
  cfg = config;
  if (!customElements.get('opengov-field-hint')) {
    customElements.define('opengov-field-hint', OpengovFieldHint);
  }
  if (!customElements.get('opengov-check-button')) {
    customElements.define('opengov-check-button', OpengovCheckButton);
  }
}
