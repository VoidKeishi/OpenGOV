// Crawler for public administrative-procedure data from dichvucong.gov.vn.
//
// Builds a knowledge base from three verified public POST-JSON endpoints:
//   1. catalog     — list-all-public-formality-by-citizen  (cursor paginated by lastId)
//   2. detail      — get-formality-by-citizen              (one procedure by UUID)
//   3. provinces   — province-vn/list-by-citizen
//
// Output tree (all under backend/data/crawl/):
//   catalog.jsonl          one JSON object per line, the whole public catalog
//   details/<code>.json    raw endpoint-2 response for selected procedures
//   provinces.json         raw endpoint-3 response
//   attachments/<code>/    form-template files, if any procedure exposes them
//   manifest.json          run statistics
//
// Notes learned from live probing (2026-07-18):
//   - Endpoints return HTTP 201 (not 200) on success -> treat any 2xx as ok.
//   - A short User-Agent is blocked by the WAF (returns an HTML page); a full
//     Chrome UA is mandatory. Non-JSON responses therefore mean "blocked, retry".
//   - The public API never populated profileComponents[].attachments in any
//     sampled procedure; the download logic below is defensive for when it does.
//
// Run: node backend/scripts/crawl-dvc.mjs   (Node >= 18, built-in fetch, no deps)
// Resumable: an existing valid details/<code>.json is skipped; an existing
// catalog.jsonl is reused instead of re-crawled.

import { mkdir, writeFile, readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE = 'https://dichvucong.gov.vn';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const EP = {
  catalog: '/api/v1/submitting/formality/list-all-public-formality-by-citizen',
  detail: '/api/v1/configuring/formality/get-formality-by-citizen',
  provinces: '/api/v1/configuring/province-vn/list-by-citizen',
};

const OUT = path.resolve(import.meta.dirname, '..', 'data', 'crawl');
const DETAILS_DIR = path.join(OUT, 'details');
const ATTACH_DIR = path.join(OUT, 'attachments');

const REQUEST_TIMEOUT_MS = 30_000;
const RETRY_BACKOFF_MS = [1_000, 5_000, 15_000]; // 3 retries after the first try
const CATALOG_PAGE = 50;
const DETAIL_CAP = 500; // hard ceiling on procedures fetched in full
const ATTACH_MAX_COMMIT_BYTES = 20 * 1024 * 1024; // 20MB -> gitignore + note

// Pilot procedures (verified UUIDs from the live detail pages). Always fetched
// in full regardless of whether they appear in the paginated catalog, because
// list-all mixes central (STANDARD) and province-specific (SPECIFIC) records.
const PILOTS = [
  { id: '019d2bfd-3fe0-70ac-b9d6-5e9e20d6eef7', code: '1.001193', name: 'Đăng ký khai sinh' },
  { id: '019d2bf7-7704-7449-9e95-fe7ebb959aa2', code: '1.004222', name: 'Đăng ký thường trú' },
  { id: '019d2bfe-9088-744d-aa0a-e846b6dce3d5', code: '1.013225', name: 'Cấp giấy phép xây dựng mới công trình cấp III/IV và nhà ở riêng lẻ' },
];

// Category name substrings (lowercased) that qualify a catalog item.
// Group B — the pilot domains (highest priority after pilots themselves).
const CATEGORIES_B = ['hộ tịch', 'cư trú', 'hoạt động xây dựng'];
// Group C — common high-traffic domains.
const CATEGORIES_C = ['căn cước', 'hộ chiếu', 'xuất nhập cảnh', 'bảo hiểm', 'đất đai'];

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const politeDelay = () => sleep(300 + Math.floor(Math.random() * 200)); // 300-500ms
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);

// Make a procedure code safe to use as a filename.
const safeName = (s) => String(s || '').replace(/[^\w.\-]/g, '_') || 'unknown';

