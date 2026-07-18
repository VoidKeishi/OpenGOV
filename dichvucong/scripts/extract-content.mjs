// Trích xuất nội dung thủ tục từ captures/content/ (3 file .html DOM chụp từ site
// thật + 2 file .md chép nguyên văn) ra src/data/thu-tuc/<slug>.json.
// Chạy 1 lần lúc dev: `pnpm extract`; output commit vào repo.
// Giữ NGUYÊN VĂN tiếng Việt; mọi link trong cell chỉ lấy text (không hotlink).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const SOURCES = [
  {
    file: "detail-khai-sinh.html",
    slug: "dang-ky-khai-sinh",
    assertMa: "1.001193",
  },
  {
    file: "detail-thuong-tru.html",
    slug: "dang-ky-thuong-tru",
    assertMa: "1.004222",
  },
  {
    file: "detail-gpxd-cap-moi-III-IV-nha-o-rieng-le.html",
    slug: "cap-gpxd-nha-o-rieng-le",
    assertMa: null, // in ra để kiểm tra tay
  },
  {
    file: "dang-ky-thanh-lap-dntn.md",
    slug: "dang-ky-thanh-lap-dntn",
    assertMa: "2.001610",
  },
  {
    file: "dang-ky-noi-quy-lao-dong.md",
    slug: "dang-ky-noi-quy-lao-dong",
    assertMa: "2.001955",
  },
];

const INFO_LABELS = {
  "Tên thủ tục": "tenThuTuc",
  "Mã thủ tục": "maThuTuc",
  "Số quyết định": "soQuyetDinh",
  "Cấp thực hiện": "capThucHien",
  "Loại thủ tục": "loaiThuTuc",
  "Lĩnh vực": "linhVuc",
  "Đối tượng thực hiện": "doiTuongThucHien",
  "Cơ quan có thẩm quyền": "coQuanCoThamQuyen",
  "Địa chỉ tiếp nhận HS": "diaChiTiepNhanHS",
  "Cơ quan được ủy quyền": "coQuanDuocUyQuyen",
  "Cơ quan phối hợp": "coQuanPhoiHop",
};

/** Text của 1 cell/đoạn: gộp dòng, bỏ dòng rỗng, giữ xuống dòng thật */
function cellText(node) {
  if (!node) return "";
  return node.text
    .replace(/\r/g, "")
    .replace(/ /g, " ")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n");
}

/** Body giữ nguyên xuống dòng (whitespace-pre-wrap), chỉ trim 2 đầu */
function preWrapText(node) {
  if (!node) return "";
  return node.text.replace(/\r/g, "").replace(/ /g, " ").trim();
}

function parseTable(tableEl) {
  const columns = tableEl
    .querySelectorAll("thead th")
    .map((th) => cellText(th).replace(/\n/g, " "));
  const rows = tableEl
    .querySelectorAll("tbody tr")
    .map((tr) => tr.querySelectorAll("td").map((td) => cellText(td)));
  return { columns, rows };
}

