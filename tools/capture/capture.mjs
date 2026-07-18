// Captures screenshots + HTML snapshots + design tokens from dichvucong.gov.vn
// Output: ./output/{screens,html,tokens.json}
// Note: screenshots/HTML are internal reference for writing CLONE_SPEC.md only.
// The clone recreates all assets from scratch — nothing here ships to production.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve(import.meta.dirname, 'output');

// Routes discovered live on 2026-07-18 (portal is the 2025 revamp under Trung tâm dữ
// liệu quốc gia, Bộ Công an; the old /p/home/*.html routes all 404 now).
const PAGES = [
  {
    name: 'home',
    url: 'https://dichvucong.gov.vn/',
  },
  {
    name: 'dvc-truc-tuyen',
    url: 'https://dichvucong.gov.vn/dvc-dich-vu-cong-truc-tuyen',
  },
  {
    name: 'tthc-search-khai-sinh',
    url: 'https://dichvucong.gov.vn/dvc-ket-qua-thu-tuc?keyword=%C4%91%C4%83ng%20k%C3%BD%20khai%20sinh',
  },
  {
    name: 'detail-khai-sinh',
    url: 'https://dichvucong.gov.vn/thu-tuc-hanh-chinh/019d2bfd-3fe0-70ac-b9d6-5e9e20d6eef7',
  },
  {
    name: 'detail-thuong-tru',
    url: 'https://dichvucong.gov.vn/thu-tuc-hanh-chinh/019d2bf7-7704-7449-9e95-fe7ebb959aa2',
  },
  {
    name: 'detail-gpxd-cap-moi-III-IV-nha-o-rieng-le',
    url: 'https://dichvucong.gov.vn/thu-tuc-hanh-chinh/019d2bfe-9088-744d-aa0a-e846b6dce3d5',
  },
];

const VIEWPORTS = [
  { tag: 'desktop', width: 1440, height: 900 },
  { tag: 'mobile', width: 390, height: 844 },
];

async function extractTokens(page) {
  return page.evaluate(() => {
    const colorCount = new Map();
    const fontCount = new Map();
    const els = document.querySelectorAll('body *');
    let seen = 0;
    for (const el of els) {
      if (seen > 1500) break;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      seen++;
      const cs = getComputedStyle(el);
      for (const prop of ['color', 'backgroundColor', 'borderTopColor']) {
        const v = cs[prop];
        if (!v || v === 'rgba(0, 0, 0, 0)') continue;
        colorCount.set(v, (colorCount.get(v) || 0) + 1);
      }
      const f = cs.fontFamily;
      if (f) fontCount.set(f, (fontCount.get(f) || 0) + 1);
    }
    const rootVars = {};
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }
      for (const rule of rules) {
        if (rule.selectorText === ':root' && rule.style) {
          for (const p of rule.style) {
            if (p.startsWith('--')) rootVars[p] = rule.style.getPropertyValue(p).trim();
          }
        }
      }
    }
    const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
    return {
      title: document.title,
      rootVars,
      topColors: top(colorCount, 25).map(([v, count]) => ({ value: v, count })),
      fonts: top(fontCount, 8).map(([v, count]) => ({ value: v, count })),
    };
  });
}

const browser = await chromium.launch();
await mkdir(path.join(OUT, 'screens'), { recursive: true });
await mkdir(path.join(OUT, 'html'), { recursive: true });

const tokens = {};
for (const { name, url } of PAGES) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      locale: 'vi-VN',
    });
    const page = await ctx.newPage();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
      await page.waitForTimeout(2_000);
      await page.screenshot({
        path: path.join(OUT, 'screens', `${name}.${vp.tag}.png`),
        fullPage: true,
      });
      if (vp.tag === 'desktop') {
        await writeFile(path.join(OUT, 'html', `${name}.html`), await page.content());
        tokens[name] = await extractTokens(page);
      }
      console.log(`ok  ${name} ${vp.tag}`);
    } catch (e) {
      console.error(`ERR ${name} ${vp.tag}: ${e.message}`);
    } finally {
      await ctx.close();
    }
  }
}

await writeFile(path.join(OUT, 'tokens.json'), JSON.stringify(tokens, null, 2));
await browser.close();
console.log('done');
