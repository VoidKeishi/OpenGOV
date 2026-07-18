// SSE-over-POST client for /chat (WIDGET.md §3.3). EventSource can't POST, so:
// fetch + ReadableStream. Real wire format (backend as-built): ordinary events
// are bare `data: <JSON>\n\n` blocks (no `event:` line, `type` is inside the
// JSON); the terminator is `event: end\ndata: {}\n\n`.
import type { ChatEvent } from '../types';

export const CHAT_TIMEOUT_MS = 30_000;

export interface SseCallbacks {
  onEvent(evt: ChatEvent): void;
  onEnd(): void;
  /** timeout = 30s with no event (§3.3c); network = fetch/HTTP/stream failure. */
  onError(kind: 'timeout' | 'network'): void;
}

/** Pure incremental parser: feed decoded chunks, get JSON blocks + end signal. */
export function createSseParser(
  onData: (json: Record<string, unknown>) => void,
  onEnd: () => void,
): { push(chunk: string): void } {
  let buffer = '';

  const handleBlock = (block: string): void => {
    let isEnd = false;
    const dataLines: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) {
        if (line.slice(6).trim() === 'end') isEnd = true;
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).replace(/^ /, ''));
      }
    }
    if (isEnd) {
      onEnd();
      return;
    }
    if (!dataLines.length) return;
    try {
      const parsed: unknown = JSON.parse(dataLines.join('\n'));
      if (parsed && typeof parsed === 'object') onData(parsed as Record<string, unknown>);
    } catch {
      // Malformed block: drop it, keep reading (§5.5).
    }
  };

  return {
    push(chunk: string): void {
      buffer += chunk;
      let idx: number;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        if (block.trim()) handleBlock(block);
      }
    },
  };
}

/**
 * One chat turn. Resolves after exactly one terminal callback:
 * onEnd (server sent `event: end`) or onError. The watchdog re-arms on every
 * event — `tool` events are the keep-alive during the 5–20s agent loop.
 * A stream that closes without `event: end` is a broken stream → network error.
 */
export async function postChat(
  backend: string,
  body: { session_id?: string; message: string },
  cb: SseCallbacks,
  timeoutMs = CHAT_TIMEOUT_MS,
): Promise<void> {
  const ac = new AbortController();
  let timedOut = false;
  let done = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const arm = (): void => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timedOut = true;
      ac.abort();
    }, timeoutMs);
  };

  const parser = createSseParser(
    (json) => {
      arm();
      if (!done) cb.onEvent(json as unknown as ChatEvent);
    },
    () => {
      if (!done) {
        done = true;
        cb.onEnd();
      }
    },
  );

  arm();
  try {
    const res = await fetch(`${backend}/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    for (;;) {
      const { done: eof, value } = await reader.read();
      if (eof) break;
      parser.push(decoder.decode(value, { stream: true }));
      if (done) {
        reader.cancel().catch(() => {});
        break;
      }
    }
    if (!done) {
      done = true;
      cb.onError('network'); // stream closed mid-turn without `event: end`
    }
  } catch {
    if (!done) {
      done = true;
      cb.onError(timedOut ? 'timeout' : 'network');
    }
  } finally {
    clearTimeout(timer);
  }
}
