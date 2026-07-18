/**
 * tools/etl/parse.ts — deterministic ETL parser.
 *
 * Reads the read-only crawl under `backend/data/crawl/` and emits one normalized
 * record per procedure to `data/procedures/<code>.json`, following DATA.md §2.
 *
 * Contract (DATA.md, ARCHITECTURE.md §8):
 *   - Pure & deterministic: same input → byte-identical output (rerun ⇒ empty git diff).
 *   - Zero runtime dependencies. Run with `node --experimental-strip-types` (Node ≥ 22.6)
 *     or `tsx`. See `npm run parse` in tools/etl/package.json.
 *   - Only normalizes already-structured fields. Prose blobs (steps, checklist) are
 *     carried VERBATIM — interpretation is the human structuring pass, not this file.
 *
 * Never hand-edit `data/procedures/*.json`; fix this parser and rerun.
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const CRAWL = join(REPO, 'backend', 'data', 'crawl');
const OUT_DIR = join(REPO, 'data', 'procedures');

// ---------- raw crawl shapes (only the fields we consume) ----------

interface CatalogRow {
  code: string;
  departments?: string[];
  departmentPromulgate?: string;
}

interface RawFee {
  type: string;
  value: number | null;
  description?: string;
}
interface RawMethod {
  submissionMethod: string;
  processingTime: number | null;
  processingTimeUnit: string;
  description?: string;
  fees?: RawFee[];
}
interface RawCase {
  code: string;
  processingDay?: { qty: number; type: string } | null;
}
interface RawNamed {
  name: string;
  code?: string;
}
interface RawStep {
  name?: string;
  description?: string;
}
interface RawProfileComponent {
  name: string;
  originalQty: number;
  copyQty: number;
  code: string;
  hasElectronicForm: boolean;
  isProcessingResult: boolean;
  attachments?: unknown[];
}
interface RawExecutionCase {
  name: string;
  profileComponents?: RawProfileComponent[];
}
interface RawData {
  id: string;
  code: string;
  name: string;
  category: { code?: string; name?: string } | null;
  departmentPromulgateName?: string;
  unitGroupsExecuting?: RawNamed[];
  subjectTypesDetails?: RawNamed[];
  resultsDetails?: RawNamed[];
  requirementsAndConditions?: string;
  executionMethods?: RawMethod[];
  cases?: RawCase[];
  legalBasisesDetails?: RawNamed[];
  executionSteps?: RawStep[];
  executionCases?: RawExecutionCase[];
  state: string;
  updatedAt?: number | null;
  createdAt?: number | null;
}

// ---------- normalized output shape (DATA.md §2) ----------

interface Procedure {
  code: string;
  source_id: string;
  name: string;
  category: { code: string | null; name: string | null } | null;
  promulgating_agency: string | null;
  executing_agency: string | null;
  subject_types: string[];
  results: string[];
  requirements: string;
  channels: {
    method: string;
    fees: { type: string; value_vnd: number | null; text: string }[];
    processing: { qty: number | null; unit: string };
    note: string;
  }[];
  processing_cases: { case_code: string; qty: number; unit: string }[];
  legal_basis: { code: string; name: string }[];
  steps_raw: { name: string; text: string }[];
  checklist_raw: {
    group: string;
    items: {
      name: string;
      original_qty: number;
      copy_qty: number;
      code: string;
      has_electronic_form: boolean;
      is_processing_result: boolean;
      attachments: unknown[];
    }[];
  }[];
  state: string;
  source: {
    url: string;
    updated_at: string | null;
    created_at: string | null;
    crawled_at: string;
  };
}

// ---------- helpers ----------

/** epoch-milliseconds → ISO-8601, or null when absent (DATA.md / ARCHITECTURE.md §1.7). */
function toISO(ms: number | null | undefined): string | null {
  return typeof ms === 'number' ? new Date(ms).toISOString() : null;
}

/** Build a code → catalog-row index for the executing-agency fallback. */
function loadCatalogIndex(): Map<string, CatalogRow> {
  const index = new Map<string, CatalogRow>();
  const text = readFileSync(join(CRAWL, 'catalog.jsonl'), 'utf8');
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const row = JSON.parse(line) as CatalogRow;
    index.set(row.code, row);
  }
  return index;
}

