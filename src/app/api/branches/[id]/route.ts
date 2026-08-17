import { withApi, ApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { serialize } from "@/lib/serialize";

export const PATCH = withApi(
  async ({ params, json, session }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      throw new ApiError("ID inválido", 400, "VALIDATION_ERROR");
    }

    const existing = await prisma.branch.findFirst({
      where: { id, companyId: session.company.id },
    });
    if (!existing) {
      throw new ApiError("Sede no encontrada", 404, "NOT_FOUND");
    }

    const data = (json ?? {}) as Record<string, unknown>;
    const name = typeof data.name === "string" ? data.name.trim() : undefined;
    const address = typeof data.address === "string" ? data.address.trim() || null : undefined;
    const phone = typeof data.phone === "string" ? data.phone.trim() || null : undefined;
    const active = typeof data.active === "boolean" ? data.active : undefined;

    if (name !== undefined && name !== existing.name) {
      const duplicate = await prisma.branch.findFirst({
        where: { companyId: session.company.id, name },
      });
      if (duplicate) {
        throw new ApiError("Ya existe una sede con ese nombre", 400, "BRANCH_EXISTS");
      }
    }

    const updated = await prisma.branch.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(active !== undefined && { active }),
      },
    });

    return ok(serialize(updated));
  },
  { permissions: ["branches.edit"] },
);
