import { prisma } from "../db";
import { ApiError } from "../api";
import { Prisma } from "@/generated/prisma/client";
import { auditLog } from "../audit";

export interface ReturnItem {
  productId: number;
  quantity: number;
}

export async function listTransfersByCompany(companyId: number) {
  const transfers = await prisma.transfer.findMany({
    where: { companyId },
    orderBy: { transferDate: "desc" },
    include: {
      warehouse: { select: { id: true, name: true } },
      truck: { select: { id: true, name: true, plate: true } },
      user: { select: { id: true, name: true } },
      items: { select: { id: true, productId: true, quantity: true, returnedQuantity: true } },
    },
  });

  const truckIds = [...new Set(transfers.map((t) => t.truckId))];
  const truckInventoryRows = await prisma.truckInventory.findMany({
    where: { truckId: { in: truckIds } },
    select: { truckId: true, productId: true, quantity: true },
  });
  const truckStockMap = new Map(
    truckInventoryRows.map((r) => [`${r.truckId}-${r.productId}`, r.quantity]),
  );

  const products = await prisma.product.findMany({
    where: { companyId },
    select: { id: true, name: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p.name]));

  return transfers.map((t) => ({
    ...t,
    items: t.items.map((i) => {
      const transferRemaining = i.quantity - i.returnedQuantity;
      const truckStock = truckStockMap.get(`${t.truckId}-${i.productId}`) ?? 0;
      return {
        ...i,
        productName: productMap.get(i.productId) ?? "Producto",
        remaining: Math.min(transferRemaining, truckStock),
      };
    }),
  }));
}

export async function listReturnsByCompany(companyId: number) {
  const returns = await prisma.truckReturn.findMany({
    where: { companyId },
    orderBy: { returnDate: "desc" },
    include: {
      truck: { select: { id: true, name: true, plate: true } },
      warehouse: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true } } } },
    },
  });
  return returns;
}

export async function registerReturn(
  companyId: number,
  userId: number,
  input: { transferId: number; warehouseId?: number; notes?: string | null; items: ReturnItem[] },
) {
  return prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.findFirst({
      where: { id: input.transferId, companyId },
      include: { items: true },
    });
    if (!transfer) {
      throw new ApiError("El traslado no existe", 404, "TRANSFER_NOT_FOUND");
    }
    if (transfer.status === "REINTEGRADO") {
      throw new ApiError("Este traslado ya fue reintegrado por completo", 400, "ALREADY_RETURNED");
    }

    const warehouseId = input.warehouseId ?? transfer.warehouseId;
    const warehouse = await tx.warehouse.findFirst({
      where: { id: warehouseId, companyId, active: true },
    });
    if (!warehouse) {
      throw new ApiError("La bodega de destino no existe", 404, "WAREHOUSE_NOT_FOUND");
    }

    const productIds = [...new Set(input.items.map((i) => i.productId))];
    const products = await tx.product.findMany({
      where: { id: { in: productIds }, companyId },
      select: { id: true, name: true },
    });
    if (products.length !== productIds.length) {
      throw new ApiError("Alguno de los productos no existe en esta empresa", 400, "PRODUCT_NOT_FOUND");
    }
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    const transferMap = new Map(transfer.items.map((ti) => [ti.productId, ti]));
    for (const item of input.items) {
      const ti = transferMap.get(item.productId);
      if (!ti) {
        throw new ApiError(
          `El producto "${productMap.get(item.productId) ?? ""}" no pertenece a este traslado`,
          400,
          "VALIDATION_ERROR",
        );
      }
      const remaining = ti.quantity - ti.returnedQuantity;
      if (item.quantity > remaining) {
        throw new ApiError(
          `No se puede reintegrar más de lo trasladado de "${productMap.get(item.productId) ?? ""}"`,
          400,
          "RETURN_EXCEEDS_TRANSFER",
        );
      }
    }

    const trows = await tx.$queryRaw<{ id: number; productId: number; quantity: number }[]>`
      SELECT id, productId, quantity FROM truck_inventory
      WHERE truckId = ${transfer.truckId} AND productId IN (${Prisma.join(productIds)})
      FOR UPDATE
    `;
    const tMap = new Map(trows.map((r) => [r.productId, r]));
    for (const item of input.items) {
      const current = tMap.get(item.productId)?.quantity ?? 0;
      if (item.quantity > current) {
        throw new ApiError(
          `Stock insuficiente de "${productMap.get(item.productId) ?? ""}" en el camión`,
          400,
          "INSUFFICIENT_STOCK",
        );
      }
    }

    for (const item of input.items) {
      const tRow = tMap.get(item.productId);
      if (!tRow) continue;
      const newQty = tRow.quantity - item.quantity;
      if (newQty === 0) {
        await tx.truckInventory.delete({ where: { id: tRow.id } });
      } else {
        await tx.truckInventory.update({ where: { id: tRow.id }, data: { quantity: newQty } });
      }
    }

    const truckReturn = await tx.truckReturn.create({
      data: {
        companyId,
        transferId: transfer.id,
        warehouseId,
        truckId: transfer.truckId,
        userId,
        notes: input.notes ?? null,
      },
    });
    await tx.truckReturnItem.createMany({
      data: input.items.map((i) => ({
        returnId: truckReturn.id,
        productId: i.productId,
        quantity: i.quantity,
      })),
    });

    for (const item of input.items) {
      const wRow = await tx.warehouseInventory.findUnique({
        where: { warehouseId_productId: { warehouseId, productId: item.productId } },
      });
      if (wRow) {
        await tx.warehouseInventory.update({
          where: { id: wRow.id },
          data: { quantity: wRow.quantity + item.quantity },
        });
      } else {
        await tx.warehouseInventory.create({
          data: { warehouseId, productId: item.productId, quantity: item.quantity },
        });
      }

      await tx.stockMovement.create({
        data: {
          companyId,
          userId,
          productId: item.productId,
          type: "REINTEGRO",
          quantity: item.quantity,
          originType: "TRUCK",
          originId: transfer.truckId,
          destinationType: "WAREHOUSE",
          destinationId: warehouseId,
          referenceType: "RETURN",
          referenceId: truckReturn.id,
          description: `Reintegro del traslado #${transfer.id}`,
        },
      });
    }

    for (const item of input.items) {
      const ti = transferMap.get(item.productId)!;
      await tx.transferItem.update({
        where: { id: ti.id },
        data: { returnedQuantity: ti.returnedQuantity + item.quantity },
      });
    }
    const after = await tx.transferItem.findMany({ where: { transferId: transfer.id } });
    const fullyReturned = after.every((ti) => ti.returnedQuantity >= ti.quantity);
    const partialReturned = after.some((ti) => ti.returnedQuantity > 0);
    await tx.transfer.update({
      where: { id: transfer.id },
      data: { status: fullyReturned ? "REINTEGRADO" : partialReturned ? "PARCIAL" : "SIN_REINTEGRO" },
    });

    await auditLog(tx, {
      companyId,
      userId,
      action: "REGISTER_RETURN",
      entity: "TRUCK_RETURN",
      entityId: truckReturn.id,
      details: { transferId: transfer.id, truckId: transfer.truckId, warehouseId, items: input.items },
    });

    return truckReturn;
  });
}