const HEADERS = {
  'User-Agent': UA,
  'Content-Type': 'application/json',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
  Origin: BASE,
  Referer: BASE + '/',
};

// POST JSON with timeout + retry/backoff. Retries on network error, timeout,
// 5xx, and non-JSON (WAF) responses. A 4xx JSON response is a deterministic
// client error and is not retried.
async function postJSON(pathname, body, label) {
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(BASE + pathname, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      const ct = res.headers.get('content-type') || '';
      const text = await res.text();
      if (!ct.includes('json')) {
        // Blocked by WAF or an error page — retryable.
        throw new Error(`non-JSON response (HTTP ${res.status})`);
      }
      const json = JSON.parse(text);
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}: ${json.message || ''}`.trim());
        err.noRetry = res.status < 500;
        throw err;
      }
      return json;
    } catch (e) {
      const last = attempt >= RETRY_BACKOFF_MS.length;
      if (last || e.noRetry) {
        throw new Error(`${label}: ${e.message}`);
      }
      const wait = RETRY_BACKOFF_MS[attempt];
      log(`  retry ${label} in ${wait}ms — ${e.message}`);
      await sleep(wait);
    } finally {
      clearTimeout(timer);
    }
  }
}

// GET a binary file with the same timeout/retry policy. Guards against the NDC
// WAF, which answers unknown/blocked paths with HTTP 200 + a small HTML
// "Request Rejected" page — that must never be saved as if it were the file.
async function download(url, dest, label) {
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Referer: BASE + '/' },
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`);
        err.noRetry = res.status < 500;
        throw err;
      }
      const ct = res.headers.get('content-type') || '';
      const buf = Buffer.from(await res.arrayBuffer());
      // Reject HTML responses (WAF page / error page) — a real form template is
      // a binary Office/PDF document, never text/html.
      const head = buf.subarray(0, 64).toString('latin1').trimStart().toLowerCase();
      if (ct.includes('text/html') || head.startsWith('<html') || head.startsWith('<!doctype')) {
        const err = new Error('rejected: HTML/WAF response, not a file');
        err.noRetry = true;
        throw err;
      }
      await writeFile(dest, buf);
      return buf.length;
    } catch (e) {
      const last = attempt >= RETRY_BACKOFF_MS.length;
      if (last || e.noRetry) throw new Error(`${label}: ${e.message}`);
      await sleep(RETRY_BACKOFF_MS[attempt]);
    } finally {
      clearTimeout(timer);
    }
  }
}

// ---------------------------------------------------------------------------
// Step 1 — catalog
// ---------------------------------------------------------------------------

async function crawlCatalog() {
  const catalogPath = path.join(OUT, 'catalog.jsonl');

  // Resume: an existing catalog.jsonl is written atomically only on completion,
  // so its presence means it is complete — reuse it.
  if (existsSync(catalogPath)) {
    const lines = (await readFile(catalogPath, 'utf8')).split('\n').filter(Boolean);
    const items = [];
    for (const line of lines) {
      try {
        items.push(JSON.parse(line));
      } catch {
        /* skip a corrupt line */
      }
    }
    if (items.length > 0) {
      log(`catalog: reusing existing catalog.jsonl (${items.length} items)`);
      return { items, apiTotal: items.length };
    }
  }

  log('catalog: crawling from scratch');
  const items = [];
  const seen = new Set();
  let lastId = '';
  let apiTotal = 0;
  let page = 0;
  const maxPages = 1_000; // runaway guard

  while (page < maxPages) {
    page++;
    const resp = await postJSON(
      EP.catalog,
      { limit: CATALOG_PAGE, lastId, q: '', categoryId: '', departmentCode: '' },
      `catalog p${page}`,
    );
    const data = resp.data || {};
    const batch = data.items || [];
    if (data.total) apiTotal = data.total;
    if (batch.length === 0) break;

    let fresh = 0;
    for (const it of batch) {
      if (it.id && seen.has(it.id)) continue;
      if (it.id) seen.add(it.id);
      items.push(it);
      fresh++;
    }

    if (page % 10 === 0 || batch.length < CATALOG_PAGE) {
      log(`  catalog page ${page}: +${batch.length} (total collected ${items.length}/${apiTotal || '?'})`);
    }

    const next = data.lastId;
    if (!next || next === lastId || fresh === 0) break; // no forward progress
    lastId = next;
    if (batch.length < CATALOG_PAGE) break; // last (short) page
    await politeDelay();
  }

  // Atomic write: temp file then rename, so a partial crawl never looks complete.
  const jsonl = items.map((it) => JSON.stringify(it)).join('\n') + '\n';
  const tmp = catalogPath + '.tmp';
  await writeFile(tmp, jsonl);
  const { rename } = await import('node:fs/promises');
  await rename(tmp, catalogPath);

  log(`catalog: wrote ${items.length} items to catalog.jsonl (API total ${apiTotal})`);
  return { items, apiTotal };
}

