import { prisma } from "../db";
import { DEFAULT_ROLES } from "../constants";

export interface CreateCompanyInput {
  name: string;
  nit?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

export async function createCompanyWithDefaults(data: CreateCompanyInput) {
  return prisma.$transaction(async (tx) => {
    const company = await tx.company.create({ data });

    for (const roleDef of DEFAULT_ROLES) {
      const role = await tx.role.create({
        data: {
          companyId: company.id,
          name: roleDef.name,
          description: roleDef.description,
        },
      });

      const perms = await tx.permission.findMany({
        where: { code: { in: [...roleDef.permissions] } },
      });

      if (perms.length > 0) {
        await tx.rolePermission.createMany({
          data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
        });
      }
    }

    return company;
  });
}

export async function updateCompany(
  id: number,
  data: Partial<CreateCompanyInput>,
) {
  return prisma.company.update({ where: { id }, data });
}

export async function toggleCompany(id: number, active: boolean) {
  return prisma.company.update({ where: { id }, data: { active } });
}

export async function listCompanies() {
  return prisma.company.findMany({ orderBy: { name: "asc" } });
}
