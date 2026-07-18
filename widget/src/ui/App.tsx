// Root component: bubble/panel shell, chat state machine (WIDGET.md §5.1),
// detection scheduler, validate flow (§6), UX states (§7), session restore (§8).
import { render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import styles from './styles.css?inline';
import type {
  ChatEvent,
  DetectState,
  EmbedConfig,
  Health,
  SchemaIndexEntry,
  Turn,
  ValidationError,
} from '../types';
import { captureFields, fieldLabel, findField, pickMainForm } from '../core/capture';
import { detect } from '../core/detect';
import { startDetectLoop } from '../core/scheduler';
import { postChat } from '../core/sse';
import {
  clearCurrentSession,
  getOpen,
  getSid,
  loadTranscript,
  saveTranscript,
  setOpen as storeOpen,
  setSid,
} from '../core/store';
import {
  createSession,
  fetchHealth,
  fetchSchemas,
  fetchSession,
  postValidate,
} from '../core/api';
import { TurnView, type TurnActions } from './Turn';

const TOOL_LABELS: Record<string, string> = {
  search_procedures: 'Đang tìm thủ tục phù hợp…',
  get_procedure: 'Đang đọc dữ liệu thủ tục…',
  get_form_schema: 'Đang xem quy tắc biểu mẫu…',
  update_case_facts: 'Đang ghi nhớ tình huống của bạn…',
};
const TOOL_FALLBACK = 'Đang tra cứu…';

const STATIC_CHIPS = [
  'Tôi muốn đăng ký thường trú',
  'Phí thành lập doanh nghiệp tư nhân?',
  'Thủ tục này cần giấy tờ gì?',
];

const SEV_ORDER: Record<ValidationError['severity'], number> = { error: 0, warning: 1, info: 2 };

const emptyAssistant = (): Turn => ({
  role: 'assistant',
  prose: '',
  cards: [],
  ticks: {},
  revealed: false,
});

/** ~38% darker accent for --og-accent-dark when data-accent overrides the default. */
function darken(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#903938';
  const n = parseInt(m[1]!, 16);
  const f = (x: number) => Math.round(x * 0.62);
  const rgb = (f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255);
  return `#${rgb.toString(16).padStart(6, '0')}`;
}

const isMobile = (): boolean => matchMedia('(max-width: 640px)').matches;

export function mountApp(shadow: ShadowRoot, config: EmbedConfig): void {
  const host = shadow.host as HTMLElement;
  if (config.accent) {
    host.style.setProperty('--og-accent', config.accent);
    host.style.setProperty('--og-accent-dark', darken(config.accent));
  }
  const style = document.createElement('style');
  style.textContent = styles;
  shadow.appendChild(style);
  const root = document.createElement('div');
  shadow.appendChild(root);
  render(<App config={config} />, root);
}

function App({ config }: { config: EmbedConfig }) {
  const backend = config.backend;
  // config.scope: parsed, reserved — no Pha 1 behavior (§1).

  const [open, setOpenState] = useState<boolean>(getOpen());
  const [turns, setTurns] = useState<Turn[]>([]);
  const [phase, setPhase] = useState<'idle' | 'waiting' | 'streaming'>('idle');
  const [toolLabel, setToolLabel] = useState<string | null>(null);
  const [health, setHealth] = useState<Health | 'offline' | null>(null);
  const [det, setDet] = useState<DetectState>({ kind: 'NONE' });
  const [placeholder, setPlaceholder] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const sidRef = useRef<string | null>(getSid());
  const schemasRef = useRef<SchemaIndexEntry[] | null>(null);
  const caseCodeRef = useRef<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busyRef = useRef(false); // one request per turn (§5.1)

  const rescan = (): void =>
    setDet(detect(schemasRef.current ?? [], document, location.pathname, caseCodeRef.current));

  // --- boot: restore transcript (§8), load schema index, start detect loop ---
  useEffect(() => {
    const sid = sidRef.current;
    if (sid) {
      const cached = loadTranscript(sid);
      if (cached) {
        setTurns(cached);
      } else {
        // cache lost/corrupt → text-only rebuild from the server; 404 → silent new session
        fetchSession(backend, sid).then((state) => {
          if (!state) return;
          caseCodeRef.current = (state.case_facts?.procedure_code as string) ?? null;
          if (!state.messages.length) return; // empty server history → plain welcome
          setTurns([
            { role: 'notice', prose: 'Khôi phục lịch sử rút gọn.', cards: [], ticks: {}, revealed: true },
            ...state.messages.map(
              (m): Turn => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                prose: m.content,
                cards: [],
                ticks: {},
                revealed: true,
              }),
            ),
          ]);
        });
      }
    }
    fetchSchemas(backend).then((schemas) => {
      schemasRef.current = schemas;
      rescan();
    });
    return startDetectLoop(rescan);
  }, []);

  // --- panel open: health check (refresh if it failed before), schemas retry (§3.1, §6.1) ---
  useEffect(() => {
    if (!open) return;
    if (health === null || health === 'offline') {
      fetchHealth(backend).then((h) => setHealth(h ?? 'offline'));
    }
    if (schemasRef.current === null) {
      fetchSchemas(backend).then((schemas) => {
        if (schemas) {
          schemasRef.current = schemas;
          rescan();
        }
      });
    }
  }, [open]);

  // --- persist on any turns change (debounced) — covers post-turn tick toggles too ---
  const turnsRef = useRef(turns);
  turnsRef.current = turns;
  useEffect(() => {
    if (!sidRef.current || !turns.length) return;
    const t = setTimeout(() => saveTranscript(sidRef.current!, turns), 300);
    return () => clearTimeout(t);
  }, [turns]);
  // navigating away right after a turn must not lose it (§8) — flush the debounce
  useEffect(() => {
    const flush = (): void => {
      if (sidRef.current && turnsRef.current.length) {
        saveTranscript(sidRef.current, turnsRef.current);
      }
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  // --- keep scrolled to the end (also restores end position after reopen/reload) ---
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, phase, toolLabel, open]);

  const setOpen = (v: boolean): void => {
    setOpenState(v);
    storeOpen(v);
  };

  const updateLast = (fn: (t: Turn) => Turn): void =>
    setTurns((prev) =>
      prev.length ? [...prev.slice(0, -1), fn(prev[prev.length - 1]!)] : prev,
    );

  // --- chat turn (§5.1) ---
  const send = (message: string, addUserTurn = true): void => {
    const text = message.trim();
    if (!text || busyRef.current) return;
    busyRef.current = true;
    setPlaceholder(null);
    setDraft('');
    setTurns((prev) => [
      ...prev,
      ...(addUserTurn
        ? [{ role: 'user', prose: text, cards: [], ticks: {}, revealed: true } as Turn]
        : []),
      emptyAssistant(),
    ]);
    setPhase('waiting');
    setToolLabel(null);

    let sawError = false;
    void postChat(
      backend,
      { session_id: sidRef.current ?? undefined, message: text },
      {
        onEvent: (evt: ChatEvent) => {
          switch (evt.type) {
            case 'session':
              if (!sidRef.current) {
                sidRef.current = evt.session_id;
                setSid(evt.session_id);
              }
              break;
            case 'tool':
              setToolLabel(TOOL_LABELS[evt.name] ?? TOOL_FALLBACK);
              break;
            case 'card':
              updateLast((t) => ({ ...t, cards: [...t.cards, evt.payload] }));
              break;
            case 'token':
              setPhase('streaming');
              updateLast((t) => ({ ...t, prose: t.prose + evt.text }));
              break;
            case 'warning':
              console.debug('[OpenGOV] guard:', evt.message);
              break;
            case 'done':
              console.debug('[OpenGOV] done, cards:', evt.cards_count);
              break;
            case 'error':
              sawError = true;
              updateLast((t) => ({ ...t, retry: { action: 'chat', message: text } }));
              break;
            default:
              break; // unknown event type → silently ignored (§5.5)
          }
        },
        onEnd: () => {
          busyRef.current = false;
          setPhase('idle');
          setToolLabel(null);
          setTurns((prev) => {
            const last = prev[prev.length - 1];
            if (!last || last.role !== 'assistant') return prev;
            // `event: end` with nothing streamed and no error → empty turn, drop it
            if (!last.prose && !last.cards.length && !last.retry && !sawError) {
              return prev.slice(0, -1);
            }
            return [...prev.slice(0, -1), { ...last, revealed: true }];
          });
        },
        onError: () => {
          busyRef.current = false;
          setPhase('idle');
          setToolLabel(null);
          updateLast((t) => ({
            ...t,
            revealed: true,
            retry: { action: 'chat', message: text },
          }));
        },
      },
    );
  };

  // --- "Kiểm tra hồ sơ" (§6.3–6.4) ---
  const runCheck = async (): Promise<void> => {
    if (det.kind !== 'DETECTED_READY' || busyRef.current) return;
    const schema = det.schema;
    busyRef.current = true;
    setPhase('waiting');
    setToolLabel('Đang kiểm tra hồ sơ…');

    const fields = captureFields(pickMainForm(document, schema.field_keys));
    let caseFacts: Record<string, unknown> = {};
    if (sidRef.current) {
      const state = await fetchSession(backend, sidRef.current);
      if (state?.case_facts) {
        caseFacts = state.case_facts;
        caseCodeRef.current = (caseFacts.procedure_code as string) ?? caseCodeRef.current;
      }
    }
    const result = await postValidate(backend, {
      procedure_code: schema.procedure_code,
      fields,
      case_facts: caseFacts,
    });

    busyRef.current = false;
    setPhase('idle');
    setToolLabel(null);
    const push = (t: Turn): void => setTurns((prev) => [...prev, t]);
    if (result.kind === 'ok') {
      const sorted = [...result.errors].sort(
        (a, b) => (SEV_ORDER[a.severity] ?? 2) - (SEV_ORDER[b.severity] ?? 2),
      );
      push({
        role: 'check',
        prose: '',
        cards: [],
        ticks: {},
        revealed: true,
        check: {
          procedure_code: schema.procedure_code,
          errors: sorted,
          checked_fields: schema.field_keys.length,
          llm_available: typeof health === 'object' && health !== null && health.llm_available,
          no_case_facts: Object.keys(caseFacts).length === 0,
        },
      });
    } else if (result.kind === 'schema_error') {
      push({ role: 'assistant', prose: result.message, cards: [], ticks: {}, revealed: true, noRetry: true });
    } else {
      push({ role: 'assistant', prose: '', cards: [], ticks: {}, revealed: true, retry: { action: 'check' } });
    }
  };

  // --- new session (§8) ---
  const newSession = (): void => {
    if (busyRef.current) return;
    clearCurrentSession();
    sidRef.current = null;
    caseCodeRef.current = null;
    setTurns([]);
    // failure is fine: /chat mints an id via its `session` event
    void createSession(backend).then((id) => {
      if (id && !sidRef.current) {
        sidRef.current = id;
        setSid(id);
      }
    });
  };

  // --- scroll-to-field with transient highlight (§6.4) ---
  const scrollToField = (field: string): void => {
    const el = findField(document, field) as HTMLElement | null;
    if (!el) return;
    const accent = config.accent ?? '#ce7a58';
    const go = (): void => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      try {
        el.focus({ preventScroll: true });
      } catch {
        /* non-focusable */
      }
      el.animate(
        [
          { outline: `3px solid ${accent}`, outlineOffset: '2px' },
          { outline: '3px solid transparent', outlineOffset: '2px' },
        ],
        { duration: 2000, easing: 'ease-out' },
      );
    };
    if (isMobile() && open) {
      setOpen(false); // full-screen sheet covers the form: minimize first
      setTimeout(go, 250);
    } else {
      go();
    }
  };

  const actions: TurnActions = {
    onTick: (turnIndex, key) =>
      setTurns((prev) =>
        prev.map((t, i) =>
          i === turnIndex ? { ...t, ticks: { ...t.ticks, [key]: !t.ticks[key] } } : t,
        ),
      ),
    onRetry: (turnIndex, retry) => {
      setTurns((prev) => prev.filter((_, i) => i !== turnIndex));
      if (retry.action === 'chat') send(retry.message, false);
      else void runCheck();
    },
    onFieldClick: scrollToField,
    onTellMore: () => {
      setPlaceholder('VD: Tôi thuê nhà, muốn đăng ký vào nhà thuê');
      inputRef.current?.focus();
    },
    onRecheck: () => void runCheck(),
    fieldOnDom: (field) => !!findField(document, field),
    labelFor: (field) => fieldLabel(document, field) ?? field,
  };

  const checkReady = det.kind === 'DETECTED_READY';
  const idle = phase === 'idle';
  const degraded = typeof health === 'object' && health !== null && !health.llm_available;

  if (!open) {
    return (
      <button class="og-bubble" onClick={() => setOpen(true)} aria-label="Mở trợ lý thủ tục">
        💬
        {checkReady && <span class="og-badge" />}
      </button>
    );
  }

  return (
    <div class="og-panel">
      <div class="og-header">
        <span class="og-header-title">OpenGOV — Trợ lý thủ tục</span>
        <button title="Cuộc mới" aria-label="Cuộc mới" onClick={newSession}>
          ⟳
        </button>
        <button title="Thu nhỏ" aria-label="Thu nhỏ" onClick={() => setOpen(false)}>
          ─
        </button>
        <button title="Đóng" aria-label="Đóng" onClick={() => setOpen(false)}>
          ✕
        </button>
      </div>

      {health === 'offline' && (
        <div class="og-banner og-banner-offline">
          ⚠ Không kết nối được với máy chủ trợ lý.
          <button onClick={() => fetchHealth(backend).then((h) => setHealth(h ?? 'offline'))}>
            Thử lại
          </button>
        </div>
      )}
      {degraded && (
        <div class="og-banner">
          ⚠ Chế độ giới hạn: hỏi đáp AI tạm nghỉ, kiểm tra hồ sơ vẫn hoạt động.
        </div>
      )}

      <div class="og-transcript" ref={transcriptRef}>
        {turns.length === 0 && (
          <div class="og-turn-assistant">
            <div class="og-prose">Chào anh/chị! Tôi giúp gì được về thủ tục hành chính?</div>
          </div>
        )}
        {turns.map((turn, i) => (
          <TurnView
            key={i}
            turn={turn}
            turnIndex={i}
            streaming={phase === 'streaming' && i === turns.length - 1}
            actions={actions}
          />
        ))}
        {turns.length === 0 && idle && (
          <div class="og-chips">
            {STATIC_CHIPS.map((chip) => (
              <button key={chip} class="og-chip" onClick={() => send(chip)}>
                {chip}
              </button>
            ))}
            {checkReady && (
              <button class="og-chip" onClick={() => void runCheck()}>
                ✓ Kiểm tra hồ sơ trang này
              </button>
            )}
          </div>
        )}
        {phase === 'waiting' && (
          <div class="og-waiting">
            <span class="og-spinner" />
            {toolLabel ?? 'Đang xử lý…'}
          </div>
        )}
      </div>

      {det.kind !== 'NONE' && (
        <div class="og-checkrow">
          <button
            class="og-checkbtn"
            disabled={!checkReady || !idle}
            title={det.kind === 'DETECTED_NOFIELDS' ? 'Mở bước Tờ khai để kiểm tra' : undefined}
            onClick={() => void runCheck()}
          >
            ✓ Kiểm tra hồ sơ
          </button>
        </div>
      )}

      <div class="og-composer">
        <textarea
          ref={inputRef}
          class="og-input"
          rows={1}
          placeholder={placeholder ?? 'Nhập câu hỏi…'}
          value={draft}
          disabled={!idle}
          onInput={(e) => setDraft((e.target as HTMLTextAreaElement).value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(draft);
            }
          }}
        />
        <button class="og-send" disabled={!idle || !draft.trim()} onClick={() => send(draft)}>
          Gửi
        </button>
      </div>
    </div>
  );
}