// ---------------------------------------------------------------------------
// Step 2 — provinces
// ---------------------------------------------------------------------------

async function crawlProvinces() {
  const dest = path.join(OUT, 'provinces.json');
  const rows = [];
  let lastId = '';
  let raw = null;
  for (let page = 0; page < 100; page++) {
    const resp = await postJSON(EP.provinces, { limit: 100, lastId }, `provinces p${page + 1}`);
    if (!raw) raw = resp; // keep first response shape as the canonical wrapper
    const data = resp.data || {};
    const batch = data.rows || data.items || [];
    if (batch.length === 0) break;
    rows.push(...batch);
    const next = data.lastId;
    if (!next || batch.length < 100) break;
    lastId = next;
    await politeDelay();
  }
  // Store the raw wrapper but with the fully-paginated row set.
  const out = { ...raw, data: { ...(raw?.data || {}), rows, count: rows.length } };
  await writeFile(dest, JSON.stringify(out, null, 2));
  log(`provinces: wrote ${rows.length} provinces`);
  return rows.length;
}

// ---------------------------------------------------------------------------
// Selection — decide which procedures to fetch in full
// ---------------------------------------------------------------------------

function categoryMatcher(needles) {
  return (item) => {
    const cats = (item.categories || []).map((c) => String(c).toLowerCase());
    return needles.some((n) => cats.some((c) => c.includes(n)));
  };
}

function selectProcedures(catalog) {
  const selected = [];
  const seenCodes = new Set();

  const add = (item, tier) => {
    const code = item.code || item.id;
    if (!code || seenCodes.has(code)) return false;
    seenCodes.add(code);
    selected.push({ id: item.id, code, name: item.name, tier });
    return true;
  };

  // Tier A — pilots, always included.
  for (const p of PILOTS) add(p, 'A');
  const aCount = selected.length;

  // Tier B / C candidates from the catalog (deduped by code as we add).
  const matchB = categoryMatcher(CATEGORIES_B);
  const matchC = categoryMatcher(CATEGORIES_C);
  const bItems = catalog.filter((it) => matchB(it));
  const cItems = catalog.filter((it) => !matchB(it) && matchC(it));

  // Count unique codes available per tier (excludes anything already selected).
  const uniqueAvail = (items) => {
    const s = new Set();
    for (const it of items) {
      const code = it.code || it.id;
      if (code && !seenCodes.has(code)) s.add(code);
    }
    return s.size;
  };
  const bAvail = uniqueAvail(bItems);
  // cAvail is measured before B consumes any budget, for reporting only.
  const cAvailRaw = uniqueAvail(cItems);

  // Apply cap with priority A > B > C.
  let bAdded = 0;
  for (const it of bItems) {
    if (selected.length >= DETAIL_CAP) break;
    if (add(it, 'B')) bAdded++;
  }
  let cAdded = 0;
  for (const it of cItems) {
    if (selected.length >= DETAIL_CAP) break;
    if (add(it, 'C')) cAdded++;
  }

  const capApplied = {
    cap: DETAIL_CAP,
    applied: selected.length >= DETAIL_CAP && bAdded + cAdded < bAvail + cAvailRaw,
    tierCounts: { A: aCount, B: bAdded, C: cAdded },
    available: { A: PILOTS.length, B: bAvail, C: cAvailRaw },
    cut: { B: Math.max(0, bAvail - bAdded), C: Math.max(0, cAvailRaw - cAdded) },
    selected: selected.length,
  };

  return { selected, capApplied };
}

