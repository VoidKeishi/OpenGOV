// OpenRouter client request contract: reasoning disabled (all chain models are
// reasoning-capable — reasoning tokens count toward max_tokens and truncated
// answers mid-sentence), max_tokens forwarded, fallback chain walked in order.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OpenRouterClient } from '../src/openrouter/openrouter.client';
import type { OpenRouterConfig } from '../src/config/config';

const cfg: OpenRouterConfig = {
  apiKey: 'test-key',
  baseUrl: 'http://openrouter.local/api/v1',
  cheapModel: 'primary/model',
  strongModel: 'primary/model',
  fallbackModels: ['fallback/one', 'fallback/two'],
  title: 'test',
};

function withFetch(impl: typeof fetch, fn: () => Promise<void>): Promise<void> {
  const orig = globalThis.fetch;
  globalThis.fetch = impl;
  return fn().finally(() => {
    globalThis.fetch = orig;
  });
}

test('complete() sends reasoning off + max_tokens, walks the fallback chain in order', async () => {
  const bodies: any[] = [];
  await withFetch(
    (async (_url: any, init: any) => {
      const body = JSON.parse(init.body);
      bodies.push(body);
      if (body.model !== 'fallback/two') {
        return { ok: false, status: 402, text: async () => 'insufficient credits' } as any;
      }
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'xin chào' }, finish_reason: 'stop' }] }),
      } as any;
    }) as typeof fetch,
    async () => {
      const client = new OpenRouterClient(cfg);
      const res = await client.complete({
        tier: 'strong',
        messages: [{ role: 'user', content: 'hi' }],
        maxTokens: 1200,
      });
      assert.equal(res.content, 'xin chào');
      assert.deepEqual(
        bodies.map((b) => b.model),
        ['primary/model', 'fallback/one', 'fallback/two'],
      );
      for (const b of bodies) {
        assert.deepEqual(b.reasoning, { effort: 'none' });
        assert.equal(b.max_tokens, 1200);
      }
    },
  );
});

test('complete() throws the last chain error when every model fails', async () => {
  await withFetch(
    (async () => ({ ok: false, status: 500, text: async () => 'boom' }) as any) as typeof fetch,
    async () => {
      const client = new OpenRouterClient(cfg);
      await assert.rejects(
        client.complete({ tier: 'strong', messages: [{ role: 'user', content: 'hi' }] }),
        /OpenRouter 500/,
      );
    },
  );
});

test('a length-cut response still returns content (finish_reason=length is logged, not fatal)', async () => {
  await withFetch(
    (async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'đứt giữa chừ' }, finish_reason: 'length' }] }),
    }) as any) as typeof fetch,
    async () => {
      const client = new OpenRouterClient(cfg);
      const res = await client.complete({ tier: 'strong', messages: [{ role: 'user', content: 'hi' }] });
      assert.equal(res.content, 'đứt giữa chừ');
    },
  );
});
