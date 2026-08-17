import { prisma } from "../db";
import { ApiError } from "../api";
import { Prisma, type PaymentMethod, type PaymentStatus } from "@/generated/prisma/client";
import { auditLog } from "../audit";

export interface SaleItemInput {
  productId: number;
  quantity: number;
  unitPrice: number;
}

export interface SaleInput {
  companyId: number;
  userId: number;
  customerId: number;
  truckId?: number | null;
  paymentMethod?: PaymentMethod | null;
  amountReceived?: number;
  notes?: string | null;
  items: SaleItemInput[];
}

export async function createSale(input: SaleInput) {
  const { companyId, userId, customerId, truckId, paymentMethod, amountReceived, notes, items } =
    input;

  const customer = await prisma.customer.findFirst({ where: { id: customerId, companyId } });
  if (!customer) {
    throw new ApiError("El cliente no existe en esta empresa", 400, "CUSTOMER_NOT_FOUND");
  }

  let truck: { id: number; name: string } | null = null;
  if (truckId) {
    truck = await prisma.truck.findFirst({ where: { id: truckId, companyId } });
    if (!truck) {
      throw new ApiError("El camión no existe en esta empresa", 400, "TRUCK_NOT_FOUND");
    }
  }

  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, companyId },
    select: { id: true, name: true },
  });
  if (products.length !== productIds.length) {
    throw new ApiError("Alguno de los productos no existe en esta empresa", 400, "PRODUCT_NOT_FOUND");
  }
  const productMap = new Map(products.map((p) => [p.id, p.name]));

  const subtotal = Number(
    items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0).toFixed(2),
  );
  const total = subtotal;

  const wantsPayment = Boolean(paymentMethod && amountReceived && amountReceived > 0);
  const status: PaymentStatus = !wantsPayment
    ? "PENDIENTE"
    : amountReceived! >= total
      ? "PAGADO"
      : "ABONO";

  const source = truckId
    ? { kind: "TRUCK" as const, id: truckId, name: truck!.name }
    : await (async () => {
        const wh = await prisma.warehouse.findFirst({
          where: { companyId, active: true },
          orderBy: { id: "asc" },
        });
        if (!wh) {
          throw new ApiError("No hay una bodega activa para descontar la venta", 400, "NO_ACTIVE_WAREHOUSE");
        }
        return { kind: "WAREHOUSE" as const, id: wh.id, name: wh.name };
      })();

  return prisma.$transaction(async (tx) => {
    const table = source.kind === "TRUCK" ? "truck_inventory" : "warehouse_inventory";
    const rows = await tx.$queryRaw<{ id: number; productId: number; quantity: number }[]>`
      SELECT id, productId, quantity FROM ${Prisma.raw(table)}
      WHERE ${source.kind === "TRUCK" ? Prisma.raw("truckId") : Prisma.raw("warehouseId")} = ${source.id}
      AND productId IN (${Prisma.join(productIds)})
      FOR UPDATE
    `;
    const stockMap = new Map(rows.map((r) => [r.productId, r]));
    for (const item of items) {
      const current = stockMap.get(item.productId)?.quantity ?? 0;
      if (current < item.quantity) {
        throw new ApiError(
          `Stock insuficiente de "${productMap.get(item.productId)}" en ${source.name}`,
          400,
          "INSUFFICIENT_STOCK",
        );
      }
    }

    const lastSale = await tx.sale.findFirst({ where: { companyId }, orderBy: { id: "desc" } });
    const nextNumber = lastSale ? lastSale.id + 1 : 1;
    const saleNumber = `FV-${String(nextNumber).padStart(5, "0")}`;

    const sale = await tx.sale.create({
      data: {
        companyId,
        customerId,
        truckId: source.kind === "TRUCK" ? source.id : null,
        userId,
        saleNumber,
        subtotal,
        total,
        status,
        paymentMethod: paymentMethod ?? null,
        notes: notes ?? null,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: Number((item.quantity * item.unitPrice).toFixed(2)),
          })),
        },
      },
      include: {
        customer: true,
        truck: true,
        items: { include: { product: true } },
      },
    });

    if (status !== "PENDIENTE" && amountReceived && amountReceived > 0) {
      const isFull = status === "PAGADO";
      await tx.payment.create({
        data: {
          companyId,
          saleId: sale.id,
          customerId,
          userId,
          amount: isFull ? total : amountReceived,
          method: paymentMethod!,
          kind: isFull ? "PAGO" : "ABONO",
          received: isFull ? amountReceived : null,
          change: isFull ? Number((amountReceived - total).toFixed(2)) : null,
          notes: notes ?? null,
        },
      });
    }

    for (const item of items) {
      const stockRow = stockMap.get(item.productId);
      if (stockRow) {
        if (source.kind === "TRUCK") {
          await tx.truckInventory.update({
            where: { id: stockRow.id },
            data: { quantity: stockRow.quantity - item.quantity },
          });
        } else {
          await tx.warehouseInventory.update({
            where: { id: stockRow.id },
            data: { quantity: stockRow.quantity - item.quantity },
          });
        }
      }
      await tx.stockMovement.create({
        data: {
          companyId,
          userId,
          productId: item.productId,
          type: "VENTA",
          quantity: -item.quantity,
          originType: source.kind === "TRUCK" ? "TRUCK" : "WAREHOUSE",
          originId: source.id,
          referenceType: "SALE",
          referenceId: sale.id,
          description: `Venta ${saleNumber}`,
        },
      });
    }

    await auditLog(tx, {
      companyId,
      userId,
      action: "CREATE_SALE",
      entity: "SALE",
      entityId: sale.id,
      details: { saleNumber, total, items: items.length },
    });

    return tx.sale.findUniqueOrThrow({
      where: { id: sale.id },
      include: {
        customer: true,
        truck: true,
        items: { include: { product: true } },
        payments: true,
      },
    });
  });
}

