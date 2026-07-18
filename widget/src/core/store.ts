// Client-side session persistence (WIDGET.md §8). sessionStorage is per-tab:
// multiple tabs = independent sessions, by design. Every access is wrapped —
// storage can throw (privacy modes, quota) and the widget must never break
// the host page over it.
import type { TranscriptCache, Turn } from '../types';

const SID_KEY = 'og.sid';
const OPEN_KEY = 'og.open';
const MAX_TURNS = 30;

const transcriptKey = (sid: string): string => `og.transcript.${sid}`;

function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function getSid(): string | null {
  try {
    return storage()?.getItem(SID_KEY) ?? null;
  } catch {
    return null;
  }
}

export function setSid(id: string): void {
  try {
    storage()?.setItem(SID_KEY, id);
  } catch {
    /* non-fatal */
  }
}

/** "Cuộc mới": drop the id and its transcript. */
export function clearCurrentSession(): void {
  const s = storage();
  if (!s) return;
  try {
    const sid = s.getItem(SID_KEY);
    if (sid) s.removeItem(transcriptKey(sid));
    s.removeItem(SID_KEY);
  } catch {
    /* non-fatal */
  }
}

export function getOpen(): boolean {
  try {
    return storage()?.getItem(OPEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function setOpen(open: boolean): void {
  try {
    storage()?.setItem(OPEN_KEY, open ? '1' : '0');
  } catch {
    /* non-fatal */
  }
}

/** null on missing, corrupt JSON, or unknown cache version. */
export function loadTranscript(sid: string): Turn[] | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(transcriptKey(sid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TranscriptCache;
    if (parsed?.v !== 1 || !Array.isArray(parsed.turns)) return null;
    return parsed.turns;
  } catch {
    return null;
  }
}

/**
 * Truncate to the last ~30 turns BEFORE writing so the write (almost) always
 * fits; on quota error retry with 10, then give up silently.
 */
export function saveTranscript(sid: string, turns: Turn[]): void {
  const s = storage();
  if (!s) return;
  const write = (slice: Turn[]): void =>
    s.setItem(transcriptKey(sid), JSON.stringify({ v: 1, turns: slice } satisfies TranscriptCache));
  try {
    write(turns.slice(-MAX_TURNS));
  } catch {
    try {
      write(turns.slice(-10));
    } catch {
      /* quota exhausted: skip this write */
    }
  }
}
