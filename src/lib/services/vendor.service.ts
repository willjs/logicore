import { prisma } from "../db";
import { ApiError } from "../api";
import { Prisma } from "@/generated/prisma/client";
import { auditLog } from "../audit";

export interface VendorItem {
  productId: number;
  quantity: number;
}

export async function listVendorsWithStock(companyId: number) {
  const where: Prisma.UserCompanyWhereInput = { companyId, active: true };
  const memberships = await prisma.userCompany.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          active: true,
          contractNumber: true,
          vendorInventory: {
            where: { companyId },
            select: {
              productId: true,
              quantity: true,
              product: { select: { id: true, name: true, serial: true, salePrice: true } },
            },
          },
        },
      },
      role: { select: { id: true, name: true } },
    },
  });

  const vendorUsers = memberships
    .filter((m) => /vendedor/i.test(m.role.name))
    .map((m) => m.user)
    .filter((u) => u.active);

  const rows = vendorUsers.map((user) => ({
    id: user.id,
    name: user.name,
    contractNumber: user.contractNumber,
    inventory: user.vendorInventory
      .filter((v) => v.quantity > 0)
      .map((v) => ({
        productId: v.productId,
        quantity: v.quantity,
        product: { id: v.product.id, name: v.product.name, serial: v.product.serial, salePrice: v.product.salePrice },
      })),
  }));

  return rows;
}

export async function getVendorStock(companyId: number, userId: number) {
  const rows = await prisma.vendorInventory.findMany({
    where: { companyId, userId, quantity: { gt: 0 } },
    include: {
      product: { select: { id: true, name: true, serial: true, salePrice: true } },
    },
    orderBy: { product: { name: "asc" } },
  });
  return rows.map((r) => ({
    productId: r.productId,
    quantity: r.quantity,
    product: { id: r.product.id, name: r.product.name, serial: r.product.serial, salePrice: Number(r.product.salePrice) },
  }));
}

export interface AssignVendorInput {
  truckId: number;
  userId: number;
  items: VendorItem[];
  notes?: string | null;
  requestId?: number | null;
}