export async function listSalesByCompany(
  companyId: number,
  opts: { status?: string; search?: string; customerId?: number } = {},
) {
  const where: Prisma.SaleWhereInput = {
    companyId,
    ...(opts.status ? { status: opts.status as PaymentStatus } : {}),
    ...(opts.customerId ? { customerId: opts.customerId } : {}),
    ...(opts.search
      ? {
          OR: [
            { saleNumber: { contains: opts.search } },
            { customer: { name: { contains: opts.search } } },
          ],
        }
      : {}),
  };

  return prisma.sale.findMany({
    where,
    orderBy: { id: "desc" },
    include: {
      customer: { select: { id: true, name: true, lastname: true, identification: true } },
      truck: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
      _count: { select: { items: true, payments: true } },
    },
  });
}

export async function getSale(id: number, companyId: number) {
  const sale = await prisma.sale.findFirst({
    where: { id, companyId },
    include: {
      customer: true,
      truck: { select: { id: true, name: true, plate: true } },
      user: { select: { id: true, name: true } },
      items: {
        include: { product: { select: { id: true, name: true, serial: true } } },
        orderBy: { id: "asc" },
      },
      payments: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!sale) {
    throw new ApiError("La venta no existe", 404, "SALE_NOT_FOUND");
  }

  const paymentIds = sale.payments.map((payment) => payment.id);
  const attachments = paymentIds.length
    ? await prisma.attachment.findMany({
        where: { companyId, entityType: "PAYMENT", entityId: { in: paymentIds } },
      })
    : [];
  const attachmentsByPayment = new Map<number, Array<Record<string, unknown>>>();
  for (const attachment of attachments) {
    const list = attachmentsByPayment.get(attachment.entityId) ?? [];
    list.push({
      id: attachment.id,
      kind: attachment.kind,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      size: attachment.size,
      fileUrl: `/api/sales/${sale.id}/payments/${attachment.entityId}/attachment?kind=${attachment.kind}`,
    });
    attachmentsByPayment.set(attachment.entityId, list);
  }

  return {
    ...sale,
    payments: sale.payments.map((payment) => ({
      ...payment,
      attachments: attachmentsByPayment.get(payment.id) ?? [],
    })),
  };
}

export async function addSalePayment(
  saleId: number,
  companyId: number,
  userId: number,
  input: { amount: number; method: PaymentMethod; notes?: string | null },
) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({ where: { id: saleId, companyId } });
    if (!sale) {
      throw new ApiError("La venta no existe", 404, "SALE_NOT_FOUND");
    }

    const total = Number(sale.total);
    const paidAgg = await tx.payment.aggregate({ where: { saleId }, _sum: { amount: true } });
    const alreadyPaid = Number(paidAgg._sum.amount ?? 0);
    const pending = Number((total - alreadyPaid).toFixed(2));

    if (input.amount > pending) {
      throw new ApiError("El abono excede el saldo pendiente de la venta", 400, "PAYMENT_EXCEEDS_BALANCE");
    }

    const payment = await tx.payment.create({
      data: {
        companyId,
        saleId,
        customerId: sale.customerId,
        userId,
        amount: input.amount,
        method: input.method,
        kind: "ABONO",
        notes: input.notes ?? null,
      },
    });

    const newPaid = Number((alreadyPaid + input.amount).toFixed(2));
    await tx.sale.update({
      where: { id: saleId },
      data: { status: newPaid >= total ? "PAGADO" : "ABONO" },
    });

    await auditLog(tx, {
      companyId,
      userId,
      action: "REGISTER_PAYMENT",
      entity: "PAYMENT",
      entityId: payment.id,
      details: { saleId, amount: input.amount },
    });

    return payment;
  });
}

