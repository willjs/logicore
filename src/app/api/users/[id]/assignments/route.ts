import { withApi, ApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { userAssignmentSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { assignUserCompany } from "@/lib/services/user.service";
import { serialize } from "@/lib/serialize";

export const GET = withApi(
  async ({ params }) => {
    const userId = Number(params.id);
    if (!Number.isInteger(userId)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ApiError("El usuario no existe", 404, "USER_NOT_FOUND");
    }

    const assignments = await prisma.userCompany.findMany({
      where: { userId },
      include: { company: true, role: true },
      orderBy: { company: { name: "asc" } },
    });

    return ok(
      serialize(
        assignments.map((a) => ({
          companyId: a.companyId,
          companyName: a.company.name,
          companyActive: a.company.active,
          roleId: a.roleId,
          roleName: a.role.name,
          active: a.active,
        })),
      ),
    );
  },
  { permissions: ["users.view"] },
);

export const POST = withApi(
  async ({ json, session, params }) => {
    const userId = Number(params.id);
    if (!Number.isInteger(userId)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }

    const parsed = userAssignmentSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    const assignment = await assignUserCompany(userId, parsed.data);

    await auditLog(prisma, {
      companyId: session.company.id,
      userId: session.user.id,
      action: "ASSIGN_USER_COMPANY",
      entity: "USER",
      entityId: userId,
      details: { companyId: parsed.data.companyId, roleId: parsed.data.roleId },
    });

    return ok(serialize(assignment), 201);
  },
  { permissions: ["users.edit"] },
);
