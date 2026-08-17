import { redirect } from "next/navigation";
import { getSuperAdminSession } from "@/lib/auth";
import { SuperAdminShell } from "@/components/layout/superadmin-shell";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSuperAdminSession();
  if (!session) redirect("/login");

  return <SuperAdminShell user={session.user}>{children}</SuperAdminShell>;
}
