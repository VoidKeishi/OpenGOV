/**
 * backend/scripts/seed.ts — build backend/var/opengov.db from committed data/.
 *
 * Drop + recreate, rerunnable. The DB is a cache, not a source of truth (ARCHITECTURE.md §6):
 * every deploy runs this at build time, so the DB is always reproducible from data/.
 *
 * Seed mapping (DATA.md §6):
 *   data/procedures/*.json  (+ merge data/curated/<code>.json → structuring_level='full')  → procedures + procedures_fts
 *   data/aliases.json                                                                        → aliases + FTS aliases column
 *   data/provinces.json                                                                      → provinces (current + defunct)
 *   data/schemas/, data/errors/                                                              → NOT seeded (validation reads them directly)
 *
 * Run with `node --experimental-strip-types scripts/seed.ts` (see npm run seed).
 */

import Database from 'better-sqlite3';
import { readFileSync, readdirSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { normalizeSearch } from '../src/db/normalize.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const BACKEND = join(HERE, '..');
const REPO = join(BACKEND, '..');
const DATA = join(REPO, 'data');
const VAR = join(BACKEND, 'var');
const DB_PATH = join(VAR, 'opengov.db');
const SCHEMA = join(BACKEND, 'src', 'db', 'schema.sql');

const readJSON = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
/** Human-owned JSON files carry `_`-prefixed draft/metadata keys — never treat them as data. */
const isDataKey = (k: string) => !k.startsWith('_');

function main(): void {
  rmSync(DB_PATH, { force: true });
  mkdirSync(VAR, { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(readFileSync(SCHEMA, 'utf8'));

  // Aliases loaded first so each procedure's FTS row can embed its normalized aliases.
  const aliasesByCode = new Map<string, string[]>();
  const aliasesFile = join(DATA, 'aliases.json');
  if (existsSync(aliasesFile)) {
    const raw = readJSON(aliasesFile) as Record<string, unknown>;
    for (const [code, list] of Object.entries(raw)) {
      if (isDataKey(code) && Array.isArray(list)) aliasesByCode.set(code, list as string[]);
    }
  }

  const insertProc = db.prepare(
    `INSERT INTO procedures (code, name, category_name, executing_agency, structuring_level, source_url, source_updated_at, record)
     VALUES (@code, @name, @category_name, @executing_agency, @structuring_level, @source_url, @source_updated_at, @record)`,
  );
  const insertFts = db.prepare(
    `INSERT INTO procedures_fts (code, name, aliases, category, agency)
     VALUES (@code, @name, @aliases, @category, @agency)`,
  );
  const insertAlias = db.prepare(
    `INSERT INTO aliases (procedure_code, alias, alias_norm) VALUES (?, ?, ?)`,
  );
  const insertProvince = db.prepare(
    `INSERT INTO provinces (name, code, status, merged_into) VALUES (@name, @code, @status, @merged_into)`,
  );

  const seedAll = db.transaction(() => {
    // --- procedures + FTS (merge curated overlay where present) ---
    const proceduresDir = join(DATA, 'procedures');
    const files = readdirSync(proceduresDir).filter((f) => f.endsWith('.json')).sort();
    let full = 0;
    for (const file of files) {
      const base = readJSON(join(proceduresDir, file));
      const code: string = base.code;
      const curatedPath = join(DATA, 'curated', `${code}.json`);
      const hasCurated = existsSync(curatedPath);
      const record = hasCurated ? { ...base, ...readJSON(curatedPath) } : base;
      if (hasCurated) full++;

      const categoryName: string | null = record.category?.name ?? null;
      const agency: string | null = record.executing_agency ?? null;

      insertProc.run({
        code,
        name: record.name,
        category_name: categoryName,
        executing_agency: agency,
        structuring_level: hasCurated ? 'full' : 'raw',
        source_url: record.source.url,
        source_updated_at: record.source.updated_at ?? null,
        record: JSON.stringify(record),
      });

      const aliasList = aliasesByCode.get(code) ?? [];
      insertFts.run({
        code,
        name: normalizeSearch(record.name ?? ''),
        aliases: aliasList.map(normalizeSearch).join(' '),
        category: normalizeSearch(categoryName ?? ''),
        agency: normalizeSearch(agency ?? ''),
      });
    }

    // --- aliases table ---
    let aliasRows = 0;
    for (const [code, list] of aliasesByCode) {
      for (const alias of list) {
        insertAlias.run(code, alias, normalizeSearch(alias));
        aliasRows++;
      }
    }

    // --- provinces (current + defunct) ---
    const provincesFile = join(DATA, 'provinces.json');
    let provinceRows = 0;
    if (existsSync(provincesFile)) {
      const p = readJSON(provincesFile) as {
        current?: { code: string; name: string }[];
        defunct?: { name: string; merged_into: string }[];
      };
      for (const c of p.current ?? []) {
        insertProvince.run({ name: c.name, code: c.code, status: 'current', merged_into: null });
        provinceRows++;
      }
      for (const d of p.defunct ?? []) {
        insertProvince.run({ name: d.name, code: null, status: 'defunct', merged_into: d.merged_into });
        provinceRows++;
      }
    }

    return { procedures: files.length, full, aliasRows, provinceRows };
  });

  const counts = seedAll();
  db.close();

  console.log(
    `seed: ${counts.procedures} procedures (${counts.full} full, ${counts.procedures - counts.full} raw), ` +
      `${counts.aliasRows} aliases, ${counts.provinceRows} provinces → backend/var/opengov.db`,
  );
}

main();
