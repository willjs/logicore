import { Building2, KeyRound, ShieldCheck, Users } from "lucide-react";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const session = await requireSession();

  const canSeeUsers = session.permissions.includes("users.view");
  const canSeeRoles = session.permissions.includes("roles.view");
  const canSeeCompanies = session.permissions.includes("companies.view");

  const [userCount, roleCount, companyCount] = await Promise.all([
    canSeeUsers
      ? prisma.userCompany.count({ where: { companyId: session.company.id, active: true } })
      : Promise.resolve(null),
    canSeeRoles
      ? prisma.role.count({ where: { companyId: session.company.id, active: true } })
      : Promise.resolve(null),
    canSeeCompanies
      ? prisma.company.count({ where: { active: true } })
      : Promise.resolve(null),
  ]);

  const stats = [
    {
      label: "Empresa activa",
      value: session.company.name,
      icon: Building2,
      permission: null,
    },
    {
      label: "Usuarios en la empresa",
      value: userCount !== null ? String(userCount) : null,
      icon: Users,
      permission: "users.view",
    },
    {
      label: "Roles activos",
      value: roleCount !== null ? String(roleCount) : null,
      icon: ShieldCheck,
      permission: "roles.view",
    },
    {
      label: "Empresas del sistema",
      value: companyCount !== null ? String(companyCount) : null,
      icon: KeyRound,
      permission: "companies.view",
    },
  ];

  const visibleStats = stats.filter(
    (stat) => stat.value !== null && (!stat.permission || session.permissions.includes(stat.permission)),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inicio</h1>
        <p className="text-muted-foreground">
          Bienvenido, {session.user.name}. Estás trabajando en{" "}
          <Badge variant="secondary">{session.company.name}</Badge> con rol{" "}
          <Badge>{session.role.name}</Badge>.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {visibleStats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="truncate text-xl font-semibold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Módulos disponibles</CardTitle>
          <CardDescription>
            Los módulos se habilitan según los permisos de tu rol.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            En las próximas fases se incorporarán clientes, productos,
            inventario, bodegas, camiones, traslados, reintegros, ventas en
            camión, pagos, movimientos, auditoría, Excel y reportes PDF.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
