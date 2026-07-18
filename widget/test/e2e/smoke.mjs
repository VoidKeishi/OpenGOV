// Playwright smoke over acceptance pages (WIDGET.md §11 + QA). Plain script +
// playwright-core, mirroring dichvucong/scripts/qa-journey.mjs — no test runner.
// Self-contained: spawns the backend (degraded, PORT 3210) + serve.mjs (8790),
// runs every scenario in a fresh browser context, exits non-zero on failure.
//
// Route mocks cover what the backend can't do deterministically pre-R1/R2 and
// without an LLM key: /schemas fake entry (422 path), GET /sessions/:id with
// case_facts (gated-checkbox path), aborted routes (network/offline paths).
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const WIDGET_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REPO_ROOT = resolve(WIDGET_ROOT, '..');
const BACKEND_PORT = 3210;
const SERVE_PORT = 8790;
const ORIGIN = `http://localhost:${SERVE_PORT}`;

// ---------- tiny harness ----------

const failures = [];
let current = '';
function check(cond, label) {
  const line = `${current}: ${label}`;
  if (cond) console.log(`  ok  ${line}`);
  else {
    console.error(`  FAIL ${line}`);
    failures.push(line);
  }
}

async function waitFor(fn, ms = 8000, step = 100) {
  const t0 = Date.now();
  for (;;) {
    if (await fn().catch(() => false)) return true;
    if (Date.now() - t0 > ms) return false;
    await new Promise((r) => setTimeout(r, step));
  }
}

async function waitHttp(url, ms = 15000) {
  return waitFor(async () => (await fetch(url)).status < 500, ms, 250);
}

// ---------- processes ----------

const procs = [];
function run(cmd, args, opts) {
  const p = spawn(cmd, args, { stdio: 'ignore', ...opts });
  procs.push(p);
  return p;
}
function cleanup() {
  for (const p of procs) {
    try {
      p.kill();
    } catch {
      /* already gone */
    }
  }
}
process.on('exit', cleanup);

// ---------- page helpers ----------

