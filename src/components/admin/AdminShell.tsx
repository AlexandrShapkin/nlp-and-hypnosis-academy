"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { api } from "./api";
const links = [
  ["", "Главная"],
  ["pages", "Страницы сайта"],
  ["cards", "Карточки и материалы"],
  ["media", "Фотографии и файлы"],
  ["navigation", "Меню сайта"],
  ["theme", "Оформление"],
  ["settings", "Настройки сайта"],
  ["leads", "Заявки"],
  ["seo", "Поисковая оптимизация"],
  ["audit", "История изменений"],
];
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [error, setError] = useState("");
  if (pathname.startsWith("/admin/preview/")) return <>{children}</>;
  return (
    <div className="cms-shell">
      <a className="cms-skip" href="#cms-main">
        Перейти к редактору
      </a>
      <aside className="cms-sidebar">
        <Link className="cms-brand" href="/admin">
          АКАДЕМИЯ<span>Управление сайтом</span>
        </Link>
        <nav aria-label="Управление сайтом">
          {links.map(([path, label]) => (
            <Link
              key={path}
              href={`/admin${path ? `/${path}` : ""}`}
              aria-current={
                pathname === `/admin${path ? `/${path}` : ""}`
                  ? "page"
                  : undefined
              }
            >
              {label}
            </Link>
          ))}
        </nav>
        <a href="/" target="_blank" rel="noreferrer">
          Посмотреть сайт ↗
        </a>
        <button
          className="secondary"
          onClick={async () => {
            if (
              !window.dispatchEvent(
                new Event("cms:before-logout", { cancelable: true }),
              )
            )
              return;
            try {
              await api("auth/logout", "POST", {});
              router.push("/admin/login");
              router.refresh();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Выйти
        </button>
        {error && <p role="alert">{error}</p>}
      </aside>
      <main id="cms-main" className="cms-main">
        {children}
      </main>
    </div>
  );
}
