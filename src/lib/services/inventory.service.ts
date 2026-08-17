import { prisma } from "../db";
import { ApiError } from "../api";
import type { Prisma } from "@/generated/prisma/client";
import { auditLog } from "../audit";

export interface MovementInput {
  companyId: number;
  userId: number;
  productId: number;
  warehouseId: number;
  type: "ENTRADA" | "SALIDA" | "AJUSTE";
  quantity: number;
  referenceType?: "SALE" | "TRANSFER" | "RETURN" | "ADJUSTMENT" | "ENTRY" | "EXIT" | null;
  referenceId?: number | null;
  description?: string | null;
}

export async function registerMovement(input: MovementInput) {
  const { companyId, userId, productId, warehouseId, type, quantity } = input;

  if (type !== "AJUSTE" && quantity <= 0) {
    throw new ApiError(
      type === "ENTRADA" ? "La cantidad de entrada debe ser mayor a 0" : "La cantidad de salida debe ser mayor a 0",
      400,
      "INVALID_QUANTITY",
    );
  }

  const [product, warehouse] = await Promise.all([
    prisma.product.findFirst({ where: { id: productId, companyId } }),
    prisma.warehouse.findFirst({ where: { id: warehouseId, companyId } }),
  ]);
  if (!product) {
    throw new ApiError("El producto no existe en esta empresa", 400, "PRODUCT_NOT_FOUND");
  }
  if (!warehouse) {
    throw new ApiError("La bodega no existe en esta empresa", 400, "WAREHOUSE_NOT_FOUND");
  }

  const delta = type === "SALIDA" ? -quantity : quantity;

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: number; quantity: number }[]>`
      SELECT id, quantity FROM warehouse_inventory
      WHERE warehouseId = ${warehouseId} AND productId = ${productId}
      LIMIT 1 FOR UPDATE
    `;

    const currentQty = rows[0]?.quantity ?? 0;
    const newQty = currentQty + delta;
    if (newQty < 0) {
      throw new ApiError(
        "Stock insuficiente para realizar la operación",
        400,
        "INSUFFICIENT_STOCK",
      );
    }

    const stock = rows[0]
      ? await tx.warehouseInventory.update({
          where: { id: rows[0].id },
          data: { quantity: newQty },
        })
      : await tx.warehouseInventory.create({
          data: { warehouseId, productId, quantity: newQty },
        });

    const movement = await tx.stockMovement.create({
      data: {
        companyId,
        userId,
        productId,
        type,
        quantity: delta,
        originType: type === "ENTRADA" ? null : "WAREHOUSE",
        originId: type === "ENTRADA" ? null : warehouseId,
        destinationType: type === "ENTRADA" ? "WAREHOUSE" : null,
        destinationId: type === "ENTRADA" ? warehouseId : null,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        description: input.description ?? null,
      },
    });

    await auditLog(tx, {
      companyId,
      userId,
      action: "REGISTER_MOVEMENT",
      entity: "STOCK_MOVEMENT",
      entityId: movement.id,
      details: { productId, warehouseId, type, quantity: delta },
    });

    return { stock, movement };
  });
}

export async function listStockByCompany(companyId: number, warehouseId?: number) {
  return prisma.warehouseInventory.findMany({
    where: {
      warehouse: { companyId },
      ...(warehouseId !== undefined ? { warehouseId } : {}),
    },
    include: {
      product: { include: { brand: true, category: true } },
      warehouse: true,
    },
    orderBy: { product: { name: "asc" } },
  });
}

// ---------------------------------------------------------------------------
// Producto nuevo + stock inicial
// ---------------------------------------------------------------------------

export interface ProductWithStockInput {
  companyId: number;
  userId: number;
  name: string;
  serial?: string | null;
  salePrice?: number;
  brandId?: number | null;
  categoryId?: number | null;
  quantity: number;
  warehouseId: number;
}

