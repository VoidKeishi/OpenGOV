"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import LotusArt from "@/components/icons/LotusArt";
import news from "@/data/news.json";

export default function NewsCarousel() {
  const [start, setStart] = useState(0);
  const n = news.length;
  const shift = (d: number) => setStart((s) => (s + d + n) % n);

  return (
    <section className="relative overflow-hidden bg-[#faf3e1]" aria-label="Tin tức">
      <LotusArt className="pointer-events-none absolute right-0 top-0 h-full w-[300px] md:w-[440px]" />
      <div className="relative mx-auto flex max-w-[1168px] items-center gap-2 px-2 py-6 md:gap-4 md:px-4 md:py-7">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label="Tin trước"
          className="shrink-0 p-1 text-ink hover:text-brand"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <ul className="grid min-w-0 flex-1 gap-8 md:grid-cols-3">
          {news.map((_, i) => {
            const item = news[(start + i) % n];
            return (
              <li key={item.title} className={i > 0 ? "hidden md:block" : ""}>
                <h3 className="line-clamp-2 font-bold leading-snug">{item.title}</h3>
                <p className="mt-1.5 line-clamp-2 text-sm text-muted">{item.desc}</p>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="Tin sau"
          className="shrink-0 p-1 text-ink hover:text-brand"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </section>
  );
}
