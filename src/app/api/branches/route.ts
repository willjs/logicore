import { withApi, ApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { serialize } from "@/lib/serialize";

export const GET = withApi(
  async ({ session }) => {
    const branches = await prisma.branch.findMany({
      where: { companyId: session.company.id },
      orderBy: { name: "asc" },
      include: { _count: { select: { warehouses: true } } },
    });
    return ok(serialize(branches));
  },
  { permissions: ["branches.view"] },
);

export const POST = withApi(
  async ({ json, session }) => {
    const data = (json ?? {}) as Record<string, unknown>;
    const name = typeof data.name === "string" ? data.name.trim() : "";
    const address = typeof data.address === "string" ? data.address.trim() || null : null;
    const phone = typeof data.phone === "string" ? data.phone.trim() || null : null;

    if (!name) {
      throw new ApiError("El nombre es requerido", 400, "VALIDATION_ERROR");
    }

    const existing = await prisma.branch.findFirst({
      where: { companyId: session.company.id, name },
    });
    if (existing) {
      throw new ApiError("Ya existe una sede con ese nombre", 400, "BRANCH_EXISTS");
    }

    const branch = await prisma.branch.create({
      data: {
        companyId: session.company.id,
        name,
        address,
        phone,
      },
    });

    return ok(serialize(branch), 201);
  },
  { permissions: ["branches.create"] },
);
