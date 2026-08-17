import { prisma } from "../db";
import { ApiError } from "../api";

export interface CustomerData {
  name: string;
  lastname?: string | null;
  identificationType?: string;
  identification: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

async function enrichCustomers(
  companyId: number,
  customers: { id: number }[],
) {
  if (customers.length === 0) return customers;

  const attachments = await prisma.attachment.findMany({
    where: {
      companyId,
      entityType: "CUSTOMER",
      entityId: { in: customers.map((customer) => customer.id) },
    },
  });

  const photoByCustomer = new Map(
    attachments
      .filter((attachment) => attachment.kind === "FOTO")
      .map((attachment) => [attachment.entityId, attachment.path]),
  );

  const documentsCount = new Map<number, number>();
  for (const attachment of attachments) {
    if (attachment.kind === "DOCUMENTO") {
      documentsCount.set(
        attachment.entityId,
        (documentsCount.get(attachment.entityId) ?? 0) + 1,
      );
    }
  }

  return customers.map((customer) => ({
    ...customer,
    photoUrl: photoByCustomer.has(customer.id)
      ? `/api/customers/${customer.id}/photo`
      : null,
    documentsCount: documentsCount.get(customer.id) ?? 0,
  }));
}

export async function listCustomersByCompany(companyId: number) {
  const customers = await prisma.customer.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
  return enrichCustomers(companyId, customers);
}

export async function searchCustomersByCompany(companyId: number, search: string) {
  const q = search.trim();
  const customers = await prisma.customer.findMany({
    where: {
      companyId,
      OR: [
        { name: { contains: q } },
        { lastname: { contains: q } },
        { identification: { contains: q } },
        { phone: { contains: q } },
      ],
    },
    orderBy: { name: "asc" },
    take: 25,
  });
  return enrichCustomers(companyId, customers);
}

export async function getCustomerDetail(companyId: number, customerId: number) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId },
  });
  if (!customer) {
    throw new ApiError("El cliente no existe", 404, "CUSTOMER_NOT_FOUND");
  }

  const sales = await prisma.sale.findMany({
    where: { companyId, customerId },
    orderBy: { id: "desc" },
    take: 30,
    select: {
      id: true,
      saleNumber: true,
      saleDate: true,
      total: true,
      status: true,
      truck: { select: { id: true, name: true } },
    },
  });

  const paymentAgg = await prisma.payment.groupBy({
    by: ["saleId"],
    where: { companyId, customerId },
    _sum: { amount: true },
  });
  const paidBySale = new Map(
    paymentAgg.map((payment) => [payment.saleId, Number(payment._sum.amount ?? 0)]),
  );

  const cartera = sales.map((sale) => {
    const paid = paidBySale.get(sale.id) ?? 0;
    const balance = Math.max(0, Number((Number(sale.total) - paid).toFixed(2)));
    return {
      id: sale.id,
      saleNumber: sale.saleNumber,
      saleDate: sale.saleDate,
      total: Number(sale.total),
      status: sale.status,
      paid,
      balance,
      truck: sale.truck,
    };
  });
  const pendingBalance = Number(
    cartera.reduce((acc, sale) => acc + sale.balance, 0).toFixed(2),
  );

  const [enriched] = await enrichCustomers(companyId, [customer]);

  return { customer: enriched, pendingBalance, cartera };
}

export async function createCustomer(companyId: number, data: CustomerData) {
  const existing = await prisma.customer.findUnique({
    where: { companyId_identification: { companyId, identification: data.identification } },
  });
  if (existing) {
    throw new ApiError("Ya existe un cliente con ese documento", 400, "CUSTOMER_EXISTS");
  }
  return prisma.customer.create({
    data: {
      name: data.name,
      lastname: data.lastname ?? null,
      identificationType: data.identificationType ?? "CC",
      identification: data.identification,
      address: data.address ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      companyId,
    },
  });
}

export async function updateCustomer(
  id: number,
  companyId: number,
  data: Partial<CustomerData>,
) {
  const existing = await prisma.customer.findFirst({ where: { id, companyId } });
  if (!existing) {
    throw new ApiError("El cliente no existe", 404, "CUSTOMER_NOT_FOUND");
  }

  if (data.identification && data.identification !== existing.identification) {
    const duplicate = await prisma.customer.findUnique({
      where: { companyId_identification: { companyId, identification: data.identification } },
    });
    if (duplicate) {
      throw new ApiError("Ya existe un cliente con ese documento", 400, "CUSTOMER_EXISTS");
    }
  }

  return prisma.customer.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.lastname !== undefined && { lastname: data.lastname ?? null }),
      ...(data.identificationType !== undefined && { identificationType: data.identificationType }),
      ...(data.identification !== undefined && { identification: data.identification }),
      ...(data.address !== undefined && { address: data.address ?? null }),
      ...(data.phone !== undefined && { phone: data.phone ?? null }),
      ...(data.email !== undefined && { email: data.email ?? null }),
    },
  });
}

export async function toggleCustomer(id: number, companyId: number, active: boolean) {
  const existing = await prisma.customer.findFirst({ where: { id, companyId } });
  if (!existing) {
    throw new ApiError("El cliente no existe", 404, "CUSTOMER_NOT_FOUND");
  }
  return prisma.customer.update({ where: { id }, data: { active } });
}
