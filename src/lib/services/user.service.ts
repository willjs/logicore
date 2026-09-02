import { prisma } from "../db";
import { ApiError } from "../api";

export interface AssignmentInput {
  companyId: number;
  roleId: number;
}

function validateRoleForCompany(role: { id: number; companyId: number; active: boolean }, companyId: number) {
  if (role.companyId !== companyId) {
    throw new ApiError("El rol no pertenece a la empresa seleccionada", 400, "ROLE_COMPANY_MISMATCH");
  }
  if (!role.active) {
    throw new ApiError("El rol seleccionado está inactivo", 400, "ROLE_INACTIVE");
  }
}

export async function createUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  contractNumber?: string | null;
  country?: string | null;
  department?: string | null;
  municipality?: string | null;
  assignments?: AssignmentInput[];
}) {
  const assignments = data.assignments ?? [];

  const targetCompanies = await prisma.company.findMany({
    where: { id: { in: assignments.map((a) => a.companyId) }, active: true },
  });
  if (targetCompanies.length !== new Set(assignments.map((a) => a.companyId)).size) {
    throw new ApiError("Una o más empresas de destino no existen o están inactivas", 400, "COMPANY_NOT_FOUND");
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        contractNumber: data.contractNumber ?? null,
        country: data.country ?? null,
        department: data.department ?? null,
        municipality: data.municipality ?? null,
      },
    });

    for (const assignment of assignments) {
      const role = await tx.role.findUnique({ where: { id: assignment.roleId } });
      if (!role) throw new ApiError("El rol seleccionado no existe", 400, "ROLE_NOT_FOUND");
      validateRoleForCompany(role, assignment.companyId);
      await tx.userCompany.create({
        data: {
          userId: user.id,
          companyId: assignment.companyId,
          roleId: assignment.roleId,
        },
      });
    }

    return user;
  });
}

export async function updateUser(
  id: number,
  data: {
    name?: string;
    email?: string;
    passwordHash?: string;
    contractNumber?: string | null;
    country?: string | null;
    department?: string | null;
    municipality?: string | null;
  },
) {
  return prisma.user.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.passwordHash !== undefined && { passwordHash: data.passwordHash }),
      ...(data.contractNumber !== undefined && { contractNumber: data.contractNumber ?? null }),
      ...(data.country !== undefined && { country: data.country ?? null }),
      ...(data.department !== undefined && { department: data.department ?? null }),
      ...(data.municipality !== undefined && { municipality: data.municipality ?? null }),
    },
  });
}

export async function toggleUser(id: number, active: boolean) {
  return prisma.user.update({ where: { id }, data: { active } });
}

export async function listUsersByCompany(companyId: number) {
  const rows = await prisma.userCompany.findMany({
    where: { companyId },
    include: { user: true, role: true },
    orderBy: { user: { name: "asc" } },
  });

  return rows.map((row) => ({
    id: row.user.id,
    name: row.user.name,
    email: row.user.email,
    active: row.user.active,
    contractNumber: row.user.contractNumber,
    country: row.user.country,
    department: row.user.department,
    municipality: row.user.municipality,
    role: row.role ? { id: row.role.id, name: row.role.name } : null,
    createdAt: row.user.createdAt,
  }));
}

export async function assignUserCompany(userId: number, input: AssignmentInput) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError("El usuario no existe", 404, "USER_NOT_FOUND");

    const company = await tx.company.findUnique({ where: { id: input.companyId } });
    if (!company || !company.active) {
      throw new ApiError("La empresa no existe o está inactiva", 400, "COMPANY_NOT_FOUND");
    }

    const role = await tx.role.findUnique({ where: { id: input.roleId } });
    if (!role) throw new ApiError("El rol seleccionado no existe", 400, "ROLE_NOT_FOUND");
    validateRoleForCompany(role, input.companyId);

    const existing = await tx.userCompany.findUnique({
      where: { userId_companyId: { userId, companyId: input.companyId } },
    });
    if (existing) {
      return tx.userCompany.update({
        where: { userId_companyId: { userId, companyId: input.companyId } },
        data: { roleId: input.roleId, active: true },
      });
    }
    return tx.userCompany.create({
      data: { userId, companyId: input.companyId, roleId: input.roleId },
    });
  });
}

export async function removeUserCompany(userId: number, companyId: number) {
  const existing = await prisma.userCompany.findUnique({
    where: { userId_companyId: { userId, companyId } },
  });
  if (!existing) {
    throw new ApiError("La asignación no existe", 404, "ASSIGNMENT_NOT_FOUND");
  }
  return prisma.userCompany.delete({
    where: { userId_companyId: { userId, companyId } },
  });
}
