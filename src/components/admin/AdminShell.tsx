"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { api } from "./api";
const links = [
  ["", "Overview"],
  ["cards", "Cards & reusable content"],
  ["pages", "Pages & sections"],
  ["navigation", "Navigation"],
  ["media", "Media library"],
  ["theme", "Design & theme"],
  ["seo", "SEO & redirects"],
  ["settings", "Site settings"],
  ["leads", "Inquiries"],
  ["audit", "Audit history"],
];
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <div className="cms-shell">
      <a className="cms-skip" href="#cms-main">
        Skip to editor
      </a>
      <aside className="cms-sidebar">
        <Link className="cms-brand" href="/admin">
          ACADEMY<span>Maintainer workspace</span>
        </Link>
        <nav aria-label="Administration">
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
          View public site ↗
        </a>
        <button
          className="secondary"
          onClick={async () => {
            try {
              await api("auth/logout", "POST", {});
              router.push("/admin/login");
              router.refresh();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Sign out
        </button>
        {error && <p role="alert">{error}</p>}
      </aside>
      <main id="cms-main" className="cms-main">
        {children}
      </main>
    </div>
  );
}
