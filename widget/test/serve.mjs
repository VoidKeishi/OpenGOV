// Dev/test server for the widget harness (NOT production — backend R3 serves the
// real bundle). Three jobs:
//   1. Static: test pages + dist/, with %BACKEND% in HTML replaced by this
//      server's origin (or ?backend=<url> override for direct-backend scenarios).
//   2. GET /schemas shim: the R1 contract built from ../data/schemas/*.form.json —
//      [{procedure_code, form_ref, field_keys}] — doubles as the reference
//      implementation for the backend session.
//   3. Transparent proxy of every other path to the real backend (SSE-safe:
//      stream piping both ways, no buffering, hop-by-hop headers stripped).
import { createServer, request as httpRequest } from 'node:http';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, extname, resolve, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT || 8787);
const BACKEND = process.env.BACKEND || 'http://localhost:3001';
const WIDGET_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMAS_DIR = resolve(WIDGET_ROOT, '../data/schemas');

const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade', 'host',
]);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.map': 'application/json',
};

function schemasIndex() {
  return readdirSync(SCHEMAS_DIR)
    .filter((f) => f.endsWith('.form.json'))
    .map((f) => {
      const s = JSON.parse(readFileSync(join(SCHEMAS_DIR, f), 'utf8'));
      return {
        procedure_code: s.procedure_code,
        form_ref: s.form_ref,
        field_keys: Object.keys(s.fields ?? {}),
        // Pha 2 (R1 extension): relative wizard path + verbatim prefill map
        form_path: `/nop-truc-tuyen/${s.form_ref}`,
        ...(s.prefill ? { prefill: s.prefill } : {}),
      };
    });
}

function serveStatic(res, file, url, host) {
  let body = readFileSync(file);
  if (extname(file) === '.html') {
    const backend = url.searchParams.get('backend') || `http://${host}`;
    body = Buffer.from(body.toString('utf8').replaceAll('%BACKEND%', backend));
  }
  res.writeHead(200, {
    'content-type': MIME[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  res.end(body);
}

function proxy(req, res, url) {
  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) if (!HOP_BY_HOP.has(k)) headers[k] = v;
  const upstream = httpRequest(
    new URL(url.pathname + url.search, BACKEND),
    { method: req.method, headers },
    (up) => {
      const out = {};
      for (const [k, v] of Object.entries(up.headers)) if (!HOP_BY_HOP.has(k)) out[k] = v;
      res.writeHead(up.statusCode ?? 502, out);
      up.pipe(res);
    },
  );
  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ message: 'proxy: backend unreachable' }));
  });
  req.pipe(upstream);
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

  if (url.pathname === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (url.pathname === '/schemas' && req.method === 'GET') {
    res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
    res.end(JSON.stringify(schemasIndex()));
    return;
  }

  let file = null;
  if (url.pathname.includes('dang-ky-thuong-tru')) {
    file = join(WIDGET_ROOT, 'test/nofields.html'); // form_ref-in-path page, no schema fields
  } else if (url.pathname.startsWith('/dist/') || url.pathname.startsWith('/test/')) {
    const candidate = normalize(join(WIDGET_ROOT, url.pathname));
    if (candidate.startsWith(WIDGET_ROOT)) file = candidate;
  } else if (url.pathname === '/') {
    file = join(WIDGET_ROOT, 'test/acceptance.html');
  }
  if (file && existsSync(file) && statSync(file).isFile()) {
    serveStatic(res, file, url, req.headers.host);
    return;
  }

  proxy(req, res, url);
});

server.listen(PORT, () => {
  console.log(`[serve] http://localhost:${PORT}  →  backend ${BACKEND}`);
  console.log(`[serve] /schemas shim from ${SCHEMAS_DIR}`);
  console.log(`[serve] pages: / (acceptance), /test/blank.html, /nop-truc-tuyen/dang-ky-thuong-tru, /test/reset.html`);
});
