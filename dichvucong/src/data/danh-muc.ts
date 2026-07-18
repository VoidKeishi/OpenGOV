import type { LucideIcon } from "lucide-react";
import {
  Armchair,
  Baby,
  BriefcaseBusiness,
  Building2,
  Car,
  CircleDollarSign,
  CircleMinus,
  Copyright,
  Gavel,
  GraduationCap,
  HandHeart,
  Handshake,
  HeartHandshake,
  HeartPulse,
  House,
  IdCard,
  Megaphone,
  Network,
  RefreshCw,
  Rocket,
  Scale,
  Users,
} from "lucide-react";

export type DanhMucItem = {
  label: string;
  icon: LucideIcon;
  keyword?: string; // có keyword → link /tim-kiem?keyword=..., không → link chết
};

export type DanhMucColumn = {
  title: string;
  barClass: string;
  items: DanhMucItem[];
};

// Danh mục trang chủ — đúng thứ tự CLONE_SPEC.md mục 3.1.4
export const DANH_MUC: DanhMucColumn[] = [
  {
    title: "CÔNG DÂN",
    barClass: "bg-brand",
    items: [
      { label: "Có con nhỏ", icon: Baby, keyword: "đăng ký khai sinh" },
      { label: "Học tập", icon: GraduationCap },
      { label: "Việc làm", icon: BriefcaseBusiness },
      { label: "Cư trú và giấy tờ tùy thân", icon: IdCard, keyword: "đăng ký thường trú" },
      { label: "Hôn nhân và gia đình", icon: HeartHandshake },
      { label: "Điện lực, nhà ở, đất đai", icon: House, keyword: "giấy phép xây dựng" },
      { label: "Sức khỏe và y tế", icon: HeartPulse },
      { label: "Phương tiện và người lái", icon: Car },
      { label: "Hưu trí", icon: Armchair },
      { label: "Người thân qua đời", icon: HandHeart },
      { label: "Giải quyết khiếu kiện", icon: Scale },
    ],
  },
  {
    title: "DOANH NGHIỆP",
    barClass: "bg-brand-dark",
    items: [
      { label: "Khởi sự kinh doanh", icon: Rocket },
      { label: "Lao động và bảo hiểm xã hội", icon: Users },
      { label: "Tài chính doanh nghiệp", icon: CircleDollarSign },
      { label: "Điện lực, đất đai, xây dựng", icon: Building2 },
      { label: "Thương mại, quảng cáo", icon: Megaphone },
      { label: "Sở hữu trí tuệ, đăng ký tài sản", icon: Copyright },
      { label: "Thành lập chi nhánh, văn phòng đại diện", icon: Network },
      { label: "Đấu thầu, mua sắm công", icon: Gavel },
      { label: "Tái cấu trúc doanh nghiệp", icon: RefreshCw },
      { label: "Giải quyết tranh chấp hợp đồng", icon: Handshake },
      { label: "Tạm dừng, chấm dứt hoạt động", icon: CircleMinus },
    ],
  },
];
