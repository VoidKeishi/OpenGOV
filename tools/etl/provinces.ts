/**
 * tools/etl/provinces.ts — regenerate `data/provinces.json` `current[]` from the crawl.
 *
 * Ownership split (DATA.md §5, backend/CLAUDE.md):
 *   - `current[]` is MACHINE-owned: the 34 post-merger provinces from the crawl.
 *   - `defunct[]` is HUMAN-owned: pre-merger names → merged_into. This script NEVER
 *     touches it — it reads the existing file and carries `defunct[]` (and any `_`-prefixed
 *     draft notes) through unchanged, so rerunning is safe and idempotent.
 *
 * Zero runtime dependencies. Run with `node --experimental-strip-types provinces.ts`.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const CRAWL_PROVINCES = join(REPO, 'backend', 'data', 'crawl', 'provinces.json');
const OUT = join(REPO, 'data', 'provinces.json');

interface Defunct {
  name: string;
  merged_into: string;
}
interface ProvincesFile {
  current: { code: string; name: string }[];
  defunct: Defunct[];
  [k: string]: unknown; // preserve `_`-prefixed draft notes
}

const crawl = JSON.parse(readFileSync(CRAWL_PROVINCES, 'utf8')) as {
  data: { rows: { name: string; code: string }[] };
};
const current = crawl.data.rows.map((r) => ({ code: r.code, name: r.name }));

// Load existing human-owned content, or seed a DRAFT skeleton on first creation.
let existing: ProvincesFile;
if (existsSync(OUT)) {
  existing = JSON.parse(readFileSync(OUT, 'utf8')) as ProvincesFile;
} else {
  existing = {
    current: [],
    defunct: [],
    _draft:
      'DRAFT: defunct[] is the human-verified pre-merger province → merged_into map ' +
      '(~29 names from the 01/07/2025 merger). Empty pending review — see docs/DATA.md §5. ' +
      'Powers the province_not_defunct / E_TINH_SAP_NHAP validation rule.',
  };
}

// Rebuild with current[] first, then carry human-owned keys through unchanged.
const { current: _drop, ...humanOwned } = existing;
const out = { current, ...humanOwned };

writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`provinces: wrote ${current.length} current, preserved ${(existing.defunct ?? []).length} defunct`);