// ---------------------------------------------------------------------------
// Step 3 — details + attachments
// ---------------------------------------------------------------------------

// Is details/<code>.json already present and valid JSON? (resume support)
async function detailIsValid(file) {
  if (!existsSync(file)) return false;
  try {
    JSON.parse(await readFile(file, 'utf8'));
    return true;
  } catch {
    return false;
  }
}

async function crawlDetails(selected) {
  const detailOk = [];
  const detailFail = [];

  for (let i = 0; i < selected.length; i++) {
    const item = selected[i];
    const file = path.join(DETAILS_DIR, `${safeName(item.code)}.json`);

    if (await detailIsValid(file)) {
      detailOk.push(item.code); // resume: already fetched
      continue;
    }

    try {
      const resp = await postJSON(EP.detail, { id: item.id }, `detail ${item.code}`);
      if (!resp.data) throw new Error('empty data');
      await writeFile(file, JSON.stringify(resp, null, 2));
      detailOk.push(item.code);
    } catch (e) {
      detailFail.push({ code: item.code, error: e.message });
      log(`  FAIL detail ${item.code}: ${e.message}`);
    }

    if ((i + 1) % 25 === 0) {
      log(`  details ${i + 1}/${selected.length} (ok ${detailOk.length}, fail ${detailFail.length})`);
    }
    await politeDelay();
  }

  return { detailOk, detailFail };
}

// Attachments (biểu mẫu / form templates) for pilots (A) and their domains (B).
//
// The catalog exposes attachments only as references
// {id, fileName, bucketName, filePath} — there is NO public file URL, and the
// object store behind them is gated by the NDC WAF (direct filePath access and
// every discoverable download endpoint return a "Request Rejected" HTML page).
// So binaries cannot be fetched programmatically. Those references are already
// preserved inside details/<code>.json; this pass only counts them and, as a
// forward-safety measure, downloads any attachment that DOES carry a genuine
// URL field (guarded so an HTML/WAF page is never saved). Reads details from
// disk so the count is correct on resume runs too.
async function summarizeAttachments(selected) {
  let refs = 0;
  let downloaded = 0;
  let bytes = 0;
  let proceduresWithRefs = 0;

  for (const item of selected) {
    if (item.tier !== 'A' && item.tier !== 'B') continue;
    const file = path.join(DETAILS_DIR, `${safeName(item.code)}.json`);
    if (!existsSync(file)) continue;
    let data;
    try {
      data = JSON.parse(await readFile(file, 'utf8')).data;
    } catch {
      continue;
    }
    const atts = (data?.executionCases || [])
      .flatMap((c) => c.profileComponents || [])
      .flatMap((pc) => pc.attachments || []);
    if (atts.length === 0) continue;
    refs += atts.length;
    proceduresWithRefs++;

    for (const att of atts) {
      const rawUrl = att.url || att.fileUrl || att.downloadUrl || att.link;
      if (!rawUrl) continue; // reference-only (bucketName/filePath): nothing to fetch
      const url = /^https?:\/\//.test(rawUrl) ? rawUrl : BASE + (rawUrl.startsWith('/') ? '' : '/') + rawUrl;
      const dir = path.join(ATTACH_DIR, safeName(item.code));
      await mkdir(dir, { recursive: true });
      const fname = safeName(att.fileName || att.name || att.originalName || path.basename(url));
      const dest = path.join(dir, fname);
      if (existsSync(dest)) {
        downloaded++;
        continue;
      }
      try {
        bytes += await download(url, dest, `attach ${item.code}/${fname}`);
        downloaded++;
        await politeDelay();
      } catch (e) {
        log(`  attachment skipped ${item.code}/${fname}: ${e.message}`);
      }
    }
  }
  return { refs, downloaded, bytes, proceduresWithRefs };
}

