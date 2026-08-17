import { redirect } from "next/navigation";
import { getSession, getSuperAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const superAdmin = await getSuperAdminSession();
  if (superAdmin) redirect("/superadmin");

  const session = await getSession();
  if (!session) redirect("/login");

  const memberships = await prisma.userCompany.findMany({
    where: { userId: session.user.id, active: true },
    include: { company: true, role: true },
  });

  const companies = memberships
    .filter((m) => m.company.active && m.role.active)
    .map((m) => ({ id: m.company.id, name: m.company.name }));

  return (
    <AppShell session={session} companies={companies}>
      {children}
    </AppShell>
  );
}
