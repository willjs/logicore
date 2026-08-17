import { withApi, ApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { serialize } from "@/lib/serialize";

export const GET = withApi(
  async ({ params }) => {
    const companyId = Number(params.id);
    if (!Number.isInteger(companyId)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new ApiError("La empresa no existe", 404, "COMPANY_NOT_FOUND");
    }

    const roles = await prisma.role.findMany({
      where: { companyId, active: true },
      select: { id: true, name: true, description: true },
      orderBy: { name: "asc" },
    });

    return ok(serialize(roles));
  },
  { permissions: ["roles.view"] },
);