export async function assignVendorStock(
  companyId: number,
  assignedBy: number,
  input: AssignVendorInput,
) {
  const truck = await prisma.truck.findFirst({
    where: { id: input.truckId, companyId },
    select: { id: true, name: true },
  });
  if (!truck) {
    throw new ApiError("El camión no existe en esta empresa", 404, "TRUCK_NOT_FOUND");
  }

  const membership = await prisma.userCompany.findFirst({
    where: { userId: input.userId, companyId, active: true },
    include: { role: true },
  });
  if (!membership) {
    throw new ApiError("El usuario seleccionado no pertenece a esta empresa", 400, "USER_NOT_FOUND");
  }
  if (!/vendedor/i.test(membership.role.name)) {
    throw new ApiError("El usuario seleccionado debe tener el rol VENDEDOR", 400, "NOT_VENDOR");
  }

  const productIds = [...new Set(input.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, companyId },
    select: { id: true, name: true },
  });
  if (products.length !== productIds.length) {
    throw new ApiError("Alguno de los productos no existe en esta empresa", 400, "PRODUCT_NOT_FOUND");
  }
  const productMap = new Map(products.map((p) => [p.id, p.name]));

  return prisma.$transaction(async (tx) => {
    if (input.requestId) {
      const request = await tx.vendorStockRequest.findFirst({
        where: { id: input.requestId, companyId },
        select: { id: true, status: true },
      });
      if (!request) {
        throw new ApiError("La solicitud de stock no existe", 404, "REQUEST_NOT_FOUND");
      }
      if (request.status !== "PENDIENTE") {
        throw new ApiError("Esta solicitud ya fue procesada", 400, "ALREADY_PROCESSED");
      }
    }

    const trows = await tx.$queryRaw<{ id: number; productId: number; quantity: number }[]>`
      SELECT id, productId, quantity FROM truck_inventory
      WHERE truckId = ${input.truckId} AND productId IN (${Prisma.join(productIds)})
      FOR UPDATE
    `;
    const tMap = new Map(trows.map((r) => [r.productId, r]));
    for (const item of input.items) {
      const current = tMap.get(item.productId)?.quantity ?? 0;
      if (current < item.quantity) {
        throw new ApiError(
          `Stock insuficiente de "${productMap.get(item.productId) ?? ""}" en el camión ${truck.name}`,
          400,
          "INSUFFICIENT_STOCK",
        );
      }
    }

    const vrows = await tx.$queryRaw<{ id: number; productId: number; quantity: number }[]>`
      SELECT id, productId, quantity FROM vendor_inventory
      WHERE companyId = ${companyId} AND userId = ${input.userId} AND productId IN (${Prisma.join(productIds)})
      FOR UPDATE
    `;
    const vMap = new Map(vrows.map((r) => [r.productId, r]));

    const assignment = await tx.vendorAssignment.create({
      data: {
        companyId,
        truckId: input.truckId,
        userId: input.userId,
        assignedBy,
        notes: input.notes ?? null,
        items: {
          create: input.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        },
      },
    });

    for (const item of input.items) {
      const tRow = tMap.get(item.productId)!;
      const newTruckQty = tRow.quantity - item.quantity;
      if (newTruckQty === 0) {
        await tx.truckInventory.delete({ where: { id: tRow.id } });
      } else {
        await tx.truckInventory.update({ where: { id: tRow.id }, data: { quantity: newTruckQty } });
      }

      const vRow = vMap.get(item.productId);
      if (vRow) {
        await tx.vendorInventory.update({
          where: { id: vRow.id },
          data: { quantity: vRow.quantity + item.quantity },
        });
      } else {
        await tx.vendorInventory.create({
          data: { companyId, userId: input.userId, productId: item.productId, quantity: item.quantity },
        });
      }

      await tx.stockMovement.create({
        data: {
          companyId,
          userId: assignedBy,
          productId: item.productId,
          type: "TRASLADO",
          quantity: -item.quantity,
          originType: "TRUCK",
          originId: input.truckId,
          destinationType: "TRUCK",
          destinationId: input.truckId,
          referenceType: "TRANSFER",
          referenceId: assignment.id,
          description: `Asignación a vendedor #${input.userId}`,
        },
      });
    }

    await auditLog(tx, {
      companyId,
      userId: assignedBy,
      action: "ASSIGN_VENDOR",
      entity: "VENDOR_ASSIGNMENT",
      entityId: assignment.id,
      details: { truckId: input.truckId, userId: input.userId, items: input.items.length },
    });

    if (input.requestId) {
      await tx.vendorStockRequest.update({
        where: { id: input.requestId },
        data: { status: "PROCESADO", processedAt: new Date(), processedBy: assignedBy },
      });
    }

    return assignment;
  });
}

export interface VendorReturnInput {
  assignmentId: number;
  items: VendorItem[];
  notes?: string | null;
}

