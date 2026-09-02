import { withApi, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { listVendorsWithStock, listVendorAssignments } from "@/lib/services/vendor.service";
import { serialize } from "@/lib/serialize";

export const GET = withApi(
  async ({ session }) => {
    const truck = await prisma.truck.findFirst({
      where: { companyId: session.company.id, driverId: session.user.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        plate: true,
        inventory: {
          where: { quantity: { gt: 0 } },
          select: {
            id: true,
            quantity: true,
            product: {
              select: { id: true, name: true, serial: true, salePrice: true },
            },
          },
          orderBy: { product: { name: "asc" } },
        },
      },
    });

    if (!truck) {
      return ok(serialize({ truck: null, inventory: [], vendors: [], assignments: [] }));
    }

    const [vendors, assignments] = await Promise.all([
      listVendorsWithStock(session.company.id),
      listVendorAssignments(session.company.id, { truckId: truck.id }),
    ]);

    return ok(
      serialize({
        truck: { id: truck.id, name: truck.name, plate: truck.plate },
        inventory: truck.inventory,
        vendors,
        assignments,
      }),
    );
  },
  { permissions: ["trucks.view"] },
);

export const runtime = "nodejs";