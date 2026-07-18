import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import "./globals.css";

const nunitoSans = Nunito_Sans({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-nunito-sans",
});

export const metadata: Metadata = {
  title: "Cổng Dịch vụ công Quốc gia (Demo)",
  description:
    "Môi trường demo — không phải Cổng Dịch vụ công quốc gia. Dữ liệu chỉ dùng minh hoạ.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={nunitoSans.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
