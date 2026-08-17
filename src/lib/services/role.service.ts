import { prisma } from "../db";
import { ApiError } from "../api";

export async function listRolesByCompany(companyId: number) {
  return prisma.role.findMany({
    where: { companyId },
    include: { permissions: { include: { permission: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createRole(
  companyId: number,
  data: { name: string; description?: string | null; permissionCodes?: string[] },
) {
  const permissionCodes = data.permissionCodes ?? [];
  return prisma.$transaction(async (tx) => {
    const existing = await tx.role.findUnique({
      where: { companyId_name: { companyId, name: data.name } },
    });
    if (existing) {
      throw new ApiError("Ya existe un rol con ese nombre en la empresa", 400, "ROLE_EXISTS");
    }

    const role = await tx.role.create({
      data: {
        companyId,
        name: data.name,
        description: data.description ?? null,
      },
    });

    if (permissionCodes.length > 0) {
      const perms = await tx.permission.findMany({
        where: { code: { in: permissionCodes } },
      });
      if (perms.length !== new Set(permissionCodes).size) {
        throw new ApiError("Uno o más permisos no existen", 400, "PERMISSION_NOT_FOUND");
      }
      await tx.rolePermission.createMany({
        data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
      });
    }

    return role;
  });
}

export async function updateRole(
  companyId: number,
  roleId: number,
  data: { name?: string; description?: string | null; permissionCodes?: string[] },
) {
  return prisma.$transaction(async (tx) => {
    const role = await tx.role.findFirst({ where: { id: roleId, companyId } });
    if (!role) throw new ApiError("El rol no existe", 404, "ROLE_NOT_FOUND");

    if (data.name && data.name !== role.name) {
      const duplicate = await tx.role.findUnique({
        where: { companyId_name: { companyId, name: data.name } },
      });
      if (duplicate) {
        throw new ApiError("Ya existe un rol con ese nombre en la empresa", 400, "ROLE_EXISTS");
      }
    }

    await tx.role.update({
      where: { id: roleId },
      data: { name: data.name ?? role.name, description: data.description ?? role.description },
    });

    if (data.permissionCodes) {
      const perms = await tx.permission.findMany({
        where: { code: { in: data.permissionCodes } },
      });
      if (perms.length !== new Set(data.permissionCodes).size) {
        throw new ApiError("Uno o más permisos no existen", 400, "PERMISSION_NOT_FOUND");
      }

      await tx.rolePermission.deleteMany({ where: { roleId } });
      if (perms.length > 0) {
        await tx.rolePermission.createMany({
          data: perms.map((p) => ({ roleId, permissionId: p.id })),
        });
      }
    }

    return role;
  });
}

export async function toggleRole(companyId: number, roleId: number, active: boolean) {
  const role = await prisma.role.findFirst({ where: { id: roleId, companyId } });
  if (!role) throw new ApiError("El rol no existe", 404, "ROLE_NOT_FOUND");
  return prisma.role.update({ where: { id: roleId }, data: { active } });
}
