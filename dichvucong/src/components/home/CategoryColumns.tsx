import Link from "next/link";
import { DANH_MUC } from "@/data/danh-muc";

export default function CategoryColumns() {
  return (
    <section className="mx-auto grid max-w-[1168px] gap-10 px-4 py-8 md:grid-cols-2 md:gap-12 md:py-10">
      {DANH_MUC.map((col) => (
        <div key={col.title}>
          <h2 className="text-center text-[22px] font-semibold tracking-wide text-brand">
            {col.title}
          </h2>
          <div className={`mt-3 h-[3px] w-full ${col.barClass}`} />
          <ul className="mt-5 space-y-3">
            {col.items.map((item) => {
              const inner = (
                <>
                  <item.icon className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.5} />
                  <span className="text-[15px]">{item.label}</span>
                </>
              );
              return (
                <li key={item.label}>
                  {item.keyword ? (
                    <Link
                      href={{ pathname: "/tim-kiem", query: { keyword: item.keyword } }}
                      className="flex items-center gap-3 rounded-sm bg-surface px-4 py-3 hover:text-brand"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <a
                      href="#"
                      className="flex items-center gap-3 rounded-sm bg-surface px-4 py-3 hover:text-brand"
                    >
                      {inner}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
