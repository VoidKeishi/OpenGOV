// Trích xuất nội dung 3 thủ tục từ captures/content/*.html (DOM chụp từ site thật)
// ra src/data/thu-tuc/<slug>.json. Chạy 1 lần lúc dev: `pnpm extract`; output commit vào repo.
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

const outDir = join(ROOT, "src", "data", "thu-tuc");
mkdirSync(outDir, { recursive: true });

for (const { file, slug, assertMa } of SOURCES) {
  const html = readFileSync(join(ROOT, "captures", "content", file), "utf-8");
  const data = { slug, ...extract(html) };

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
