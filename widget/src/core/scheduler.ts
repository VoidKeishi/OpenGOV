// Re-scan trigger for detection (WIDGET.md §6.1): SPA navigations don't fire
// events → poll location.href every ~800ms; wizard step changes mutate the DOM
// → MutationObserver on body, debounced 300ms. Each run is a handful of
// querySelector calls — negligible. Shadow DOM keeps our own UI mutations
// invisible to the observer (no feedback loop).

const POLL_MS = 800;
const DEBOUNCE_MS = 300;

export function startDetectLoop(run: () => void): () => void {
  let lastHref = location.href;
  const interval = setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      run();
    }
  }, POLL_MS);

  let debounce: ReturnType<typeof setTimeout> | undefined;
  const observer = new MutationObserver(() => {
    clearTimeout(debounce);
    debounce = setTimeout(run, DEBOUNCE_MS);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  run();
  return () => {
    clearInterval(interval);
    observer.disconnect();
    clearTimeout(debounce);
  };
}
