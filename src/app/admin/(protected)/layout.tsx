import type { ReactNode } from "react";
import { requireAdmin } from "@/server/auth";
import { AdminShell } from "@/components/admin/AdminShell";
export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireAdmin();
  return <AdminShell role={session.role}>{children}</AdminShell>;
}