async function newPage(context, path = '/', { collect } = {}) {
  const page = await context.newPage();
  page.on('pageerror', (e) => {
    check(false, `pageerror: ${e}`);
  });
  if (collect) page.on('request', (r) => collect.push(r.url()));
  await page.goto(`${ORIGIN}${path}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#opengov-widget', { state: 'attached' });
  return page;
}

const openPanel = async (page) => {
  await page.locator('.og-bubble').click();
  await page.waitForSelector('.og-panel');
};

async function sendChat(page, text) {
  await page.locator('.og-input').fill(text);
  await page.locator('.og-send').click();
}

async function fillValidForm(page) {
  await page.fill('[name="ho_ten_khai_sinh"]', 'Nguyễn Văn A');
  await page.fill('[name="ngay_sinh"]', '1990-01-15');
  await page.check('input[name="gioi_tinh"][value="Nam"]');
  await page.fill('[name="so_dinh_danh_ca_nhan"]', '012345678901');
  await page.fill('[name="ho_ten_chu_ho"]', 'Nguyễn Văn B');
  await page.selectOption('[name="moi_quan_he_voi_chu_ho"]', 'Vợ');
  await page.fill('[name="so_dinh_danh_ca_nhan_chu_ho"]', '012345678902');
  await page.fill('[name="noi_dung_de_nghi"]', 'Đăng ký thường trú tại phường Minh Xuân, tỉnh Tuyên Quang');
}

// ---------- scenarios ----------

async function scMountNoLeak(browser) {
  current = 'mount/no-leak';
  const context = await browser.newContext();
  const requests = [];
  const page = await newPage(context, '/', { collect: requests });
  await page.waitForTimeout(1000);

  check((await page.locator('.og-bubble').count()) === 1, 'bubble mounted');
  const hosts = await page.evaluate(() => document.querySelectorAll('#opengov-widget').length);
  check(hosts === 1, 'exactly one host element');
  const sheets = await page.evaluate(() => document.styleSheets.length);
  check(sheets === 1, `no global stylesheet added (document has ${sheets})`);
  const h1Font = await page.evaluate(() => getComputedStyle(document.querySelector('h1')).fontFamily);
  check(!h1Font.includes('system-ui'), 'host h1 font untouched by widget font stack');

  // full flow, then assert every request stayed on the embed origin (§11)
  await openPanel(page);
  await sendChat(page, 'xin chào');
  await waitFor(async () => !(await page.locator('.og-input').isDisabled()));
  const offOrigin = requests.filter((u) => !u.startsWith(ORIGIN));
  check(offOrigin.length === 0, `no request outside data-backend (${offOrigin.join(', ') || 'none'})`);

  // double-mount guard: inject the script a second time
  await page.evaluate(() => {
    const s = document.createElement('script');
    s.src = '/dist/opengov.js';
    s.dataset.backend = location.origin;
    document.body.appendChild(s);
  });
  await page.waitForTimeout(500);
  check(
    (await page.evaluate(() => document.querySelectorAll('#opengov-widget').length)) === 1,
    'second script tag mounts nothing (idempotent)',
  );
  await context.close();
}

async function scDetectStates(browser) {
  current = 'detect-states';
  const context = await browser.newContext();

  const page = await newPage(context, '/');
  await page.waitForTimeout(1000);
  check((await page.locator('.og-badge').count()) === 1, 'badge on form page (READY)');
  await openPanel(page);
  check(await page.locator('.og-checkbtn').isEnabled(), 'check button enabled on form page');
  check((await page.locator('.og-chip').count()) === 4, 'context chip joins the 3 static chips');

  const blank = await newPage(context, '/test/blank.html');
  await blank.waitForTimeout(1000);
  check((await blank.locator('.og-badge').count()) === 0, 'no badge on blank page');
  await openPanel(blank);
  check((await blank.locator('.og-checkrow').count()) === 0, 'check button hidden (NONE)');
  check((await blank.locator('.og-chip').count()) === 3, 'only static chips on blank page');

  const nofields = await newPage(context, '/nop-truc-tuyen/dang-ky-thuong-tru');
  await nofields.waitForTimeout(1000);
  check((await nofields.locator('.og-badge').count()) === 0, 'no badge on NOFIELDS page');
  await openPanel(nofields);
  const btn = nofields.locator('.og-checkbtn');
  check((await btn.count()) === 1 && (await btn.isDisabled()), 'check button disabled (NOFIELDS)');
  check(
    (await btn.getAttribute('title')) === 'Mở bước Tờ khai để kiểm tra',
    'NOFIELDS tooltip text',
  );
  await context.close();
}

async function scDegradedChat(browser) {
  current = 'degraded-chat';
  const context = await browser.newContext();
  const page = await newPage(context, '/');
  await openPanel(page);
  await waitFor(async () => (await page.locator('.og-banner').count()) === 1);
  check(
    (await page.locator('.og-banner').textContent()).includes('Chế độ giới hạn'),
    'degraded banner shown',
  );
  await sendChat(page, 'Tôi muốn đăng ký thường trú');
  check(await page.locator('.og-input').isDisabled(), 'input disabled during turn');
  await waitFor(async () => !(await page.locator('.og-input').isDisabled()));
  const prose = await page.locator('.og-prose').last().textContent();
  check(prose.length > 10, `degraded reply rendered verbatim (${prose.slice(0, 40)}…)`);
  check((await page.locator('.og-chips').count()) === 0, 'chips hidden after first turn');
  await context.close();
}

async function scValidateFlow(browser) {
  current = 'validate-flow';
  const context = await browser.newContext();
  const page = await newPage(context, '/');
  await page.fill('[name="so_dinh_danh_ca_nhan"]', '12345678901'); // 11 digits
  await page.fill('[name="noi_dung_de_nghi"]', 'chuyển về huyện X, tỉnh Hà Giang');
  await openPanel(page);
  await page.locator('.og-checkbtn').click();
  await waitFor(async () => (await page.locator('.og-result-head').count()) === 1);

  const head = await page.locator('.og-result-head').textContent();
  check(/\d+ lỗi, \d+ cảnh báo/.test(head), `header counts by severity (${head.trim()})`);
  const items = await page.locator('.og-result-item').allTextContents();
  check(items.some((t) => t.includes('12 chữ số')), 'E_DINH_DANH_12 shown for the 11-digit id');
  check(items.some((t) => t.includes('bắt buộc')), 'E_REQUIRED shown for empty required fields');
  check(
    items.some((t) => t.includes('Hà Giang') && t.includes('Tuyên Quang')),
    'E_TINH_SAP_NHAP names old → new province',
  );
  check(
    items.some((t) => t.includes('Số định danh cá nhân')),
    'field label resolved from the host DOM',
  );
  const errorsFirst = items.findIndex((t) => t.includes('2 cấp')); // E_CAP_HUYEN warning
  check(errorsFirst === items.length - 1, 'warning sorted after errors');

  // scroll-to-field: click the Hà Giang item → textarea focused
  await page
    .locator('.og-result-item', { hasText: 'Hà Giang' })
    .click();
  const focused = await waitFor(async () =>
    page.evaluate(() => document.activeElement?.name === 'noi_dung_de_nghi'),
  );
  check(focused, 'click scrolls + focuses the offending field');

  // fix everything → re-check → green box
  await fillValidForm(page);
  await page.locator('.og-card .og-link-btn', { hasText: 'Kiểm tra lại' }).click();
  await waitFor(async () => (await page.locator('.og-greenbox').count()) === 1);
  const green = await page.locator('.og-greenbox').textContent();
  check(green.includes('Không phát hiện lỗi'), 'green box after fixing');
  check(green.includes('Đã kiểm tra 11 trường có quy tắc'), 'scope line with field count');
  check(green.includes('ngữ nghĩa bằng AI được bỏ qua'), 'degraded scope note (llm skipped)');
  await context.close();
}

async function scGatedCheckbox(browser) {
  current = 'gated-checkbox';
  const context = await browser.newContext();
  // Seed a sid so the widget asks the server for case_facts, then mock the
  // session endpoint: truong_hop=thue_muon_o_nho arms the gated required rule
  // (engine `when` is fail-closed) — /validate itself stays real.
  await context.route('**/sessions/e2e-gated', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ messages: [], case_facts: { truong_hop: 'thue_muon_o_nho' } }),
    }),
  );
  const page = await context.newPage();
  await page.addInitScript(() => sessionStorage.setItem('og.sid', 'e2e-gated'));
  await page.goto(`${ORIGIN}/`, { waitUntil: 'networkidle' });
  await fillValidForm(page); // valid, but the consent checkbox stays UNCHECKED
  await openPanel(page);
  await page.locator('.og-checkbtn').click();
  await waitFor(async () => (await page.locator('.og-result-head, .og-greenbox').count()) >= 1);
  const items = await page.locator('.og-result-item').allTextContents().catch(() => []);
  check(
    items.some((t) => t.includes('chủ sở hữu')),
    'unchecked gated checkbox fires ERR-TT-06 (unchecked = "")',
  );
  check(
    (await page.locator('.og-chip', { hasText: 'Kể thêm' }).count()) === 0,
    'no tell-more chip when case_facts present',
  );

  await page.check('[name="y_kien_chu_so_huu_dong_y"]');
  await page.locator('.og-card .og-link-btn', { hasText: 'Kiểm tra lại' }).click();
  await waitFor(async () => (await page.locator('.og-greenbox').count()) === 1);
  check(true, 'ticked checkbox clears the error (checked → value sent)');
  await context.close();
}

async function scRestoreAndNewSession(browser) {
  current = 'restore/new-session';
  const context = await browser.newContext();
  const page = await newPage(context, '/');
  await openPanel(page);
  await sendChat(page, 'câu hỏi để lưu');
  await waitFor(async () => !(await page.locator('.og-input').isDisabled()));
  await page.fill('[name="so_dinh_danh_ca_nhan"]', '123'); // force one error
  await page.locator('.og-checkbtn').click();
  await waitFor(async () => (await page.locator('.og-result-head').count()) === 1);
  const sid = await page.evaluate(() => sessionStorage.getItem('og.sid'));
  check(!!sid, 'sid persisted after chat');

  await page.reload({ waitUntil: 'networkidle' });
  await waitFor(async () => (await page.locator('.og-panel').count()) === 1);
  check(true, 'panel reopens after reload (og.open)');
  check((await page.locator('.og-turn-user').count()) === 1, 'user turn restored from cache');
  check((await page.locator('.og-result-head').count()) === 1, 'check result restored from cache');

  // cache gone but sid kept → text-only rebuild from the server + notice (§8).
  // Simulated in a fresh tab (per-tab storage = genuinely empty cache; a same-tab
  // delete would be undone by the pagehide flush).
  const tab3 = await context.newPage();
  await tab3.addInitScript((s) => sessionStorage.setItem('og.sid', s), sid);
  await tab3.goto(`${ORIGIN}/`, { waitUntil: 'networkidle' });
  await tab3.locator('.og-bubble').click();
  await waitFor(async () => (await tab3.locator('.og-notice').count()) === 1);
  check(
    (await tab3.locator('.og-notice').textContent().catch(() => '')) ===
      'Khôi phục lịch sử rút gọn.',
    'text-only server restore shows the notice',
  );
  check((await tab3.locator('.og-turn-user').count()) >= 1, 'server messages rebuilt as turns');
  check((await tab3.locator('.og-result-head').count()) === 0, 'cards/results not in text-only restore');
  await tab3.close();

  // second tab = independent session (per-tab sessionStorage)
  const tab2 = await newPage(context, '/');
  await openPanel(tab2);
  check((await tab2.locator('.og-turn-user').count()) === 0, 'second tab starts a fresh transcript');

  // Cuộc mới
  await page.locator('button[title="Cuộc mới"]').click();
  await waitFor(async () => (await page.locator('.og-turn-user').count()) === 0);
  check((await page.locator('.og-chip').count()) >= 3, 'back to welcome chips');
  const sid2 = await waitFor(async () =>
    page.evaluate((old) => sessionStorage.getItem('og.sid') !== old, sid),
  );
  check(sid2, 'new session id minted');
  await context.close();
}

async function scValidate422(browser) {
  current = 'validate-422';
  const context = await browser.newContext();
  // /schemas returns ONLY a fake entry whose field_keys match the acceptance
  // form → detect READY with a code the backend has no schema for → real 422.
  await context.route('**/schemas', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        {
          procedure_code: '9.999999',
          form_ref: 'thu-tuc-gia',
          field_keys: ['ho_ten_khai_sinh', 'ngay_sinh', 'so_dinh_danh_ca_nhan'],
        },
      ]),
    }),
  );
  const page = await newPage(context, '/');
  await page.waitForTimeout(1000);
  await openPanel(page);
  await page.locator('.og-checkbtn').click();
  await waitFor(async () => (await page.locator('.og-error-box').count()) === 1);
  const msg = await page.locator('.og-error-box').textContent();
  check(msg.includes('Chưa có schema xác thực cho thủ tục 9.999999'), '422 message verbatim');
  check((await page.locator('.og-retry').count()) === 0, 'no retry offered on 422');
  await context.close();
}

async function scNetworkErrorRetry(browser) {
  current = 'network-error-retry';
  const context = await browser.newContext();
  let broken = true;
  await context.route('**/chat', (route) => (broken ? route.abort() : route.fallback()));
  const page = await newPage(context, '/');
  await openPanel(page);
  await sendChat(page, 'câu này sẽ lỗi mạng');
  await waitFor(async () => (await page.locator('.og-retry').count()) === 1);
  check(
    (await page.locator('.og-error-box').textContent()).includes('Không kết nối được'),
    'error bubble on dead /chat',
  );
  check(!(await page.locator('.og-input').isDisabled()), 'input reopens after error');

  broken = false; // backend "comes back"
  await page.locator('.og-retry').click();
  await waitFor(async () => {
    const proses = await page.locator('.og-prose').allTextContents();
    return proses.some((t) => t.length > 10);
  });
  check((await page.locator('.og-turn-user').count()) === 1, 'retry does not duplicate the user turn');
  check((await page.locator('.og-retry').count()) === 0, 'retry succeeds when backend returns');
  await context.close();
}

async function scOffline(browser) {
  current = 'offline';
  const context = await browser.newContext();
  await context.route('**/health', (route) => route.abort());
  const page = await newPage(context, '/');
  await openPanel(page);
  await waitFor(async () => (await page.locator('.og-banner-offline').count()) === 1);
  check(
    (await page.locator('.og-banner-offline').textContent()).includes('Không kết nối được'),
    'OFFLINE banner when /health unreachable',
  );
  await context.unroute('**/health');
  await page.locator('.og-banner-offline button').click();
  await waitFor(async () => (await page.locator('.og-banner-offline').count()) === 0);
  check((await page.locator('.og-banner').count()) === 1, 'recovers to degraded banner on retry');
  await context.close();
}

async function scMobileSheet(browser) {
  current = 'mobile-375';
  const context = await browser.newContext({ viewport: { width: 375, height: 700 } });
  const page = await newPage(context, '/');
  await openPanel(page);
  const box = await page.locator('.og-panel').boundingBox();
  check(box.width === 375 && box.height >= 690, `sheet fills the viewport (${box.width}×${box.height})`);
  await page.locator('button[title="Thu nhỏ"]').click();
  check((await page.locator('.og-bubble').count()) === 1, 'sheet minimizes back to the bubble');

  await openPanel(page);
  await page.fill('[name="so_dinh_danh_ca_nhan"]', '123');
  await page.locator('.og-checkbtn').click();
  await waitFor(async () => (await page.locator('.og-result-item').count()) >= 1);
  await page.locator('.og-result-item', { hasText: '12 chữ số' }).click();
  const minimized = await waitFor(async () => (await page.locator('.og-bubble').count()) === 1);
  check(minimized, 'error click auto-minimizes the sheet');
  const focused = await waitFor(async () =>
    page.evaluate(() => document.activeElement?.name === 'so_dinh_danh_ca_nhan'),
  );
  check(focused, 'then scrolls + focuses the field');
  await context.close();
}

async function scHostileReset(browser) {
  current = 'hostile-reset';
  const context = await browser.newContext();
  const page = await newPage(context, '/test/reset.html');
  const box = await page.locator('.og-bubble').boundingBox();
  check(box && Math.round(box.width) === 56, `bubble keeps its size under *{all:unset} (${box?.width})`);
  await openPanel(page);
  check(
    (await page.locator('.og-header-title').textContent()) === 'OpenGOV — Trợ lý thủ tục',
    'panel renders inside hostile host',
  );
  const headerBg = await page.locator('.og-header').evaluate((el) => getComputedStyle(el).backgroundColor);
  check(headerBg === 'rgb(206, 122, 88)', `accent header styled (${headerBg})`);
  await context.close();
}

async function scDirectBackend(browser) {
  current = 'direct-backend';
  // data-backend → the real backend port: real CORS + real GET /schemas (R1).
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${ORIGIN}/test/acceptance.html?backend=http://localhost:${BACKEND_PORT}`, {
    waitUntil: 'networkidle',
  });
  await page.waitForSelector('#opengov-widget', { state: 'attached' });
  await page.waitForTimeout(1000);
  check((await page.locator('.og-badge').count()) === 1, 'badge via real /schemas (R1) cross-origin');
  await openPanel(page);
  check(await page.locator('.og-checkbtn').isEnabled(), 'check enabled via real /schemas');
  await page.fill('[name="so_dinh_danh_ca_nhan"]', '123');
  await page.locator('.og-checkbtn').click();
  await waitFor(async () => (await page.locator('.og-result-head').count()) === 1);
  check(true, 'validate flow works cross-origin (real CORS)');
  await sendChat(page, 'chào cross-origin');
  await waitFor(async () => !(await page.locator('.og-input').isDisabled()));
  const prose = await page.locator('.og-prose').last().textContent();
  check(prose.length > 10, 'cross-origin chat works (real CORS)');
  await context.close();

  // R1-missing degrade still holds: kill /schemas → check feature silently off.
  const degraded = await browser.newContext();
  await degraded.route('**/schemas', (route) => route.abort());
  const dpage = await degraded.newPage();
  await dpage.goto(`${ORIGIN}/test/acceptance.html?backend=http://localhost:${BACKEND_PORT}`, {
    waitUntil: 'networkidle',
  });
  await dpage.waitForSelector('#opengov-widget', { state: 'attached' });
  await dpage.waitForTimeout(1000);
  check((await dpage.locator('.og-badge').count()) === 0, 'no badge when /schemas unreachable');
  await openPanel(dpage);
  check((await dpage.locator('.og-checkrow').count()) === 0, 'check hidden when /schemas unreachable');
  await degraded.close();
}

