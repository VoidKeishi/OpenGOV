export type NavChild = { label: string; href: string };
export type NavItem = { label: string; href?: string; children?: NavChild[] };

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Thông tin và dịch vụ",
    children: [
      { label: "Thủ tục hành chính", href: "/tim-kiem" },
      { label: "Dịch vụ công trực tuyến", href: "/dich-vu-cong-truc-tuyen" },
      { label: "Tra cứu hồ sơ", href: "#" },
    ],
  },
  { label: "Thanh toán trực tuyến", href: "#" },
  {
    label: "Phản ánh kiến nghị",
    children: [
      { label: "Gửi phản ánh, kiến nghị", href: "#" },
      { label: "Tra cứu kết quả trả lời", href: "#" },
    ],
  },
  {
    label: "Hỗ trợ",
    children: [
      { label: "Câu hỏi thường gặp", href: "#" },
      { label: "Hướng dẫn sử dụng", href: "#" },
      { label: "Tổng đài hỗ trợ: 18001096", href: "#" },
    ],
  },
];

export const SUBNAV_ITEMS: { label: string; href: string; caret?: boolean }[] = [
  { label: "Thủ tục hành chính", href: "/tim-kiem", caret: true },
  { label: "Dịch vụ công trực tuyến", href: "/dich-vu-cong-truc-tuyen" },
  { label: "Dịch vụ công nổi bật", href: "#" },
  { label: "Tra cứu hồ sơ", href: "#" },
  { label: "Câu hỏi thường gặp", href: "#" },
];