// ---------------------------------------------------------------------------
// Attachments size guard -> .gitignore
// ---------------------------------------------------------------------------

async function dirSize(dir) {
  if (!existsSync(dir)) return 0;
  let total = 0;
  const walk = async (d) => {
    for (const entry of await readdir(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) await walk(p);
      else total += (await stat(p)).size;
    }
  };
  await walk(dir);
  return total;
}

async function ensureGitignore(entry) {
  const gi = path.resolve(import.meta.dirname, '..', '..', '.gitignore');
  let content = existsSync(gi) ? await readFile(gi, 'utf8') : '';
  if (content.split('\n').some((l) => l.trim() === entry)) return false;
  content = content.replace(/\n?$/, '\n') + `# crawl attachments exceed 20MB — not committed\n${entry}\n`;
  await writeFile(gi, content);
  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const startedAt = new Date().toISOString();
  await mkdir(DETAILS_DIR, { recursive: true });

  log('=== DVC crawl start ===');
  const { items: catalog, apiTotal } = await crawlCatalog();
  if (catalog.length < 2000) {
    log(`WARNING: catalog has only ${catalog.length} items (expected >= 2000)`);
  }

  const provincesCount = await crawlProvinces();

  const { selected, capApplied } = selectProcedures(catalog);
  log(
    `selection: ${selected.length} procedures ` +
      `(A=${capApplied.tierCounts.A}, B=${capApplied.tierCounts.B}, C=${capApplied.tierCounts.C})` +
      (capApplied.applied ? ` — CAP applied, cut B=${capApplied.cut.B} C=${capApplied.cut.C}` : ''),
  );

  const { detailOk, detailFail } = await crawlDetails(selected);

  const att = await summarizeAttachments(selected);
  log(
    `attachments: ${att.refs} references across ${att.proceduresWithRefs} procedures; ` +
      `${att.downloaded} binaries downloaded`,
  );

  // Attachment size guard (only meaningful if binaries were actually saved).
  let attachmentsGitignored = false;
  const attachTotal = await dirSize(ATTACH_DIR);
  if (attachTotal > ATTACH_MAX_COMMIT_BYTES) {
    attachmentsGitignored = await ensureGitignore('backend/data/crawl/attachments/');
    log(`attachments ${(attachTotal / 1e6).toFixed(1)}MB > 20MB — added to .gitignore`);
  }

  const finishedAt = new Date().toISOString();
  const manifest = {
    startedAt,
    finishedAt,
    catalogTotal: catalog.length,
    catalogApiTotal: apiTotal,
    provincesCount,
    selectedCount: selected.length,
    detailOk,
    detailFail,
    attachmentCount: att.downloaded, // binaries actually saved to attachments/
    attachmentBytes: att.bytes,
    attachmentRefs: att.refs, // form-template references preserved in details/*.json
    proceduresWithAttachmentRefs: att.proceduresWithRefs,
    attachmentNote:
      'Attachment binaries are not publicly downloadable (object store gated by ' +
      'the NDC WAF; no file URL is exposed). Their references ' +
      '{id, fileName, bucketName, filePath} are preserved in details/<code>.json.',
    attachmentsGitignored,
    capApplied,
  };
  await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));

  log('=== DVC crawl done ===');
  log(
    `catalog=${catalog.length} provinces=${provincesCount} ` +
      `details ok=${detailOk.length} fail=${detailFail.length} ` +
      `attachmentRefs=${att.refs} binaries=${att.downloaded}`,
  );
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
