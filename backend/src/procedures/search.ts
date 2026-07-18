/**
 * Discovery core (ARCHITECTURE.md §2 principle 3): alias exact-match fast path →
 * FTS5 top-20 → cheap-tier LLM rerank. Pure (deps injected) so it is testable with
 * a stub DAO / LLM. Degrades to FTS order when the LLM is unavailable.
 */

import type { Dao } from '../db/dao';
import type { SearchHit } from '../db/types';
import type { LlmClient } from '../openrouter/types';

export interface SearchDeps {
  dao: Pick<Dao, 'aliasExact' | 'ftsSearch'>;
  llm: LlmClient;
}

export async function searchProcedures(
  query: string,
  deps: SearchDeps,
  limit = 5,
): Promise<SearchHit[]> {
  const alias = deps.dao.aliasExact(query);
  if (alias.length) return alias.slice(0, limit);

  const fts = deps.dao.ftsSearch(query, 20);
  if (fts.length <= 1 || !deps.llm.available) return fts.slice(0, limit);

  try {
    const ordered = await rerank(query, fts, deps.llm);
    return ordered.slice(0, limit);
  } catch {
    return fts.slice(0, limit);
  }
}

async function rerank(query: string, candidates: SearchHit[], llm: LlmClient): Promise<SearchHit[]> {
  const list = candidates.map((c) => ({ code: c.code, name: c.name })).slice(0, 20);
  const res = await llm.complete({
    tier: 'cheap',
    jsonMode: true,
    temperature: 0,
    maxTokens: 400,
    messages: [
      {
        role: 'system',
        content:
          'Bạn xếp hạng thủ tục hành chính phù hợp nhất với truy vấn của người dân. ' +
          'Chỉ dùng các mã trong danh sách. Trả về JSON {"order": ["mã1","mã2", ...]} theo thứ tự phù hợp giảm dần.',
      },
      { role: 'user', content: `Truy vấn: "${query}"\nỨng viên:\n${JSON.stringify(list)}` },
    ],
  });
  const order = parseOrder(res.content);
  if (!order.length) return candidates;
  const byCode = new Map(candidates.map((c) => [c.code, c]));
  const ranked: SearchHit[] = [];
  for (const code of order) {
    const hit = byCode.get(code);
    if (hit) {
      ranked.push({ ...hit, via: 'rerank' });
      byCode.delete(code);
    }
  }
  return [...ranked, ...byCode.values()];
}

function parseOrder(content: string | null): string[] {
  if (!content) return [];
  try {
    const obj = JSON.parse(content);
    return Array.isArray(obj?.order) ? obj.order.filter((x: unknown) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