export async function createProductWithStock(input: ProductWithStockInput) {
  const { companyId, userId, name, serial, salePrice, brandId, categoryId, quantity, warehouseId } =
    input;

  if (!name.trim()) {
    throw new ApiError("El nombre del producto es obligatorio", 400, "VALIDATION_ERROR");
  }
  if (quantity <= 0) {
    throw new ApiError("La cantidad inicial debe ser mayor a 0", 400, "INVALID_QUANTITY");
  }

  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, companyId, active: true },
  });
  if (!warehouse) {
    throw new ApiError("La bodega no existe en esta empresa", 400, "WAREHOUSE_NOT_FOUND");
  }

  if (brandId) {
    const brand = await prisma.brand.findFirst({ where: { id: brandId, companyId } });
    if (!brand) {
      throw new ApiError("La marca seleccionada no existe en esta empresa", 400, "BRAND_NOT_FOUND");
    }
  }
  if (categoryId) {
    const category = await prisma.category.findFirst({ where: { id: categoryId, companyId } });
    if (!category) {
      throw new ApiError("La categoría seleccionada no existe en esta empresa", 400, "CATEGORY_NOT_FOUND");
    }
  }
  if (serial?.trim()) {
    const duplicate = await prisma.product.findFirst({
      where: { companyId, serial: serial.trim() },
    });
    if (duplicate) {
      throw new ApiError(
        "Ya existe un producto con ese serial. Usa una entrada de inventario.",
        400,
        "PRODUCT_EXISTS",
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        companyId,
        name: name.trim(),
        serial: serial?.trim() || null,
        salePrice: salePrice ?? 0,
        brandId: brandId ?? null,
        categoryId: categoryId ?? null,
      },
      include: { brand: true, category: true },
    });

    const stock = await tx.warehouseInventory.create({
      data: { warehouseId, productId: product.id, quantity },
    });

    const movement = await tx.stockMovement.create({
      data: {
        companyId,
        userId,
        productId: product.id,
        type: "ENTRADA",
        quantity,
        destinationType: "WAREHOUSE",
        destinationId: warehouseId,
        referenceType: "ENTRY",
        description: "Entrada inicial por creación de producto",
      },
    });

    await auditLog(tx, {
      companyId,
      userId,
      action: "CREATE_PRODUCT",
      entity: "PRODUCT",
      entityId: product.id,
      details: { name: product.name, serial: product.serial, quantity },
    });

    return { product, stock, movement };
  });
}

// ---------------------------------------------------------------------------
// Importación de productos desde Excel
// ---------------------------------------------------------------------------

export interface InventoryImportRow {
  rowNumber: number;
  productName: string;
  brandName?: string | null;
  categoryName?: string | null;
  serial?: string | null;
  salePrice?: number | null;
  quantity: number;
  warehouseName?: string | null;
}

export interface InventoryImportResult {
  total: number;
  created: number;
  updated: number;
  quantityIn: number;
  errors: { row: number; message: string }[];
}

