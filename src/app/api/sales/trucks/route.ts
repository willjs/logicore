import { withApi, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { serialize } from "@/lib/serialize";

export const GET = withApi(
  async ({ session }) => {
    const trucks = await prisma.truck.findMany({
      where: { companyId: session.company.id, active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        plate: true,
        driver: { select: { id: true, name: true } },
        inventory: {
          where: { quantity: { gt: 0 } },
          select: {
            id: true,
            quantity: true,
            product: {
              select: {
                id: true,
                name: true,
                serial: true,
                salePrice: true,
              },
            },
          },
          orderBy: { product: { name: "asc" } },
        },
      },
    });
    return ok(serialize(trucks));
  },
  { permissions: ["sales.view"] },
);
