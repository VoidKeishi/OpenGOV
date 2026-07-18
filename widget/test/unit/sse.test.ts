// SSE parser + postChat lifecycle (WIDGET.md §3.3, §5.5): real wire framing,
// malformed-block tolerance, 30s no-event watchdog.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSseParser, postChat } from '../../src/core/sse';
import type { ChatEvent } from '../../src/types';

function collectParser() {
  const events: unknown[] = [];
  let ended = 0;
  const parser = createSseParser(
    (json) => events.push(json),
    () => ended++,
  );
  return { parser, events, ended: () => ended };
}

describe('createSseParser', () => {
  it('parses `data: <JSON>` blocks and the `event: end` terminator', () => {
    const { parser, events, ended } = collectParser();
    parser.push('data: {"type":"session","session_id":"abc"}\n\n');
    parser.push('data: {"type":"token","text":"xin chào"}\n\nevent: end\ndata: {}\n\n');
    expect(events).toEqual([
      { type: 'session', session_id: 'abc' },
      { type: 'token', text: 'xin chào' },
    ]);
    expect(ended()).toBe(1);
  });

  it('handles blocks split across arbitrary chunk boundaries', () => {
    const { parser, events } = collectParser();
    const wire = 'data: {"type":"token","text":"một hai"}\n\ndata: {"type":"done","cards_count":0}\n\n';
    for (const ch of wire) parser.push(ch);
    expect(events).toEqual([
      { type: 'token', text: 'một hai' },
      { type: 'done', cards_count: 0 },
    ]);
  });

  it('drops a malformed JSON block and keeps reading (§5.5)', () => {
    const { parser, events, ended } = collectParser();
    parser.push('data: {not json}\n\ndata: {"type":"token","text":"ok"}\n\nevent: end\ndata: {}\n\n');
    expect(events).toEqual([{ type: 'token', text: 'ok' }]);
    expect(ended()).toBe(1);
  });

  it('card events keep the double nesting for the caller to unwrap', () => {
    const { parser, events } = collectParser();
    parser.push('data: {"type":"card","payload":{"type":"fees","payload":{"code":"1.004222"}}}\n\n');
    expect(events).toEqual([
      { type: 'card', payload: { type: 'fees', payload: { code: '1.004222' } } },
    ]);
  });
});

// --- postChat with a mocked fetch stream ---

function streamingFetch(
  script: (controller: ReadableStreamDefaultController<Uint8Array>) => void,
  { autoClose = false } = {},
) {
  return vi.fn(async (_url: unknown, init?: RequestInit) => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        init?.signal?.addEventListener('abort', () => {
          try {
            controller.error(new DOMException('aborted', 'AbortError'));
          } catch {
            /* already closed */
          }
        });
        script(controller);
        if (autoClose) controller.close();
      },
    });
    return { ok: true, status: 200, body } as Response;
  });
}

const enc = (s: string) => new TextEncoder().encode(s);

function callbacks() {
  return {
    events: [] as ChatEvent[],
    endCount: 0,
    errors: [] as string[],
    onEvent(evt: ChatEvent) {
      this.events.push(evt);
    },
    onEnd() {
      this.endCount++;
    },
    onError(kind: 'timeout' | 'network') {
      this.errors.push(kind);
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('postChat', () => {
  it('forwards events then onEnd on `event: end`', async () => {
    const cb = callbacks();
    vi.stubGlobal(
      'fetch',
      streamingFetch((c) => {
        c.enqueue(enc('data: {"type":"session","session_id":"s1"}\n\n'));
        c.enqueue(enc('data: {"type":"token","text":"chào"}\n\nevent: end\ndata: {}\n\n'));
      }),
    );
    await postChat('http://x', { message: 'hỏi' }, cb);
    expect(cb.events.map((e) => e.type)).toEqual(['session', 'token']);
    expect(cb.endCount).toBe(1);
    expect(cb.errors).toEqual([]);
  });

  it('stream closing without `event: end` → network error (broken stream)', async () => {
    const cb = callbacks();
    vi.stubGlobal(
      'fetch',
      streamingFetch((c) => c.enqueue(enc('data: {"type":"token","text":"nửa chừng"}\n\n')), {
        autoClose: true,
      }),
    );
    await postChat('http://x', { message: 'hỏi' }, cb);
    expect(cb.errors).toEqual(['network']);
    expect(cb.endCount).toBe(0);
  });

  it('non-OK HTTP response → network error', async () => {
    const cb = callbacks();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 502, body: null }) as Response));
    await postChat('http://x', { message: 'hỏi' }, cb);
    expect(cb.errors).toEqual(['network']);
  });

  it('fetch rejection → network error', async () => {
    const cb = callbacks();
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))));
    await postChat('http://x', { message: 'hỏi' }, cb);
    expect(cb.errors).toEqual(['network']);
  });

  it('30s with no event → abort + timeout error', async () => {
    vi.useFakeTimers();
    const cb = callbacks();
    vi.stubGlobal('fetch', streamingFetch(() => {})); // stream never produces
    const turn = postChat('http://x', { message: 'hỏi' }, cb);
    await vi.advanceTimersByTimeAsync(30_001);
    await turn;
    expect(cb.errors).toEqual(['timeout']);
  });

  it('events re-arm the watchdog — a tool event at 29s buys another 30s', async () => {
    vi.useFakeTimers();
    const cb = callbacks();
    let ctrl!: ReadableStreamDefaultController<Uint8Array>;
    vi.stubGlobal(
      'fetch',
      streamingFetch((c) => {
        ctrl = c;
      }),
    );
    const turn = postChat('http://x', { message: 'hỏi' }, cb);
    await vi.advanceTimersByTimeAsync(29_000);
    ctrl.enqueue(enc('data: {"type":"tool","name":"get_procedure","args":{}}\n\n'));
    await vi.advanceTimersByTimeAsync(29_000); // 58s wall clock, but only 29s since last event
    expect(cb.errors).toEqual([]);
    ctrl.enqueue(enc('event: end\ndata: {}\n\n'));
    await vi.advanceTimersByTimeAsync(1);
    await turn;
    expect(cb.endCount).toBe(1);
    expect(cb.errors).toEqual([]);
  });
});
