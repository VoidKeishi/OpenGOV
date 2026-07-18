// Dev QA: chụp màn hình 1 URL ở 1440px + 390px và gom lỗi console/page.
// Dùng: node scripts/qa-shot.mjs <path> <tên-file> [--full]
// Ảnh ra thư mục .qa/ (gitignore).
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const [path = "/", name = "shot", ...rest] = process.argv.slice(2);
const full = rest.includes("--full");
const BASE = process.env.QA_BASE ?? "http://localhost:3000";

mkdirSync(".qa", { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];

for (const [label, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["mobile", { width: 390, height: 844 }],
]) {
  const page = await browser.newPage({ viewport });
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning")
      errors.push(`[${label}] console.${msg.type()}: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`[${label}] pageerror: ${err.message}`));
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.screenshot({ path: `.qa/${name}.${label}.png`, fullPage: full });
  await page.close();
}

await browser.close();
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`OK ${name} (không lỗi console)`);