function extract(html) {
  const root = parse(html);
  const out = {};

  out.ten = cellText(root.querySelector("h3")).replace(/\n/g, " ");

  // Bảng thông tin chung: cell label có style font-weight: bold, value là div kế tiếp
  const info = {};
  for (const div of root.querySelectorAll("div[style]")) {
    const style = div.getAttribute("style") ?? "";
    if (!style.includes("font-weight: bold")) continue;
    const label = cellText(div).replace(/\n/g, " ");
    const key = INFO_LABELS[label];
    if (!key) continue;
    info[key] = cellText(div.nextElementSibling);
  }
  out.info = info;

  for (const h4 of root.querySelectorAll("h4")) {
    const heading = cellText(h4).replace(/\n/g, " ");
    const container = h4.parentNode;
    switch (heading) {
      case "Thủ tục hành chính liên quan":
        out.lienQuan = sectionText(container);
        break;
      case "Trình Tự Thực Hiện":
        out.trinhTu = container.querySelectorAll("li").map((li) => ({
          title: cellText(li.querySelector("p.font-semibold")).replace(/\n/g, " "),
          body: preWrapText(li.querySelector("p.whitespace-pre-wrap")),
        }));
        break;
      case "Cách Thức Thực Hiện":
        out.cachThuc = parseTable(container.querySelector("table"));
        break;
      case "Thành phần hồ sơ":
        out.thanhPhanHoSo = container.querySelectorAll("h5").map((h5) => {
          const group = h5.parentNode.parentNode;
          const { rows } = parseTable(group.querySelector("table"));
          return {
            nhom: cellText(h5).replace(/\n/g, " "),
            rows: rows.map(([tenGiayTo, mauDon, soLuong]) => ({
              tenGiayTo: tenGiayTo ?? "",
              mauDon: mauDon ?? "",
              soLuong: soLuong ?? "",
            })),
          };
        });
        break;
      case "Căn cứ pháp lý":
        out.canCuPhapLy = parseTable(container.querySelector("table"));
        break;
      case "Cơ quan thực hiện":
        out.coQuanThucHien = sectionText(container);
        break;
      case "Yêu cầu, điều kiện thực hiện":
        out.yeuCau = sectionText(container);
        break;
      case "Kết quả xử lý":
        out.ketQua = container.querySelectorAll(".space-y-2 > div").map((d) => {
          const [tenEl, maEl] = d.querySelectorAll(":scope > div");
          return {
            ten: cellText(tenEl),
            ma: cellText(maEl).replace(/^Mã:\s*/, ""),
          };
        });
        break;
      case "Từ khóa":
        out.tuKhoa = sectionText(container);
        break;
      case "Mô tả":
        out.moTa = sectionText(container);
        break;
    }
  }
  return out;
}

/** Nội dung text của section thường: div "Không có thông tin" hoặc p.whitespace-pre-wrap */
function sectionText(container) {
  const el =
    container.querySelector("p.whitespace-pre-wrap") ??
    container.querySelector("div.text-gray-500");
  return preWrapText(el);
}

// ---- Parser markdown (2 thủ tục bổ sung, captures/content/*.md) ----

const EMPTY = "Không có thông tin";

/** Parse 1 bảng markdown bắt đầu tại lines[i] → {columns, rows, next} */
function mdTable(lines, i) {
  const parseRow = (line) =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());
  const columns = parseRow(lines[i]);
  let j = i + 1;
  if (j < lines.length && /^\s*\|[\s|:-]+\|\s*$/.test(lines[j])) j++; // dòng phân cách
  const rows = [];
  while (j < lines.length && lines[j].trim().startsWith("|")) {
    rows.push(parseRow(lines[j]));
    j++;
  }
  return { columns, rows, next: j };
}

/** Bảng đầu tiên trong 1 section */
function firstTable(sectionLines = []) {
  const i = sectionLines.findIndex((l) => l.trim().startsWith("|"));
  if (i < 0) return null;
  const { columns, rows } = mdTable(sectionLines, i);
  return { columns, rows };
}

// Trường của bảng "Thông tin chung" trong .md (ít hơn bảng HTML;
// trường vắng điền "Không có thông tin" cho khớp khung 3 trang cũ)
const MD_INFO_LABELS = {
  "Mã thủ tục": "maThuTuc",
  "Lĩnh vực": "linhVuc",
  "Đối tượng thực hiện": "doiTuongThucHien",
  "Cơ quan ban hành": "coQuanBanHanh",
};

