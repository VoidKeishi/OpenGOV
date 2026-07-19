// Entry — runs synchronously from the embed <script> tag (WIDGET.md §1).
// Reads its own data attributes, guards against double mount, creates the
// Shadow DOM host on document.body. Must never throw into the host page.
import { mountApp } from './ui/App';
import { defineComponents } from './components';
import type { EmbedConfig } from './types';

declare global {
  interface Window {
    __opengovWidget?: true; // the single allowed global: double-mount guard
  }
}

function readConfig(): EmbedConfig | null {
  // currentScript is null when the tag is injected asynchronously (e.g. a
  // framework script loader) — fall back to the data-backend selector.
  const el = (document.currentScript ??
    document.querySelector('script[data-backend]')) as HTMLScriptElement | null;
  const backend = (el?.dataset.backend ?? '').replace(/\/+$/, '');
  if (!backend) {
    console.error('[OpenGOV] data-backend attribute missing — widget not mounted.');
    return null;
  }
  return {
    backend,
    scope: (el?.dataset.scope ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    accent: el?.dataset.accent || null,
  };
}

function boot(): void {
  if (window.__opengovWidget) return; // idempotent: second tag mounts nothing
  const config = readConfig();
  if (!config) return;
  window.__opengovWidget = true;

  const host = document.createElement('div');
  host.id = 'opengov-widget';
  const shadow = host.attachShadow({ mode: 'open' });
  document.body.appendChild(host);

  defineComponents(config); // Pha 2 custom elements — inert until the portal writes markup
  mountApp(shadow, config);
}

try {
  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot);
} catch (err) {
  console.error('[OpenGOV] mount failed', err);
}
