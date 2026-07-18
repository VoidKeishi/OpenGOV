// Post-build gate: the embed promise is ONE file ≤60KB gzip (WIDGET.md §2).
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const LIMIT = 60 * 1024;
const dist = join(dirname(fileURLToPath(import.meta.url)), '../dist');

const files = readdirSync(dist);
if (files.length !== 1 || files[0] !== 'opengov.js') {
  console.error(`FAIL: dist/ must contain exactly opengov.js, got: ${files.join(', ')}`);
  process.exit(1);
}

const raw = readFileSync(join(dist, 'opengov.js'));
const gz = gzipSync(raw, { level: 9 }).length;
console.log(`dist/opengov.js  raw ${(raw.length / 1024).toFixed(1)}KB  gzip ${(gz / 1024).toFixed(1)}KB  (budget 60KB gzip)`);
if (gz > LIMIT) {
  console.error(`FAIL: gzip size ${gz} exceeds ${LIMIT} bytes`);
  process.exit(1);
}
