import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./admin.css";
export const metadata: Metadata = {
  title: "Maintainer · NLP & Hypnosis Academy",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="cms">{children}</div>;
}
