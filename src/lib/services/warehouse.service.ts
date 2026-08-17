import { prisma } from "../db";
import { ApiError } from "../api";

export interface WarehouseData {
  name?: string;
  location?: string | null;
  branchId?: number | null;
}

export async function listWarehousesByCompany(companyId: number) {
  return prisma.warehouse.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    include: { _count: { select: { inventory: true } }, branch: { select: { id: true, name: true } } },
  });
}

export async function createWarehouse(companyId: number, name: string, location?: string | null, branchId?: number | null) {
  const existing = await prisma.warehouse.findUnique({
    where: { companyId_name: { companyId, name } },
  });
  if (existing) {
    throw new ApiError("Ya existe una bodega con ese nombre", 400, "WAREHOUSE_EXISTS");
  }
  return prisma.warehouse.create({ data: { name, location: location ?? null, companyId, branchId: branchId ?? null } });
}

export async function updateWarehouse(id: number, companyId: number, data: WarehouseData) {
  const existing = await prisma.warehouse.findFirst({ where: { id, companyId } });
  if (!existing) {
    throw new ApiError("La bodega no existe", 404, "WAREHOUSE_NOT_FOUND");
  }
  if (data.name && data.name !== existing.name) {
    const duplicate = await prisma.warehouse.findUnique({
      where: { companyId_name: { companyId, name: data.name } },
    });
    if (duplicate) {
      throw new ApiError("Ya existe una bodega con ese nombre", 400, "WAREHOUSE_EXISTS");
    }
  }
  return prisma.warehouse.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.location !== undefined && { location: data.location ?? null }),
      ...(data.branchId !== undefined && { branchId: data.branchId ?? null }),
    },
  });
}

export async function toggleWarehouse(id: number, companyId: number, active: boolean) {
  const existing = await prisma.warehouse.findFirst({ where: { id, companyId } });
  if (!existing) {
    throw new ApiError("La bodega no existe", 404, "WAREHOUSE_NOT_FOUND");
  }
  return prisma.warehouse.update({ where: { id }, data: { active } });
}