export async function importProductsAndStock(
  companyId: number,
  userId: number,
  rows: InventoryImportRow[],
): Promise<InventoryImportResult> {
  const result: InventoryImportResult = {
    total: rows.length,
    created: 0,
    updated: 0,
    quantityIn: 0,
    errors: [],
  };

  const [brands, categories, warehouses] = await Promise.all([
    prisma.brand.findMany({ where: { companyId } }),
    prisma.category.findMany({ where: { companyId } }),
    prisma.warehouse.findMany({ where: { companyId } }),
  ]);

  const brandByName = new Map(brands.map((b) => [b.name.toLowerCase(), b.id]));
  const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
  const warehouseByName = new Map(warehouses.map((w) => [w.name.toLowerCase(), w]));
  const defaultWarehouse = warehouses.find((w) => w.active) ?? warehouses[0];

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      try {
        const name = row.productName?.trim();
        if (!name) {
          result.errors.push({ row: row.rowNumber, message: "El nombre del producto es obligatorio" });
          continue;
        }
        const quantity = Math.floor(Number(row.quantity));
        if (!Number.isFinite(quantity) || quantity <= 0) {
          result.errors.push({ row: row.rowNumber, message: "La cantidad debe ser un número mayor a 0" });
          continue;
        }

        let brandId: number | null = null;
        if (row.brandName?.trim()) {
          const key = row.brandName.trim().toLowerCase();
          if (!brandByName.has(key)) {
            const created = await tx.brand.create({ data: { companyId, name: row.brandName.trim() } });
            brandByName.set(key, created.id);
          }
          brandId = brandByName.get(key)!;
        }

        let categoryId: number | null = null;
        if (row.categoryName?.trim()) {
          const key = row.categoryName.trim().toLowerCase();
          if (!categoryByName.has(key)) {
            const created = await tx.category.create({ data: { companyId, name: row.categoryName.trim() } });
            categoryByName.set(key, created.id);
          }
          categoryId = categoryByName.get(key)!;
        }

        let warehouse = defaultWarehouse;
        if (row.warehouseName?.trim()) {
          const matched = warehouseByName.get(row.warehouseName.trim().toLowerCase());
          if (!matched) {
            result.errors.push({
              row: row.rowNumber,
              message: `La bodega "${row.warehouseName}" no existe en esta empresa`,
            });
            continue;
          }
          warehouse = matched;
        }
        if (!warehouse) {
          result.errors.push({ row: row.rowNumber, message: "No hay bodegas disponibles" });
          continue;
        }

        const serial = row.serial?.trim() || null;
        const hasPrice = row.salePrice != null && Number.isFinite(Number(row.salePrice));
        const salePrice = hasPrice ? Number(row.salePrice) : null;

        let product = serial
          ? await tx.product.findFirst({ where: { companyId, serial } })
          : null;
        if (!product) {
          product = await tx.product.findFirst({ where: { companyId, name } });
        }

        if (!product) {
          product = await tx.product.create({
            data: { companyId, name, serial, salePrice: salePrice ?? 0, brandId, categoryId },
          });
          result.created += 1;
        } else {
          await tx.product.update({
            where: { id: product.id },
            data: {
              ...(row.brandName?.trim() ? { brandId } : {}),
              ...(row.categoryName?.trim() ? { categoryId } : {}),
              ...(salePrice != null ? { salePrice } : {}),
            },
          });
          result.updated += 1;
        }

        const stockRows = await tx.$queryRaw<{ id: number; quantity: number }[]>`
          SELECT id, quantity FROM warehouse_inventory
          WHERE warehouseId = ${warehouse.id} AND productId = ${product.id}
          LIMIT 1 FOR UPDATE
        `;
        const newQty = (stockRows[0]?.quantity ?? 0) + quantity;
        if (stockRows[0]) {
          await tx.warehouseInventory.update({
            where: { id: stockRows[0].id },
            data: { quantity: newQty },
          });
        } else {
          await tx.warehouseInventory.create({
            data: { warehouseId: warehouse.id, productId: product.id, quantity: newQty },
          });
        }

        await tx.stockMovement.create({
          data: {
            companyId,
            userId,
            productId: product.id,
            type: "ENTRADA",
            quantity,
            destinationType: "WAREHOUSE",
            destinationId: warehouse.id,
            referenceType: "ENTRY",
            description: "Importación desde Excel",
          },
        });

        result.quantityIn += quantity;
      } catch (error) {
        result.errors.push({
          row: row.rowNumber,
          message: error instanceof ApiError ? error.message : "Error procesando la fila",
        });
      }
    }

    await auditLog(tx, {
      companyId,
      userId,
      action: "IMPORT_INVENTORY",
      entity: "COMPANY",
      entityId: companyId,
      details: {
        total: result.total,
        created: result.created,
        updated: result.updated,
        quantityIn: result.quantityIn,
        errors: result.errors.length,
      },
    });
  });

  return result;
}

export async function listMovements(
  companyId: number,
  opts: { productId?: number; warehouseId?: number },
) {
  const where: Prisma.StockMovementWhereInput = {
    companyId,
    ...(opts.productId !== undefined ? { productId: opts.productId } : {}),
    ...(opts.warehouseId !== undefined
      ? {
          OR: [
            { originType: "WAREHOUSE", originId: opts.warehouseId },
            { destinationType: "WAREHOUSE", destinationId: opts.warehouseId },
          ],
        }
      : {}),
  };

  const asc = await prisma.stockMovement.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: {
      product: { select: { id: true, name: true, serial: true } },
      user: { select: { id: true, name: true } },
    },
  });

  let running = 0;
  const withBalance = asc.map((m) => {
    running += m.quantity;
    return { ...m, balance: running };
  });

  return withBalance.reverse();
}
