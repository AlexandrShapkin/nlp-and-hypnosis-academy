"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
/** Public previews use the full viewport without inherited editor styling. */
export function AdminFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return pathname.startsWith("/admin/preview/") ? (
    <>{children}</>
  ) : (
    <div className="cms">{children}</div>
  );
}
