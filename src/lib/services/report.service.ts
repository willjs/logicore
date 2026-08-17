import { prisma } from "../db";
import { ApiError } from "../api";

function num(value: unknown): number {
  return Number(value ?? 0);
}

export async function buildReport(companyId: number, from: Date, to: Date) {
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new ApiError("Rango de fechas inválido", 400, "VALIDATION_ERROR");
  }
  if (from > to) {
    throw new ApiError("La fecha inicial no puede ser posterior a la final", 400, "VALIDATION_ERROR");
  }
  const toExclusive = new Date(to);
  toExclusive.setDate(toExclusive.getDate() + 1);

  const [sales, openSales, rangePayments, daily, byStatus, byMethod] = await Promise.all([
    prisma.sale.findMany({
      where: { companyId, saleDate: { gte: from, lt: toExclusive } },
      select: {
        id: true,
        saleNumber: true,
        saleDate: true,
        total: true,
        status: true,
        customer: { select: { id: true, name: true, lastname: true } },
        items: { select: { quantity: true, lineTotal: true, product: { select: { id: true, name: true } } } },
      },
    }),
    prisma.sale.findMany({
      where: { companyId, status: { in: ["ABONO", "PENDIENTE"] } },
      select: {
        id: true,
        saleNumber: true,
        saleDate: true,
        total: true,
        status: true,
        customer: { select: { id: true, name: true, lastname: true } },
      },
      orderBy: { saleDate: "desc" },
    }),
    prisma.payment.findMany({
      where: { companyId, paymentDate: { gte: from, lt: toExclusive } },
      select: { amount: true, method: true },
    }),
    prisma.$queryRaw<{ day: Date; count: bigint; total: unknown }[]>`
      SELECT DATE(saleDate) AS day, COUNT(*) AS count, SUM(total) AS total
      FROM sales
      WHERE companyId = ${companyId} AND saleDate >= ${from} AND saleDate < ${toExclusive}
      GROUP BY DATE(saleDate)
      ORDER BY day ASC
    `,
    prisma.sale.groupBy({
      by: ["status"],
      where: { companyId, saleDate: { gte: from, lt: toExclusive } },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.payment.groupBy({
      by: ["method"],
      where: { companyId, paymentDate: { gte: from, lt: toExclusive } },
      _count: { _all: true },
      _sum: { amount: true },
    }),
  ]);

  const saleIds = sales.map((s) => s.id);
  const rangePaymentsBySale = await prisma.payment.groupBy({
    by: ["saleId"],
    where: { companyId, saleId: { in: saleIds } },
    _sum: { amount: true },
  });

  const totalSales = sales.reduce((acc, s) => acc + num(s.total), 0);
  const totalPaidRange = rangePayments.reduce((acc, p) => acc + num(p.amount), 0);

  const openPaymentBySale = await prisma.payment.groupBy({
    by: ["saleId"],
    where: { companyId, saleId: { in: openSales.map((s) => s.id) } },
    _sum: { amount: true },
  });
  const openPaid = new Map(openPaymentBySale.map((g) => [g.saleId, num(g._sum.amount)]));
  const cartera = openSales.map((s) => {
    const paid = openPaid.get(s.id) ?? 0;
    return {
      saleId: s.id,
      saleNumber: s.saleNumber,
      saleDate: s.saleDate,
      customerId: s.customer.id,
      customerName: `${s.customer.name}${s.customer.lastname ? ` ${s.customer.lastname}` : ""}`,
      total: num(s.total),
      paid,
      balance: num(s.total) - paid,
      status: s.status,
    };
  });
  const carteraTotal = cartera.reduce((acc, c) => acc + c.balance, 0);

  const productMap = new Map<number, { name: string; units: number; revenue: number }>();
  const customerMap = new Map<number, { name: string; count: number; revenue: number }>();
  for (const s of sales) {
    const c = customerMap.get(s.customer.id) ?? {
      name: `${s.customer.name}${s.customer.lastname ? ` ${s.customer.lastname}` : ""}`,
      count: 0,
      revenue: 0,
    };
    c.count += 1;
    c.revenue += num(s.total);
    customerMap.set(s.customer.id, c);

    for (const item of s.items) {
      const p = productMap.get(item.product.id) ?? { name: item.product.name, units: 0, revenue: 0 };
      p.units += item.quantity;
      p.revenue += num(item.lineTotal);
      productMap.set(item.product.id, p);
    }
  }

  const rangePaidBySale = new Map(rangePaymentsBySale.map((g) => [g.saleId, num(g._sum.amount)]));
  const topProducts = [...productMap.entries()]
    .map(([productId, v]) => ({ productId, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
  const topCustomers = [...customerMap.entries()]
    .map(([customerId, v]) => ({ customerId, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const rangeDetail = sales.map((s) => ({
    saleId: s.id,
    saleNumber: s.saleNumber,
    saleDate: s.saleDate,
    customerName: `${s.customer.name}${s.customer.lastname ? ` ${s.customer.lastname}` : ""}`,
    total: num(s.total),
    paid: rangePaidBySale.get(s.id) ?? 0,
    status: s.status,
  }));

  return {
    range: { from, to },
    summary: {
      salesCount: sales.length,
      totalSales,
      totalPaid: totalPaidRange,
      carteraTotal,
    },
    daily: daily.map((d) => ({
      day: d.day instanceof Date ? d.day.toISOString().slice(0, 10) : String(d.day).slice(0, 10),
      count: Number(d.count),
      total: num(d.total),
    })),
    byStatus: byStatus.map((s) => ({
      status: s.status,
      count: s._count._all,
      total: num(s._sum.total),
    })),
    byMethod: byMethod.map((m) => ({
      method: m.method,
      count: m._count._all,
      amount: num(m._sum.amount),
    })),
    topProducts,
    topCustomers,
    cartera,
    sales: rangeDetail,
  };
}
