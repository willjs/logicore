import { withApi, ApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { roleSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { updateRole } from "@/lib/services/role.service";
import { serialize } from "@/lib/serialize";

export const GET = withApi(
  async ({ session, params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }

    const role = await prisma.role.findFirst({
      where: { id, companyId: session.company.id },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) {
      throw new ApiError("El rol no existe", 404, "ROLE_NOT_FOUND");
    }

    return ok(
      serialize({
        id: role.id,
        name: role.name,
        description: role.description,
        active: role.active,
        permissionCodes: role.permissions.map((p) => p.permission.code),
      }),
    );
  },
  { permissions: ["roles.view"] },
);

export const PATCH = withApi(
  async ({ json, session, params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }

    const parsed = roleSchema.partial().safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    const role = await updateRole(session.company.id, id, parsed.data);

    await auditLog(prisma, {
      companyId: session.company.id,
      userId: session.user.id,
      action: "UPDATE_ROLE",
      entity: "ROLE",
      entityId: id,
      details: { name: role.name },
    });

    return ok(serialize(role));
  },
  { permissions: ["roles.edit", "roles.assign"] },
);
