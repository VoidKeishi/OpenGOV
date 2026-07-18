import { Search } from "lucide-react";

// Cả 2 biến thể đều là form GET thuần → /tim-kiem?keyword=... (trình duyệt tự encode).

export function HeroSearchBar() {
  return (
    <form action="/tim-kiem" className="flex items-stretch overflow-hidden rounded bg-white">
      <input
        type="text"
        name="keyword"
        id="hero-keyword"
        aria-label="Tìm kiếm thủ tục hành chính"
        placeholder="Nhập từ khoá tìm kiếm thủ tục hành chính"
        className="min-w-0 flex-1 px-4 py-3 text-[15px] outline-none md:py-3.5"
      />
      <a
        href="#"
        className="flex shrink-0 items-center border-l border-line px-3 text-sm text-ink hover:text-brand md:px-4 md:text-[15px]"
      >
        Tìm kiếm nâng cao
      </a>
      <button
        type="submit"
        aria-label="Tìm kiếm"
        className="flex shrink-0 items-center border-l border-line px-3.5 text-ink hover:text-brand md:px-5"
      >
        <Search className="h-5 w-5" />
      </button>
    </form>
  );
}

export function ListSearchBar({
  defaultKeyword = "",
  placeholder,
  withButton = false,
  withAdvanced = false,
}: {
  defaultKeyword?: string;
  placeholder?: string;
  withButton?: boolean;
  withAdvanced?: boolean;
}) {
  return (
    <form action="/tim-kiem" className="flex items-stretch gap-3">
      <div className="flex min-w-0 flex-1 items-stretch overflow-hidden rounded border border-line bg-white">
        <input
          type="text"
          name="keyword"
          id="list-keyword"
          aria-label="Tìm kiếm thủ tục hành chính"
          defaultValue={defaultKeyword}
          placeholder={placeholder}
          className="min-w-0 flex-1 px-4 py-2.5 text-[15px] outline-none"
        />
        {withAdvanced && (
          <a
            href="#"
            className="hidden items-center border-l border-line px-4 text-[15px] text-ink hover:text-brand sm:flex"
          >
            Tìm kiếm nâng cao
          </a>
        )}
        {!withButton && (
          <button
            type="submit"
            aria-label="Tìm kiếm"
            className="flex items-center px-3.5 text-muted hover:text-brand"
          >
            <Search className="h-5 w-5" />
          </button>
        )}
      </div>
      {withButton && (
        <button
          type="submit"
          className="shrink-0 rounded bg-brand px-6 font-semibold text-white hover:bg-brand-dark"
        >
          Tìm kiếm
        </button>
      )}
    </form>
  );
}
