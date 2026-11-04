import { AdminWorkspace } from "@/components/admin/AdminWorkspace";
import { requireAdmin } from "@/server/auth";
import { notFound } from "next/navigation";
export default async function AdminPage({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path = [] } = await params;
  const route = path[0] || "overview";
  if (route === "team" && (await requireAdmin()).role !== "owner") notFound();
  return <AdminWorkspace route={route} />;
}