export async function addCustomerPayment(
  companyId: number,
  userId: number,
  input: {
    customerId: number;
    amount: number;
    method: PaymentMethod;
    received?: number;
    change?: number;
    notes?: string | null;
  },
) {
  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, companyId },
  });
  if (!customer) {
    throw new ApiError("El cliente no existe en esta empresa", 400, "CUSTOMER_NOT_FOUND");
  }

  return prisma.$transaction(async (tx) => {
    const sales = await tx.sale.findMany({
      where: { companyId, customerId: input.customerId, status: { in: ["PENDIENTE", "ABONO"] } },
      orderBy: { id: "asc" },
    });
    if (sales.length === 0) {
      throw new ApiError("El cliente no tiene saldos pendientes", 400, "NO_PENDING_BALANCE");
    }

    const paymentAgg = await tx.payment.groupBy({
      by: ["saleId"],
      where: { companyId, saleId: { in: sales.map((s) => s.id) } },
      _sum: { amount: true },
    });
    const paidBySale = new Map(
      paymentAgg.map((p) => [p.saleId, Number(p._sum.amount ?? 0)]),
    );

    let remaining = Number(input.amount.toFixed(2));
    const created: Array<{ id: number; saleId: number; amount: number; kind: "PAGO" | "ABONO" }> = [];

    for (const sale of sales) {
      if (remaining <= 0) break;
      const pending = Number((Number(sale.total) - (paidBySale.get(sale.id) ?? 0)).toFixed(2));
      if (pending <= 0) continue;

      const applied = Number(Math.min(remaining, pending).toFixed(2));
      const isFull = applied >= pending;
      const payment = await tx.payment.create({
        data: {
          companyId,
          saleId: sale.id,
          customerId: input.customerId,
          userId,
          amount: applied,
          method: input.method,
          kind: isFull ? "PAGO" : "ABONO",
          received: created.length === 0 ? input.received ?? null : null,
          change: created.length === 0 ? input.change ?? null : null,
          notes: input.notes ?? null,
        },
      });

      const newPaid = Number(((paidBySale.get(sale.id) ?? 0) + applied).toFixed(2));
      await tx.sale.update({
        where: { id: sale.id },
        data: { status: newPaid >= Number(sale.total) ? "PAGADO" : "ABONO" },
      });

      created.push({ id: payment.id, saleId: sale.id, amount: applied, kind: payment.kind });
      remaining = Number((remaining - applied).toFixed(2));

      await auditLog(tx, {
        companyId,
        userId,
        action: "REGISTER_PAYMENT",
        entity: "PAYMENT",
        entityId: payment.id,
        details: { saleId: sale.id, customerId: input.customerId, amount: applied },
      });
    }

    if (remaining > 0) {
      throw new ApiError("El monto excede el saldo pendiente del cliente", 400, "PAYMENT_EXCEEDS_BALANCE");
    }

    return { payments: created };
  });
}
