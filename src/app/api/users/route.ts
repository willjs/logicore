import { withApi, ApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { userCreateSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { createUser, listUsersByCompany } from "@/lib/services/user.service";
import { serialize } from "@/lib/serialize";
import bcrypt from "bcryptjs";

export const GET = withApi(
  async ({ session }) => {
    const users = await listUsersByCompany(session.company.id);
    return ok(serialize(users));
  },
  { permissions: ["users.view"] },
);

export const POST = withApi(
  async ({ json, session }) => {
    const parsed = userCreateSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
      throw new ApiError("Ya existe un usuario con ese correo", 400, "USER_EXISTS");
    }

    const passwordHash = bcrypt.hashSync(parsed.data.password, 10);
    const user = await createUser({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      contractNumber: parsed.data.contractNumber,
      country: parsed.data.country,
      department: parsed.data.department,
      municipality: parsed.data.municipality,
      assignments: parsed.data.assignments,
    });

    await auditLog(prisma, {
      companyId: session.company.id,
      userId: session.user.id,
      action: "CREATE_USER",
      entity: "USER",
      entityId: user.id,
      details: { email: user.email, name: user.name },
    });

    return ok(
      serialize({
        id: user.id,
        name: user.name,
        email: user.email,
        active: user.active,
        createdAt: user.createdAt,
      }),
      201,
    );
  },
  { permissions: ["users.create"] },
);