async function scCardsMocked(browser) {
  current = 'cards-mocked';
  // Degraded backend never emits cards — replay a canned SSE turn (real wire
  // framing) to exercise buffering, reveal order, checklist ticks, fragments.
  const EVENTS = [
    '{"type":"session","session_id":"e2e-cards"}',
    '{"type":"tool","name":"get_procedure","args":{}}',
    '{"type":"card","payload":{"type":"procedure","payload":{"code":"1.004222","name":"Đăng ký thường trú","executing_agency":"Công an cấp xã","source_url":"https://dichvucong.gov.vn/p/home/dvc-tthc-thu-tuc-hanh-chinh-chi-tiet.html?ma_thu_tuc=1.004222","updated_at":"2026-07-01"}}}',
    '{"type":"card","payload":{"type":"checklist","payload":{"code":"1.004222","groups":[{"id":"g1","label":"Giấy tờ bắt buộc","items":[{"id":"to-khai","label":"Tờ khai CT01","quantity":{"original":1,"copy":0}}]},{"id":"g2","label":"Giấy tờ chỗ ở hợp pháp","type":"ONE_OF","items":[{"id":"so-do","label":"Sổ đỏ","quantity":{"original":0,"copy":1}},{"id":"hd-thue","label":"Hợp đồng thuê nhà","quantity":{"original":1,"copy":0},"conditional":true}]}]}}}',
    '{"type":"card","payload":{"type":"legal_fragments","payload":{"code":"1.004222","fragments":[{"id":"f1","article":"Điều 21","doc_code":"68/2020/QH14","doc_title":"Luật Cư trú 2020","title":"Hồ sơ đăng ký thường trú","source_url":"https://vanban.chinhphu.vn/x"}]}}}',
    '{"type":"token","text":"Bạn cần chuẩn bị "}',
    '{"type":"token","text":"**Tờ khai CT01**. Chi tiết ở thẻ bên dưới."}',
    '{"type":"done","cards_count":3}',
  ];
  const body = EVENTS.map((j) => `data: ${j}\n\n`).join('') + 'event: end\ndata: {}\n\n';
  const context = await browser.newContext();
  await context.route('**/chat', (route) =>
    route.fulfill({ contentType: 'text/event-stream', body }),
  );
  const page = await newPage(context, '/');
  await openPanel(page);
  await sendChat(page, 'cần giấy tờ gì?');
  await waitFor(async () => (await page.locator('.og-cards').count()) === 1);

  check(
    (await page.locator('.og-prose strong').textContent().catch(() => '')) === 'Tờ khai CT01',
    'mini-markdown bold in prose',
  );
  check((await page.locator('.og-card').count()) === 3, 'cards revealed below prose after end');
  check(
    (await page.locator('.og-card', { hasText: 'MỘT TRONG' }).count()) === 1,
    'ONE_OF group label',
  );
  check(
    (await page.locator('.og-badge-pill', { hasText: 'tùy trường hợp' }).count()) === 1,
    'conditional item badge',
  );
  check(
    (await page.locator('.og-check-item', { hasText: '1 bản chính' }).count()) >= 1,
    'quantity renders only >0 parts',
  );
  const fragHead = page.locator('.og-collapse-head');
  check(
    (await fragHead.textContent()).includes('1 trích đoạn'),
    'legal_fragments collapsed by default',
  );
  check((await page.locator('.og-fragment').count()) === 0, 'fragments hidden until expanded');
  await fragHead.click();
  check(
    (await page.locator('.og-fragment a').getAttribute('href')).startsWith('https://vanban'),
    'fragment source link after expand',
  );

  // tick a checklist item, reload, tick survives (cache §8)
  await page.locator('.og-check-item input').first().check();
  await page.waitForTimeout(600); // debounced persist
  await page.reload({ waitUntil: 'networkidle' });
  await waitFor(async () => (await page.locator('.og-check-item input').count()) >= 1);
  check(
    await page.locator('.og-check-item input').first().isChecked(),
    'checklist tick survives reload',
  );
  await context.close();
}

