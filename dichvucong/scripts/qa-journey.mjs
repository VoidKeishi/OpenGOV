// QA hành trình đầy đủ (CLONE_SPEC.md mục 8): trang chủ → tìm kiếm → chi tiết
// → nộp trực tuyến → đăng nhập giả → wizard 4 bước → xác nhận. Chạy cho cả 5 thủ
// tục, ở cả 1440px và 390px, fail nếu có lỗi console/pageerror.
// Kiểm thêm: badge "Toàn trình" đúng và chỉ ở 3 slug, entry "vỏ" không phải link.
// Dùng: node scripts/qa-journey.mjs (dev server phải đang chạy)
import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";

const BASE = process.env.QA_BASE ?? "http://localhost:3000";

const JOURNEYS = [
  { keyword: "đăng ký khai sinh", slug: "dang-ky-khai-sinh", prefix: "DVC-KS-", toanTrinh: false },
  { keyword: "đăng ký thường trú", slug: "dang-ky-thuong-tru", prefix: "DVC-TT-", toanTrinh: true },
  { keyword: "giấy phép xây dựng", slug: "cap-gpxd-nha-o-rieng-le", prefix: "DVC-XD-", toanTrinh: false },
  { keyword: "thành lập doanh nghiệp tư nhân", slug: "dang-ky-thanh-lap-dntn", prefix: "DVC-DN-", toanTrinh: true },
  { keyword: "nội quy lao động", slug: "dang-ky-noi-quy-lao-dong", prefix: "DVC-NQ-", toanTrinh: true },
];

const VIEWPORTS = [
  ["desktop", { width: 1440, height: 900 }],
  ["mobile", { width: 390, height: 844 }],
];

// Tệp giả để đính kèm ở bước 3
const FAKE_FILE = "/tmp/dvc-demo-giay-to.pdf";
writeFileSync(FAKE_FILE, "%PDF-1.4 demo");

const browser = await chromium.launch({ channel: "chrome", headless: true });
let failures = 0;

