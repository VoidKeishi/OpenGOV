// Spotlight overlay (WIDGET.md §12.1): one fixed-position box in the widget's
// Shadow DOM framing the target element; a huge box-shadow dims the rest of the
// page. pointer-events:none — the user keeps full control of the page beneath.
// Read-only by design: never touches host classes/styles, self-removes.

let root: ShadowRoot | null = null;
let cancelActive: (() => void) | null = null;

export function initOverlay(shadowRoot: ShadowRoot): void {
  root = shadowRoot;
}

const PAD = 6;
const FADE_MS = 550;

/**
 * Scroll the target into view, frame it with the accent border and dim the rest
 * of the page, then fade out after `ttl` ms. A new call cancels the previous
 * spotlight. Tracks the target through scroll/resize via a rAF loop (cheap and
 * short-lived).
 */
export function spotlight(target: Element, ttl = 4000): void {
  if (!root) return;
  cancelActive?.();

  const box = document.createElement('div');
  box.className = 'og-spotlight';
  root.appendChild(box);

  const place = (): void => {
    const r = target.getBoundingClientRect();
    box.style.top = `${r.top - PAD}px`;
    box.style.left = `${r.left - PAD}px`;
    box.style.width = `${r.width + 2 * PAD}px`;
    box.style.height = `${r.height + 2 * PAD}px`;
  };

  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  let raf = 0;
  const track = (): void => {
    place();
    raf = requestAnimationFrame(track);
  };
  track();

  const fadeTimer = setTimeout(() => box.classList.add('og-spotlight-fade'), ttl);
  const removeTimer = setTimeout(() => cleanup(), ttl + FADE_MS);
  const cleanup = (): void => {
    cancelAnimationFrame(raf);
    clearTimeout(fadeTimer);
    clearTimeout(removeTimer);
    box.remove();
    if (cancelActive === cleanup) cancelActive = null;
  };
  cancelActive = cleanup;
}
