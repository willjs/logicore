import { withApi, ApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { removeUserCompany } from "@/lib/services/user.service";
import { serialize } from "@/lib/serialize";

export const DELETE = withApi(
  async ({ session, params }) => {
    const userId = Number(params.id);
    const companyId = Number(params.companyId);
    if (!Number.isInteger(userId) || !Number.isInteger(companyId)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }

    const assignment = await removeUserCompany(userId, companyId);

    await auditLog(prisma, {
      companyId: session.company.id,
      userId: session.user.id,
      action: "REMOVE_USER_COMPANY",
      entity: "USER",
      entityId: userId,
      details: { companyId },
    });

    return ok(serialize(assignment));
  },
  { permissions: ["users.edit"] },
);