function transform(d: RawData, catalog: Map<string, CatalogRow>, crawledAt: string): Procedure {
  const row = catalog.get(d.code);

  // executing_agency: unitGroupsExecuting join "; "; fallback catalog .departments (215/500 need it).
  const executingParts = (d.unitGroupsExecuting ?? []).map((u) => u.name).filter(Boolean);
  let executing = executingParts.join('; ');
  if (!executing) {
    executing = (row?.departments ?? []).filter(Boolean).join('; ');
  }

  return {
    code: d.code,
    source_id: d.id,
    name: d.name,
    category: d.category
      ? { code: d.category.code ?? null, name: d.category.name ?? null }
      : null,
    promulgating_agency: d.departmentPromulgateName?.trim() || null,
    executing_agency: executing || null,
    subject_types: (d.subjectTypesDetails ?? []).map((s) => s.name).filter(Boolean),
    results: (d.resultsDetails ?? []).map((r) => r.name).filter(Boolean),
    requirements: (d.requirementsAndConditions ?? '').trim(),
    channels: (d.executionMethods ?? []).map((m) => ({
      method: m.submissionMethod,
      fees: (m.fees ?? []).map((f) => ({
        type: f.type,
        value_vnd: f.value ?? null,
        text: f.description ?? '',
      })),
      processing: { qty: m.processingTime ?? null, unit: m.processingTimeUnit },
      note: m.description ?? '',
    })),
    // Authoritative processing time when channels[].processing.unit === "OTHER" (ARCHITECTURE.md §1.5).
    processing_cases: (d.cases ?? [])
      .filter((c) => c.processingDay != null)
      .map((c) => ({
        case_code: c.code,
        qty: c.processingDay!.qty,
        unit: c.processingDay!.type,
      })),
    legal_basis: (d.legalBasisesDetails ?? []).map((l) => ({
      code: (l.code ?? '').trim(),
      name: (l.name ?? '').trim(),
    })),
    // VERBATIM — never flatten or interpret (ARCHITECTURE.md §1.3).
    steps_raw: (d.executionSteps ?? []).map((s) => ({
      name: s.name ?? '',
      text: s.description ?? '',
    })),
    // VERBATIM groups; grouping meaning varies per procedure (ARCHITECTURE.md §1.2).
    checklist_raw: (d.executionCases ?? []).map((ec) => ({
      group: ec.name,
      items: (ec.profileComponents ?? []).map((pc) => ({
        name: pc.name,
        original_qty: pc.originalQty,
        copy_qty: pc.copyQty,
        code: pc.code,
        has_electronic_form: pc.hasElectronicForm,
        is_processing_result: pc.isProcessingResult,
        attachments: pc.attachments ?? [],
      })),
    })),
    state: d.state,
    source: {
      url: `https://dichvucong.gov.vn/thu-tuc-hanh-chinh/${d.id}`,
      updated_at: toISO(d.updatedAt),
      created_at: toISO(d.createdAt),
      crawled_at: crawledAt,
    },
  };
}

// ---------- main ----------

function main(): void {
  const manifest = JSON.parse(readFileSync(join(CRAWL, 'manifest.json'), 'utf8')) as {
    startedAt: string;
  };
  const crawledAt = manifest.startedAt;
  const catalog = loadCatalogIndex();

  const detailsDir = join(CRAWL, 'details');
  const files = readdirSync(detailsDir)
    .filter((f) => f.endsWith('.json'))
    .sort();

  // Clean the output dir so a rerun after a crawl change never leaves stale records.
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  let count = 0;
  for (const file of files) {
    const envelope = JSON.parse(readFileSync(join(detailsDir, file), 'utf8')) as {
      data: RawData;
    };
    const record = transform(envelope.data, catalog, crawledAt);
    // Trailing newline + 2-space indent keeps diffs minimal and POSIX-clean.
    writeFileSync(join(OUT_DIR, `${record.code}.json`), JSON.stringify(record, null, 2) + '\n');
    count++;
  }

  console.log(`parse: wrote ${count} procedures → data/procedures/`);
}

main();
