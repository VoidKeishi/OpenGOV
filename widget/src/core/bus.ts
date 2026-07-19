// Tiny pub/sub shared inside the bundle (WIDGET.md §12.3): the web components
// (<opengov-field-hint>, <opengov-check-button>) and the chat panel live in
// separate shadow roots — this is their only channel. No window globals.

type Handler = (data: unknown) => void;

const handlers = new Map<string, Set<Handler>>();

/** Subscribe; returns the unsubscribe function. */
export function on(event: string, fn: Handler): () => void {
  let set = handlers.get(event);
  if (!set) {
    set = new Set();
    handlers.set(event, set);
  }
  set.add(fn);
  return () => set!.delete(fn);
}

export function emit(event: string, data?: unknown): void {
  for (const fn of handlers.get(event) ?? []) {
    try {
      fn(data);
    } catch {
      /* one listener must not break the others */
    }
  }
}

/** check-button → field-hints: full validate result to distribute inline. */
export const EV_CHECK_RESULT = 'og:check-result';
/** check-button → panel: errors that no field-hint can show (fallback, §12.3). */
export const EV_PANEL_CHECK = 'og:panel-check';
