import Link from "next/link";
import { HeroSearchBar } from "@/components/SearchBar";
import NewsCarousel from "@/components/home/NewsCarousel";
import CategoryColumns from "@/components/home/CategoryColumns";

export default function Home() {
  return (
    <>
      <section className="hero-bg px-4 py-8 md:py-10">
        <div className="mx-auto max-w-[980px]">
          <HeroSearchBar />
          <div className="mt-5 grid gap-3 md:mt-7 md:grid-cols-3 md:gap-6">
            <Link
              href="/dich-vu-cong-truc-tuyen"
              className="flex min-h-[52px] items-center justify-center rounded bg-accent px-4 py-3 text-center font-semibold text-ink hover:brightness-95 md:min-h-[64px]"
            >
              Dịch vụ công trực tuyến
            </Link>
            <a
              href="#"
              className="flex min-h-[52px] items-center justify-center rounded bg-accent px-4 py-3 text-center font-semibold text-ink hover:brightness-95 md:min-h-[64px]"
            >
              Thủ tục hành chính của Đảng
            </a>
            <a
              href="#"
              className="flex min-h-[52px] items-center justify-center rounded bg-accent px-4 py-3 text-center font-semibold text-ink hover:brightness-95 md:min-h-[64px]"
            >
              Dịch vụ công liên thông: Khai sinh, Khai tử
            </a>
          </div>
        </div>
      </section>
      <NewsCarousel />
      <CategoryColumns />
    </>
  );
}