export async function returnVendorStock(
  companyId: number,
  userId: number,
  input: VendorReturnInput,
) {
  return prisma.$transaction(async (tx) => {
    const assignment = await tx.vendorAssignment.findFirst({
      where: { id: input.assignmentId, companyId },
      include: { items: true, truck: { select: { id: true, name: true } } },
    });
    if (!assignment) {
      throw new ApiError("La asignación no existe", 404, "ASSIGNMENT_NOT_FOUND");
    }
    if (assignment.status === "DEVUELTO") {
      throw new ApiError("Esta asignación ya fue devuelta por completo", 400, "ALREADY_RETURNED");
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

    const assignmentMap = new Map(assignment.items.map((ai) => [ai.productId, ai]));
    for (const item of input.items) {
      const ai = assignmentMap.get(item.productId);
      if (!ai) {
        throw new ApiError(
          `El producto "${productMap.get(item.productId) ?? ""}" no pertenece a esta asignación`,
          400,
          "VALIDATION_ERROR",
        );
      }
      const remaining = ai.quantity - ai.returnedQuantity;
      if (item.quantity > remaining) {
        throw new ApiError(
          `No se puede devolver más de lo asignado de "${productMap.get(item.productId) ?? ""}"`,
          400,
          "RETURN_EXCEEDS_ASSIGNMENT",
        );
      }
    }

    const vrows = await tx.$queryRaw<{ id: number; productId: number; quantity: number }[]>`
      SELECT id, productId, quantity FROM vendor_inventory
      WHERE companyId = ${companyId} AND userId = ${assignment.userId} AND productId IN (${Prisma.join(productIds)})
      FOR UPDATE
    `;
    const vMap = new Map(vrows.map((r) => [r.productId, r]));
    for (const item of input.items) {
      const current = vMap.get(item.productId)?.quantity ?? 0;
      if (current < item.quantity) {
        throw new ApiError(
          `Stock insuficiente de "${productMap.get(item.productId) ?? ""}" en el vendedor`,
          400,
          "INSUFFICIENT_STOCK",
        );
      }
    }

    const trows = await tx.$queryRaw<{ id: number; productId: number; quantity: number }[]>`
      SELECT id, productId, quantity FROM truck_inventory
      WHERE truckId = ${assignment.truckId} AND productId IN (${Prisma.join(productIds)})
      FOR UPDATE
    `;
    const tMap = new Map(trows.map((r) => [r.productId, r]));

    for (const item of input.items) {
      const vRow = vMap.get(item.productId)!;
      const newVendorQty = vRow.quantity - item.quantity;
      if (newVendorQty === 0) {
        await tx.vendorInventory.delete({ where: { id: vRow.id } });
      } else {
        await tx.vendorInventory.update({ where: { id: vRow.id }, data: { quantity: newVendorQty } });
      }

      const tRow = tMap.get(item.productId);
      if (tRow) {
        await tx.truckInventory.update({
          where: { id: tRow.id },
          data: { quantity: tRow.quantity + item.quantity },
        });
      } else {
        await tx.truckInventory.create({
          data: { truckId: assignment.truckId, productId: item.productId, quantity: item.quantity },
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
          originId: assignment.truckId,
          destinationType: "TRUCK",
          destinationId: assignment.truckId,
          referenceType: "TRANSFER",
          referenceId: assignment.id,
          description: `Devolución de vendedor #${assignment.userId}`,
        },
      });
    }

    for (const item of input.items) {
      const ai = assignmentMap.get(item.productId)!;
      await tx.vendorAssignmentItem.update({
        where: { id: ai.id },
        data: { returnedQuantity: ai.returnedQuantity + item.quantity },
      });
    }
    const after = await tx.vendorAssignmentItem.findMany({
      where: { assignmentId: assignment.id },
    });
    const fullyReturned = after.every((ai) => ai.returnedQuantity >= ai.quantity);
    if (fullyReturned) {
      await tx.vendorAssignment.update({
        where: { id: assignment.id },
        data: { status: "DEVUELTO", notes: input.notes ?? assignment.notes },
      });
    }

    await auditLog(tx, {
      companyId,
      userId,
      action: "RETURN_VENDOR",
      entity: "VENDOR_ASSIGNMENT",
      entityId: assignment.id,
      details: { truckId: assignment.truckId, userId: assignment.userId, items: input.items },
    });

    return assignment;
  });
}

export async function listVendorAssignments(
  companyId: number,
  opts: { userId?: number; truckId?: number } = {},
) {
  const assignments = await prisma.vendorAssignment.findMany({
    where: {
      companyId,
      ...(opts.userId ? { userId: opts.userId } : {}),
      ...(opts.truckId ? { truckId: opts.truckId } : {}),
    },
    orderBy: { assignmentDate: "desc" },
    include: {
      truck: { select: { id: true, name: true, plate: true } },
      user: { select: { id: true, name: true } },
      assigned: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true, serial: true } } } },
    },
  });
  return assignments.map((a) => ({
    ...a,
    items: a.items.map((i) => ({
      ...i,
      remaining: i.quantity - i.returnedQuantity,
    })),
  }));
}

