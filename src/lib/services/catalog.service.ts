import { prisma } from "../db";
import { ApiError } from "../api";

// ---------------------------------------------------------------------------
// Marcas
// ---------------------------------------------------------------------------

export async function listBrandsByCompany(companyId: number) {
  return prisma.brand.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
}

export async function createBrand(companyId: number, name: string) {
  const existing = await prisma.brand.findUnique({
    where: { companyId_name: { companyId, name } },
  });
  if (existing) {
    throw new ApiError("Ya existe una marca con ese nombre", 400, "BRAND_EXISTS");
  }
  return prisma.brand.create({ data: { name, companyId } });
}

export async function updateBrand(id: number, companyId: number, name?: string) {
  const existing = await prisma.brand.findFirst({ where: { id, companyId } });
  if (!existing) {
    throw new ApiError("La marca no existe", 404, "BRAND_NOT_FOUND");
  }
  if (name && name !== existing.name) {
    const duplicate = await prisma.brand.findUnique({
      where: { companyId_name: { companyId, name } },
    });
    if (duplicate) {
      throw new ApiError("Ya existe una marca con ese nombre", 400, "BRAND_EXISTS");
    }
  }
  return prisma.brand.update({ where: { id }, data: { ...(name !== undefined && { name }) } });
}

export async function toggleBrand(id: number, companyId: number, active: boolean) {
  const existing = await prisma.brand.findFirst({ where: { id, companyId } });
  if (!existing) {
    throw new ApiError("La marca no existe", 404, "BRAND_NOT_FOUND");
  }
  return prisma.brand.update({ where: { id }, data: { active } });
}

// ---------------------------------------------------------------------------
// Categorías
// ---------------------------------------------------------------------------

export async function listCategoriesByCompany(companyId: number) {
  return prisma.category.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
}

export async function createCategory(companyId: number, name: string) {
  const existing = await prisma.category.findUnique({
    where: { companyId_name: { companyId, name } },
  });
  if (existing) {
    throw new ApiError("Ya existe una categoría con ese nombre", 400, "CATEGORY_EXISTS");
  }
  return prisma.category.create({ data: { name, companyId } });
}

export async function updateCategory(id: number, companyId: number, name?: string) {
  const existing = await prisma.category.findFirst({ where: { id, companyId } });
  if (!existing) {
    throw new ApiError("La categoría no existe", 404, "CATEGORY_NOT_FOUND");
  }
  if (name && name !== existing.name) {
    const duplicate = await prisma.category.findUnique({
      where: { companyId_name: { companyId, name } },
    });
    if (duplicate) {
      throw new ApiError("Ya existe una categoría con ese nombre", 400, "CATEGORY_EXISTS");
    }
  }
  return prisma.category.update({ where: { id }, data: { ...(name !== undefined && { name }) } });
}

export async function toggleCategory(id: number, companyId: number, active: boolean) {
  const existing = await prisma.category.findFirst({ where: { id, companyId } });
  if (!existing) {
    throw new ApiError("La categoría no existe", 404, "CATEGORY_NOT_FOUND");
  }
  return prisma.category.update({ where: { id }, data: { active } });
}

// ---------------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------------

export interface ProductData {
  name: string;
  serial?: string | null;
  description?: string | null;
  salePrice?: number;
  brandId?: number | null;
  categoryId?: number | null;
}

async function validateBrandAndCategory(
  companyId: number,
  brandId?: number | null,
  categoryId?: number | null,
) {
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
}

export async function listProductsByCompany(companyId: number) {
  return prisma.product.findMany({
    where: { companyId },
    include: { brand: true, category: true },
    orderBy: { name: "asc" },
  });
}

export async function createProduct(companyId: number, data: ProductData) {
  await validateBrandAndCategory(companyId, data.brandId, data.categoryId);
  return prisma.product.create({
    data: {
      name: data.name,
      serial: data.serial ?? null,
      description: data.description ?? null,
      salePrice: data.salePrice ?? 0,
      brandId: data.brandId ?? null,
      categoryId: data.categoryId ?? null,
      companyId,
    },
    include: { brand: true, category: true },
  });
}

export async function updateProduct(id: number, companyId: number, data: Partial<ProductData>) {
  const existing = await prisma.product.findFirst({ where: { id, companyId } });
  if (!existing) {
    throw new ApiError("El producto no existe", 404, "PRODUCT_NOT_FOUND");
  }

  if (data.brandId !== undefined || data.categoryId !== undefined) {
    await validateBrandAndCategory(companyId, data.brandId, data.categoryId);
  }

  return prisma.product.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.serial !== undefined && { serial: data.serial ?? null }),
      ...(data.description !== undefined && { description: data.description ?? null }),
      ...(data.salePrice !== undefined && { salePrice: data.salePrice }),
      ...(data.brandId !== undefined && { brandId: data.brandId }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
    },
    include: { brand: true, category: true },
  });
}

export async function toggleProduct(id: number, companyId: number, active: boolean) {
  const existing = await prisma.product.findFirst({ where: { id, companyId } });
  if (!existing) {
    throw new ApiError("El producto no existe", 404, "PRODUCT_NOT_FOUND");
  }
  return prisma.product.update({ where: { id }, data: { active } });
}