for (const [vpName, viewport] of VIEWPORTS) {
  // Badge ở /dich-vu-cong-truc-tuyen: tab Công Dân 1 chip (thường trú),
  // tab Doanh nghiệp 2 chip (DNTN + nội quy LĐ) đứng đầu list — CLONE_SPEC.md 3.3
  {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    try {
      await page.goto(BASE + "/dich-vu-cong-truc-tuyen", {
        waitUntil: "networkidle",
      });
      const cd = await page.getByText("Toàn trình", { exact: true }).count();
      if (cd !== 1) throw new Error(`tab Công Dân: ${cd} chip Toàn trình, muốn 1`);
      await page.click('button[role="tab"]:has-text("Doanh nghiệp")');
      const dn = await page.getByText("Toàn trình", { exact: true }).count();
      if (dn !== 2)
        throw new Error(`tab Doanh nghiệp: ${dn} chip Toàn trình, muốn 2`);
      const rows = await page.locator("ul.mt-2 > li").allTextContents();
      if (
        !rows[0]?.includes("doanh nghiệp tư nhân") ||
        !rows[1]?.includes("nội quy lao động")
      )
        throw new Error("2 thủ tục toàn trình không đứng đầu tab Doanh nghiệp");
      console.log(`PASS ${vpName}/dich-vu-cong-truc-tuyen — badge + sort OK`);
    } catch (err) {
      failures++;
      console.error(`FAIL ${vpName}/dich-vu-cong-truc-tuyen: ${err.message}`);
    }
    await context.close();
  }

  for (const j of JOURNEYS) {
    const label = `${vpName}/${j.slug}`;
    const errors = [];
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
    });
    page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
    // Không được có request ra ngoài (CLONE_SPEC.md mục 8)
    page.on("request", (req) => {
      const url = req.url();
      if (!url.startsWith(BASE) && !url.startsWith("data:"))
        errors.push(`request ra ngoài: ${url}`);
    });

    try {
      // 1. Trang chủ → tìm kiếm
      await page.goto(BASE + "/", { waitUntil: "networkidle" });
      await page.fill('input[name="keyword"]', j.keyword);
      await page.press('input[name="keyword"]', "Enter");
      await page.waitForURL("**/tim-kiem**");
      // 2a. Badge "Toàn trình" đúng theo thủ tục + entry vỏ không phải link
      const badge = await page.evaluate((slug) => {
        const a = document.querySelector(`a[href="/thu-tuc/${slug}"]`);
        const row = a?.closest("li");
        const shells = [...document.querySelectorAll("li")].filter((li) =>
          li.textContent.includes("Đang cập nhật"),
        );
        return {
          hasBadge: !!row && row.textContent.includes("Toàn trình"),
          shellCount: shells.length,
          shellLinks: shells.filter((li) => li.querySelector("a")).length,
        };
      }, j.slug);
      if (badge.hasBadge !== j.toanTrinh)
        throw new Error(
          `badge Toàn trình: có=${badge.hasBadge}, muốn=${j.toanTrinh}`,
        );
      if (badge.shellLinks)
        throw new Error(`${badge.shellLinks} entry vỏ vẫn render như link`);
      if (j.slug === "dang-ky-khai-sinh" && badge.shellCount === 0)
        throw new Error('search khai sinh không thấy entry vỏ "Đang cập nhật"');
      // 2b. Kết quả → chi tiết
      await page.click(`a[href="/thu-tuc/${j.slug}"]`);
      await page.waitForURL(`**/thu-tuc/${j.slug}`);
      // 3. Nộp trực tuyến → modal đăng nhập tự bật (chưa đăng nhập)
      await page.click(`a[href="/nop-truc-tuyen/${j.slug}"]`);
      await page.waitForURL(`**/nop-truc-tuyen/${j.slug}`);
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      await page.click('[role="dialog"] button:has-text("Đăng nhập")');
      // 4. Bước 1: chọn tỉnh (+ phường/xã nếu thủ tục không phải cấp tỉnh)
      await page.waitForSelector("#chon_tinh");
      await page.selectOption("#chon_tinh", "Thành phố Hà Nội");
      if (await page.$("#chon_phuong_xa"))
        await page.selectOption("#chon_phuong_xa", "Phường Hoàn Kiếm");
      const clickNext = () => page.click('button[form="wizard-form"]');
      await clickNext();
      // 5. Bước 2: thử validate native (submit thiếu trường bắt buộc phải bị chặn)
      await page.waitForSelector("form#wizard-form h2");
      await clickNext();
      const stillStep2 = await page
        .locator('form#wizard-form h2')
        .first()
        .textContent();
      if (!stillStep2 || stillStep2.includes("Giấy tờ"))
        throw new Error("native required không chặn submit ở bước 2");
      // Điền mọi field required còn trống của bước 2 (chạy 2 lượt:
      // lượt 2 điền các select phường/xã chỉ có options sau khi chọn tỉnh)
      const fillStep2 = () =>
        page.evaluate(() => {
        const form = document.querySelector("form#wizard-form");
        for (const el of form.querySelectorAll("[required]")) {
          if (el.type === "radio") {
            const group = [...form.querySelectorAll(`input[name="${el.name}"]`)];
            if (!group.some((r) => r.checked)) el.click();
            continue;
          }
          if (el.type === "checkbox") {
            if (!el.checked) el.click();
            continue;
          }
          if (el.value) continue;
          const set = (val) => {
            const proto =
              el instanceof HTMLTextAreaElement
                ? HTMLTextAreaElement.prototype
                : el instanceof HTMLSelectElement
                  ? HTMLSelectElement.prototype
                  : HTMLInputElement.prototype;
            Object.getOwnPropertyDescriptor(proto, "value").set.call(el, val);
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
          };
          if (el instanceof HTMLSelectElement) {
            const opt = [...el.options].find((o) => o.value);
            if (opt) set(opt.value);
          } else if (el.type === "date") {
            set("2026-03-15");
          } else if (el.type === "number") {
            set("3");
          } else if (el.type === "tel") {
            set("0912345678");
          } else if (el.type === "email") {
            set("demo@example.com");
          } else if (/^\[0-9\]\{\d+\}$/.test(el.pattern ?? "")) {
            const n = Number(el.pattern.match(/\{(\d+)\}/)[1]);
            set("0010990123456789".slice(0, n));
          } else {
            set("Demo " + el.name);
          }
        }
      });
      await fillStep2();
      await fillStep2();
      // Riêng CT01: thử bảng thành viên động (thêm 2 dòng, điền, xoá 1)
      if (j.slug === "dang-ky-thuong-tru") {
        await page.click('button:has-text("Thêm thành viên")');
        await page.click('button:has-text("Thêm thành viên")');
        await page.fill('[name="thanh_vien_0_ho_ten"]', "Nguyễn Thị B");
        await page.fill('[name="thanh_vien_0_so_dinh_danh_ca_nhan"]', "001120098765");
        await page.click('[aria-label="Xoá thành viên 2"]');
        const rows = await page.locator('[name^="thanh_vien_"][name$="_ho_ten"]').count();
        if (rows !== 1) throw new Error(`bảng thành viên còn ${rows} dòng, muốn 1`);
      }
      if (vpName === "desktop") await page.screenshot({ path: `.qa/wizard-b2-${j.slug}.png`, fullPage: true });
      await clickNext();
      // 6. Bước 3: đính kèm tệp dòng đầu + bản sao điện tử
      await page.waitForSelector('input[type="file"]');
      await page.setInputFiles('input[type="file"] >> nth=0', FAKE_FILE);
      await page.click('input[name="giay_to_0_ban_sao"]');
      await clickNext();
      // 7. Bước 4: cam kết + nộp
      await page.waitForSelector('input[name="cam_ket"]');
      if (vpName === "desktop")
        await page.screenshot({ path: `.qa/wizard-b4-${j.slug}.png`, fullPage: true });
      await page.click('input[name="cam_ket"]');
      await clickNext();
      // 8. Xác nhận
      await page.waitForURL(`**/nop-truc-tuyen/${j.slug}/hoan-thanh`);
      await page.waitForSelector(`text=Nộp hồ sơ thành công`);
      const ma = await page.locator("dd").first().textContent();
      if (!ma?.startsWith(j.prefix))
        throw new Error(`mã hồ sơ "${ma}" không đúng prefix ${j.prefix}`);
      if (errors.length) throw new Error("console:\n" + errors.join("\n"));
      console.log(`PASS ${label} — ${ma}`);
    } catch (err) {
      failures++;
      console.error(`FAIL ${label}: ${err.message}`);
      await page.screenshot({ path: `.qa/fail-${vpName}-${j.slug}.png` });
    }
    await context.close();
  }
}

await browser.close();
process.exit(failures ? 1 : 0);