export interface VendorStockRequestInput {
  truckId: number;
  items: VendorItem[];
  notes?: string | null;
}

export async function createVendorStockRequest(
  companyId: number,
  userId: number,
  input: VendorStockRequestInput,
) {
  if (input.items.length === 0) {
    throw new ApiError("Debes solicitar al menos un producto", 400, "VALIDATION_ERROR");
  }

  const truck = await prisma.truck.findFirst({
    where: { id: input.truckId, companyId, active: true },
    select: { id: true },
  });
  if (!truck) {
    throw new ApiError("El camión no existe en esta empresa", 404, "TRUCK_NOT_FOUND");
  }

  const hasAssignment = await prisma.vendorAssignment.findFirst({
    where: { companyId, userId, truckId: input.truckId, status: { not: "DEVUELTO" } },
    select: { id: true },
  });
  if (!hasAssignment) {
    throw new ApiError(
      "Solo puedes pedir stock al camión que te ha asignado mercancía",
      400,
      "NOT_ASSIGNED_TO_TRUCK",
    );
  }

  const productIds = [...new Set(input.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, companyId },
    select: { id: true },
  });
  if (products.length !== productIds.length) {
    throw new ApiError(
      "Alguno de los productos no existe en esta empresa",
      400,
      "PRODUCT_NOT_FOUND",
    );
  }

  return prisma.vendorStockRequest.create({
    data: {
      companyId,
      truckId: input.truckId,
      userId,
      notes: input.notes ?? null,
      items: {
        create: input.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      },
    },
    include: {
      truck: { select: { id: true, name: true, plate: true } },
      user: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true, serial: true } } } },
    },
  });
}

export async function listVendorStockRequests(
  companyId: number,
  opts: { userId?: number; truckId?: number } = {},
) {
  const requests = await prisma.vendorStockRequest.findMany({
    where: {
      companyId,
      ...(opts.userId ? { userId: opts.userId } : {}),
      ...(opts.truckId ? { truckId: opts.truckId } : {}),
    },
    orderBy: { requestDate: "desc" },
    include: {
      user: { select: { id: true, name: true } },
      truck: { select: { id: true, name: true, plate: true } },
      processed: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true, serial: true } } } },
    },
  });
  return requests;
}

export async function dispatchVendorStockRequest(
  companyId: number,
  dispatchedBy: number,
  requestId: number,
  items?: VendorItem[],
) {
  const request = await prisma.vendorStockRequest.findFirst({
    where: { id: requestId, companyId },
    include: { items: true },
  });
  if (!request) {
    throw new ApiError("La solicitud no existe", 404, "REQUEST_NOT_FOUND");
  }
  if (request.status !== "PENDIENTE") {
    throw new ApiError("Esta solicitud ya fue procesada", 400, "ALREADY_PROCESSED");
  }

  const toAssign =
    items && items.length > 0
      ? items
      : request.items.map((i) => ({ productId: i.productId, quantity: i.quantity }));

  const assignment = await assignVendorStock(companyId, dispatchedBy, {
    truckId: request.truckId,
    userId: request.userId,
    notes: request.notes ?? null,
    items: toAssign,
    requestId: request.id,
  });

  const updated = await prisma.vendorStockRequest.findUnique({
    where: { id: request.id },
    include: {
      user: { select: { id: true, name: true } },
      truck: { select: { id: true, name: true, plate: true } },
      processed: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true, serial: true } } } },
    },
  });

  return { request: updated, assignment };
}