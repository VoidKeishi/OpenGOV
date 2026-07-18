"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Menu, UserRound, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { NAV_ITEMS } from "./nav-data";

export default function Header() {
  const { user, logout, openModal } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <header className="bg-white">
      <div className="mx-auto flex max-w-[1168px] items-center justify-between gap-3 px-4 py-2.5 md:py-3">
        <Link href="/" className="flex min-w-0 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-dvc.png"
            alt="Cổng Dịch vụ công Quốc gia — Kết nối, cung cấp thông tin và dịch vụ công mọi lúc, mọi nơi"
            className="h-11 w-auto max-w-full md:h-[84px]"
          />
        </Link>

        <div className="hidden shrink-0 md:block">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 font-semibold">
                <UserRound className="h-5 w-5 text-brand" />
                {user.hoTen}
              </span>
              <button
                type="button"
                onClick={logout}
                className="text-sm text-muted hover:text-brand"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openModal}
              className="rounded border border-brand px-6 py-2.5 font-semibold text-brand hover:bg-brand hover:text-white"
            >
              Đăng nhập
            </button>
          )}
        </div>

        <button
          type="button"
          className="shrink-0 rounded bg-brand p-2 text-white md:hidden"
          aria-label={drawerOpen ? "Đóng menu" : "Mở menu"}
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(!drawerOpen)}
        >
          {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {drawerOpen && (
        <nav className="border-t border-line bg-white md:hidden">
          <ul className="px-4 py-2">
            <li>
              <Link
                href="/"
                className="block border-b border-line py-3 font-semibold"
                onClick={() => setDrawerOpen(false)}
              >
                Trang chủ
              </Link>
            </li>
            {NAV_ITEMS.map((item) => (
              <li key={item.label} className="border-b border-line last:border-b-0">
                {item.children ? (
                  <details>
                    <summary className="flex cursor-pointer list-none items-center justify-between py-3 font-semibold">
                      {item.label}
                      <ChevronDown className="h-4 w-4 text-muted" />
                    </summary>
                    <ul className="pb-2 pl-4">
                      {item.children.map((c) => (
                        <li key={c.label}>
                          <Link
                            href={c.href}
                            className="block py-2 text-[15px] text-muted hover:text-brand"
                            onClick={() => setDrawerOpen(false)}
                          >
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  <Link
                    href={item.href ?? "#"}
                    className="block py-3 font-semibold"
                    onClick={() => setDrawerOpen(false)}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
            <li className="py-3">
              {user ? (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-semibold">
                    <UserRound className="h-5 w-5 text-brand" />
                    {user.hoTen}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setDrawerOpen(false);
                    }}
                    className="text-sm text-muted"
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    openModal();
                  }}
                  className="w-full rounded border border-brand py-2.5 font-semibold text-brand"
                >
                  Đăng nhập
                </button>
              )}
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
