import { redirect, notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { resources, adminOnly, type Resource } from "@/lib/admin-resources";
import { AdminShell } from "@/components/features/admin-shell";
import { ContentEditor } from "@/components/features/content-editor";
export default async function ResourcePage({
  params,
}: {
  params: Promise<{ resource: string }>;
}) {
  const u = await currentUser();
  if (!u) redirect("/admin/login");
  const { resource } = await params;
  if (!Object.hasOwn(resources, resource)) notFound();
  if (adminOnly(resource) && u.role !== "ADMIN")
    return (
      <AdminShell user={u}>
        <h1>Không đủ quyền truy cập</h1>
        <p>Mục này chỉ dành cho quản trị viên.</p>
      </AdminShell>
    );
  const records = await resources[resource as Resource].list();
  return (
    <AdminShell user={u} active={resource}>
      <ContentEditor
        resource={resource}
        initialRecords={JSON.parse(JSON.stringify(records))}
      />
    </AdminShell>
  );
}
