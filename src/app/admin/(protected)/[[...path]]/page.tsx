import { AdminWorkspace } from "@/components/admin/AdminWorkspace";
export default async function AdminPage({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path = [] } = await params;
  return <AdminWorkspace route={path[0] || "overview"} />;
}
