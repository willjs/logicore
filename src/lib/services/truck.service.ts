import { prisma } from "../db";
import { ApiError } from "../api";
import { Prisma } from "@/generated/prisma/client";
import { auditLog } from "../audit";

export interface TruckData {
  name?: string;
  plate?: string | null;
  driverId?: number | null;
}

export interface TruckLoadItem {
  productId: number;
  quantity: number;
}

async function validateDriver(companyId: number, driverId?: number | null) {
  if (!driverId) return;
  const membership = await prisma.userCompany.findFirst({
    where: { userId: driverId, companyId, active: true },
  });
  if (!membership) {
    throw new ApiError("El conductor seleccionado no pertenece a esta empresa", 400, "DRIVER_NOT_FOUND");
  }
}

export async function listTrucksByCompany(companyId: number) {
  return prisma.truck.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    include: {
      driver: { select: { id: true, name: true } },
      _count: { select: { sales: true, inventory: true } },
    },
  });
}

export async function createTruck(companyId: number, data: TruckData) {
  const name = data.name!;
  const existing = await prisma.truck.findUnique({
    where: { companyId_name: { companyId, name } },
  });
  if (existing) {
    throw new ApiError("Ya existe un camión con ese nombre", 400, "TRUCK_EXISTS");
  }
  await validateDriver(companyId, data.driverId);
  return prisma.truck.create({
    data: {
      name,
      plate: data.plate ?? null,
      driverId: data.driverId ?? null,
      companyId,
    },
    include: { driver: { select: { id: true, name: true } } },
  });
}

export async function updateTruck(id: number, companyId: number, data: TruckData) {
  const existing = await prisma.truck.findFirst({ where: { id, companyId } });
  if (!existing) {
    throw new ApiError("El camión no existe", 404, "TRUCK_NOT_FOUND");
  }
  if (data.name && data.name !== existing.name) {
    const duplicate = await prisma.truck.findUnique({
      where: { companyId_name: { companyId, name: data.name } },
    });
    if (duplicate) {
      throw new ApiError("Ya existe un camión con ese nombre", 400, "TRUCK_EXISTS");
    }
  }
  await validateDriver(companyId, data.driverId);
  return prisma.truck.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.plate !== undefined && { plate: data.plate ?? null }),
      ...(data.driverId !== undefined && { driverId: data.driverId ?? null }),
    },
    include: { driver: { select: { id: true, name: true } } },
  });
}

export async function toggleTruck(id: number, companyId: number, active: boolean) {
  const existing = await prisma.truck.findFirst({ where: { id, companyId } });
  if (!existing) {
    throw new ApiError("El camión no existe", 404, "TRUCK_NOT_FOUND");
  }
  return prisma.truck.update({ where: { id }, data: { active } });
}

export async function loadTruck(
  truckId: number,
  companyId: number,
  userId: number,
  input: { warehouseId?: number; items: TruckLoadItem[] },
) {
  const truck = await prisma.truck.findFirst({ where: { id: truckId, companyId } });
  if (!truck) {
    throw new ApiError("El camión no existe", 404, "TRUCK_NOT_FOUND");
  }

  const warehouse = input.warehouseId
    ? await prisma.warehouse.findFirst({ where: { id: input.warehouseId, companyId } })
    : await prisma.warehouse.findFirst({ where: { companyId, active: true }, orderBy: { id: "asc" } });
  if (!warehouse) {
    throw new ApiError("No hay una bodega activa para cargar el camión", 400, "NO_ACTIVE_WAREHOUSE");
  }

  const productIds = [...new Set(input.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, companyId },
    select: { id: true, name: true },
  });
  if (products.length !== productIds.length) {
    throw new ApiError("Alguno de los productos no existe en esta empresa", 400, "PRODUCT_NOT_FOUND");
  }

  return prisma.$transaction(async (tx) => {
    const wrows = await tx.$queryRaw<{ id: number; productId: number; quantity: number }[]>`
      SELECT id, productId, quantity FROM warehouse_inventory
      WHERE warehouseId = ${warehouse.id} AND productId IN (${Prisma.join(productIds)})
      FOR UPDATE
    `;
    const wMap = new Map(wrows.map((r) => [r.productId, r]));
    for (const item of input.items) {
      const current = wMap.get(item.productId)?.quantity ?? 0;
      if (current < item.quantity) {
        throw new ApiError(
          `Stock insuficiente del producto en la bodega ${warehouse.name}`,
          400,
          "INSUFFICIENT_STOCK",
        );
      }
    }

    const trows = await tx.$queryRaw<{ id: number; productId: number; quantity: number }[]>`
      SELECT id, productId, quantity FROM truck_inventory
      WHERE truckId = ${truckId} AND productId IN (${Prisma.join(productIds)})
      FOR UPDATE
    `;
    const tMap = new Map(trows.map((r) => [r.productId, r]));

    const transfer = await tx.transfer.create({
      data: {
        companyId,
        warehouseId: warehouse.id,
        truckId,
        userId,
        status: "SIN_REINTEGRO",
      },
    });
    await tx.transferItem.createMany({
      data: input.items.map((i) => ({
        transferId: transfer.id,
        productId: i.productId,
        quantity: i.quantity,
      })),
    });

    for (const item of input.items) {
      const wRow = wMap.get(item.productId)!;
      await tx.warehouseInventory.update({
        where: { id: wRow.id },
        data: { quantity: wRow.quantity - item.quantity },
      });

      const tRow = tMap.get(item.productId);
      if (tRow) {
        await tx.truckInventory.update({
          where: { id: tRow.id },
          data: { quantity: tRow.quantity + item.quantity },
        });
      } else {
        await tx.truckInventory.create({
          data: { truckId, productId: item.productId, quantity: item.quantity },
        });
      }

      await tx.stockMovement.create({
        data: {
          companyId,
          userId,
          productId: item.productId,
          type: "TRASLADO",
          quantity: -item.quantity,
          originType: "WAREHOUSE",
          originId: warehouse.id,
          destinationType: "TRUCK",
          destinationId: truckId,
          referenceType: "TRANSFER",
          referenceId: transfer.id,
          description: `Carga camión ${truck.name}`,
        },
      });
    }

    await auditLog(tx, {
      companyId,
      userId,
      action: "LOAD_TRUCK",
      entity: "TRANSFER",
      entityId: transfer.id,
      details: { warehouseId: warehouse.id, truckId, items: input.items.length },
    });

    return { truckId, warehouseId: warehouse.id, transferId: transfer.id };
  });
}
