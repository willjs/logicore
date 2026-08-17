import { withApi, ApiError, ok } from "@/lib/api";
import { roleSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { createRole, listRolesByCompany } from "@/lib/services/role.service";
import { serialize } from "@/lib/serialize";

export const GET = withApi(
  async ({ session }) => {
    const roles = await listRolesByCompany(session.company.id);
    return ok(
      serialize(
        roles.map((role) => ({
          id: role.id,
          name: role.name,
          description: role.description,
          active: role.active,
          permissionCodes: role.permissions.map((rp) => rp.permission.code),
        })),
      ),
    );
  },
  { permissions: ["roles.view"] },
);

export const POST = withApi(
  async ({ json, session }) => {
    const parsed = roleSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    const role = await createRole(session.company.id, parsed.data);

    await auditLog(prisma, {
      companyId: session.company.id,
      userId: session.user.id,
      action: "CREATE_ROLE",
      entity: "ROLE",
      entityId: role.id,
      details: { name: role.name },
    });

    return ok(serialize(role), 201);
  },
  { permissions: ["roles.create"] },
);
