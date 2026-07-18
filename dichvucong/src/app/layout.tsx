import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import Header from "@/components/layout/Header";
import MainNav from "@/components/layout/MainNav";
import DemoBanner from "@/components/layout/DemoBanner";
import Footer from "@/components/layout/Footer";

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
      <body className="font-sans antialiased">
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <MainNav />
            <main className="flex-1">{children}</main>
            <DemoBanner />
            <Footer />
          </div>
        </AuthProvider>
        <script src="https://opengov.duckdns.org/widget/opengov.js?v=1" data-backend="https://opengov.duckdns.org" async />
      </body>
    </html>
  );
}