// ---------- main ----------

console.log('[e2e] starting backend (degraded) + serve.mjs…');
run('node', ['dist/src/main.js'], {
  cwd: resolve(REPO_ROOT, 'backend'),
  env: { ...process.env, PORT: String(BACKEND_PORT), OPENROUTER_API_KEY: '' },
});
run('node', [resolve(WIDGET_ROOT, 'test/serve.mjs')], {
  env: {
    ...process.env,
    PORT: String(SERVE_PORT),
    BACKEND: `http://localhost:${BACKEND_PORT}`,
  },
});
if (!(await waitHttp(`http://localhost:${BACKEND_PORT}/health`))) {
  console.error('[e2e] backend did not come up — run `pnpm --dir backend build && pnpm --dir backend seed` first');
  process.exit(2);
}
if (!(await waitHttp(`${ORIGIN}/schemas`))) {
  console.error('[e2e] serve.mjs did not come up');
  process.exit(2);
}

let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
} catch (err) {
  console.error('[e2e] cannot launch Chrome (channel "chrome"):', err.message);
  console.error('      install Google Chrome, or run dichvucong QA scripts once to verify the setup.');
  process.exit(2);
}

const scenarios = [
  scMountNoLeak,
  scDetectStates,
  scDegradedChat,
  scValidateFlow,
  scGatedCheckbox,
  scRestoreAndNewSession,
  scValidate422,
  scNetworkErrorRetry,
  scOffline,
  scMobileSheet,
  scHostileReset,
  scDirectBackend,
  scCardsMocked,
];

for (const sc of scenarios) {
  console.log(`\n[e2e] ${sc.name}`);
  try {
    await sc(browser);
  } catch (err) {
    check(false, `threw: ${err.message}`);
  }
}

await browser.close();
cleanup();

console.log(`\n[e2e] ${failures.length === 0 ? 'ALL PASS' : `${failures.length} FAILURE(S)`}`);
for (const f of failures) console.error(`  - ${f}`);
process.exit(failures.length === 0 ? 0 : 1);
