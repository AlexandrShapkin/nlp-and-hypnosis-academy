import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./admin.css";
import { AdminFrame } from "@/components/admin/AdminFrame";
export const metadata: Metadata = {
  title: "Управление сайтом · Академия НЛП и гипноза",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminFrame>{children}</AdminFrame>;
}
