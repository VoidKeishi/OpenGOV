/**
 * backend/scripts/golden-qa.ts — automated eval (ARCHITECTURE.md §9).
 *
 * POSTs each question in data/golden-qa.json to /chat, collects the full SSE stream
 * (prose tokens + card payloads), and asserts expectations by diacritics-normalized
 * substring match — deterministic, no LLM judge. Prints a per-category pass/fail table.
 * REPORTS the pass-rate; it does NOT gate (tuning is a separate step).
 *
 * Usage: start the server (pnpm -C backend start), then `pnpm -C backend golden-qa`.
 * Set BASE_URL to point elsewhere (default http://localhost:3001).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeSearch } from '../src/db/normalize.ts';

const BASE = process.env.BASE_URL ?? 'http://localhost:3001';
const QA_PATH = resolve(process.cwd(), '..', 'data', 'golden-qa.json');

interface Expect {
  procedure_code?: string;
  must_mention_any?: string[][];
  must_cite_any?: string[];
  must_include_source_url?: boolean;
  out_of_scope?: boolean;
}
interface QaItem {
  id: string;
  category: string;
  question: string;
  expect: Expect;
}

async function askChat(message: string): Promise<{ prose: string; cards: any[] }> {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok || !res.body) throw new Error(`/chat HTTP ${res.status}`);

  let prose = '';
  const cards: any[] = [];
  const decoder = new TextDecoder();
  let buf = '';
  for await (const chunk of res.body as any) {
    buf += decoder.decode(chunk as Uint8Array, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      for (const line of frame.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        try {
          const ev = JSON.parse(line.slice(6));
          if (ev.type === 'token') prose += ev.text;
          else if (ev.type === 'card') cards.push(ev.payload);
        } catch {
          /* ignore non-JSON frames (e.g. the trailing end event) */
        }
      }
    }
  }
  return { prose, cards };
}

interface CheckResult {
  pass: boolean;
  failed: string[];
}

function evaluate(item: QaItem, prose: string, cards: any[]): CheckResult {
  const hayRaw = prose + ' ' + JSON.stringify(cards);
  const hay = normalizeSearch(hayRaw);
  const has = (s: string) => hay.includes(normalizeSearch(s));
  const failed: string[] = [];
  const e = item.expect;

  if (e.out_of_scope) {
    // fail-closed answer expected; must not assert an in-scope procedure
    const mention = (e.must_mention_any ?? []).every((group) => group.some(has));
    if (!mention) failed.push('out_of_scope mention');
  } else {
    if (e.procedure_code && !cards.some((c) => c?.code === e.procedure_code)) {
      failed.push(`procedure_code ${e.procedure_code} not identified in cards`);
    }
    for (const group of e.must_mention_any ?? []) {
      if (!group.some(has)) failed.push(`mention any of [${group.join(' | ')}]`);
    }
    if (e.must_cite_any && e.must_cite_any.length && !e.must_cite_any.some(has)) {
      failed.push(`cite any of [${e.must_cite_any.join(' | ')}]`);
    }
    if (e.must_include_source_url) {
      const hasUrl =
        cards.some((c) => hasSourceUrl(c)) || /https?:\/\//.test(prose) || has('dichvucong.gov.vn');
      if (!hasUrl) failed.push('source url');
    }
  }
  return { pass: failed.length === 0, failed };
}

function hasSourceUrl(card: any): boolean {
  if (!card || typeof card !== 'object') return false;
  if (typeof card.source_url === 'string' && card.source_url) return true;
  if (Array.isArray(card.fragments) && card.fragments.some((f: any) => f?.source_url)) return true;
  return false;
}

async function main(): Promise<void> {
  // health check first — a down server is a setup error, not a low pass-rate.
  try {
    const h = await fetch(`${BASE}/health`);
    if (!h.ok) throw new Error(`HTTP ${h.status}`);
  } catch (err) {
    console.error(`✖ Cannot reach ${BASE} (${(err as Error).message}). Start the server: pnpm -C backend start`);
    process.exit(1);
  }

  const items = JSON.parse(readFileSync(QA_PATH, 'utf8')).items as QaItem[];
  console.log(`Running ${items.length} golden Q&A against ${BASE}/chat …\n`);

  const byCategory = new Map<string, { pass: number; total: number }>();
  let passCount = 0;
  const failures: { id: string; question: string; failed: string[] }[] = [];

  for (const item of items) {
    let result: CheckResult;
    try {
      const { prose, cards } = await askChat(item.question);
      result = evaluate(item, prose, cards);
    } catch (err) {
      result = { pass: false, failed: [`request error: ${(err as Error).message}`] };
    }
    const cat = byCategory.get(item.category) ?? { pass: 0, total: 0 };
    cat.total++;
    if (result.pass) {
      cat.pass++;
      passCount++;
    } else {
      failures.push({ id: item.id, question: item.question, failed: result.failed });
    }
    byCategory.set(item.category, cat);
    console.log(`${result.pass ? '✔' : '✖'} ${item.id} [${item.category}] ${item.question}`);
    if (!result.pass) for (const f of result.failed) console.log(`      ↳ ${f}`);
  }

  console.log('\n── Pass-rate by category ──');
  const cats = [...byCategory.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [cat, s] of cats) {
    console.log(`  ${cat.padEnd(14)} ${s.pass}/${s.total}  (${pct(s.pass, s.total)})`);
  }
  console.log('───────────────────────────');
  console.log(`  OVERALL        ${passCount}/${items.length}  (${pct(passCount, items.length)})`);

  if (failures.length) {
    console.log(`\n${failures.length} failing — see ↳ reasons above. (Reporting only; not a gate.)`);
  }
  // Never gate on pass-rate: exit 0 so this can run in any pipeline.
  process.exit(0);
}

function pct(a: number, b: number): string {
  return b === 0 ? '—' : `${Math.round((a / b) * 100)}%`;
}

main().catch((err) => {
  console.error('golden-qa runner error:', err);
  process.exit(1);
});