function extractMarkdown(md) {
  const lines = md.replace(/\r/g, "").split("\n");
  const out = {};

  // H1 = tên thủ tục; cắt phần còn lại theo heading "## "
  const sections = {};
  let cur = null;
  for (const line of lines) {
    if (/^# [^#]/.test(line)) {
      out.ten = line.slice(2).trim();
      continue;
    }
    if (line.startsWith("> ")) continue; // ghi chú nguồn trích
    const m = line.match(/^## (.+)$/);
    if (m) {
      cur = m[1].trim();
      sections[cur] = [];
      continue;
    }
    if (cur) sections[cur].push(line);
  }

  // Thông tin chung
  const info = {};
  for (const key of Object.values(INFO_LABELS)) info[key] = EMPTY;
  info.tenThuTuc = out.ten;
  for (const [label, value] of firstTable(sections["Thông tin chung"])?.rows ?? []) {
    if (label === "Cơ quan thực hiện") out.coQuanThucHien = value;
    else if (MD_INFO_LABELS[label]) info[MD_INFO_LABELS[label]] = value;
  }
  out.info = info;

  // Trình tự thực hiện: heading "### " = title (có thể không có → title rỗng)
  const trinhTu = [];
  let ttItem = null;
  for (const line of sections["Trình tự thực hiện"] ?? []) {
    const h = line.match(/^### (.+)$/);
    if (h) {
      ttItem = { title: h[1].trim(), body: [] };
      trinhTu.push(ttItem);
      continue;
    }
    if (!line.trim()) continue;
    if (!ttItem) {
      ttItem = { title: "", body: [] };
      trinhTu.push(ttItem);
    }
    ttItem.body.push(line.trim());
  }
  out.trinhTu = trinhTu.map((t) => ({ title: t.title, body: t.body.join("\n") }));

  out.cachThuc = firstTable(sections["Cách thức thực hiện"]);

  // Thành phần hồ sơ: nhóm theo "### " (không có → nhóm rỗng);
  // 2 bảng liền nhau trong cùng mục → gộp rows
  const groups = [];
  const hsLines = sections["Thành phần hồ sơ"] ?? [];
  let nhom = "";
  let nhomDaCoBang = false;
  for (let i = 0; i < hsLines.length; i++) {
    const h = hsLines[i].match(/^### (.+)$/);
    if (h) {
      nhom = h[1].trim();
      nhomDaCoBang = false;
      continue;
    }
    if (!hsLines[i].trim().startsWith("|")) continue;
    const { rows, next } = mdTable(hsLines, i);
    const mapped = rows.map(([tenGiayTo = "", soLuong = ""]) => ({
      tenGiayTo,
      mauDon: "",
      soLuong,
    }));
    if (nhomDaCoBang) groups[groups.length - 1].rows.push(...mapped);
    else groups.push({ nhom, rows: mapped });
    nhomDaCoBang = true;
    i = next - 1;
  }
  out.thanhPhanHoSo = groups;

  out.canCuPhapLy = firstTable(sections["Căn cứ pháp lý"]);

  const para = (name) => {
    const ls = (sections[name] ?? []).map((l) => l.trim()).filter(Boolean);
    return ls.length ? ls.join("\n") : EMPTY;
  };
  out.yeuCau = para("Yêu cầu, điều kiện thực hiện");
  out.lienQuan = EMPTY;
  out.tuKhoa = EMPTY;
  out.moTa = EMPTY;

  out.ketQua = (sections["Kết quả thực hiện"] ?? [])
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "))
    .map((l) => ({ ten: l.slice(2).trim(), ma: "" }));

  return out;
}

const outDir = join(ROOT, "src", "data", "thu-tuc");
mkdirSync(outDir, { recursive: true });

for (const { file, slug, assertMa } of SOURCES) {
  const raw = readFileSync(join(ROOT, "captures", "content", file), "utf-8");
  const data = {
    slug,
    ...(file.endsWith(".md") ? extractMarkdown(raw) : extract(raw)),
  };

  if (!data.ten) throw new Error(`${file}: thiếu tên thủ tục`);
  if (assertMa && data.info.maThuTuc !== assertMa)
    throw new Error(
      `${file}: mã thủ tục "${data.info.maThuTuc}" != "${assertMa}" — parser hỏng?`,
    );
  if (!data.trinhTu?.length) throw new Error(`${file}: trình tự rỗng`);
  if (!data.thanhPhanHoSo?.length) throw new Error(`${file}: thành phần hồ sơ rỗng`);

  const dest = join(outDir, `${slug}.json`);
  writeFileSync(dest, JSON.stringify(data, null, 2) + "\n");
  console.log(
    `${slug}: ma=${data.info.maThuTuc} linhVuc=${data.info.linhVuc} trinhTu=${data.trinhTu.length} hoSoGroups=${data.thanhPhanHoSo.length} canCu=${data.canCuPhapLy.rows.length} ketQua=${data.ketQua.length}`,
  );
}
