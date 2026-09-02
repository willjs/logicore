import bcrypt from "bcryptjs";

import { withApi, ApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { userEditSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { updateUser } from "@/lib/services/user.service";
import { serialize } from "@/lib/serialize";

export const PATCH = withApi(
  async ({ json, session, params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError("El usuario no existe", 404, "USER_NOT_FOUND");
    }

    const parsed = userEditSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    if (parsed.data.email && parsed.data.email !== existing.email) {
      const duplicate = await prisma.user.findUnique({ where: { email: parsed.data.email } });
      if (duplicate) {
        throw new ApiError("Ya existe un usuario con ese correo", 400, "USER_EXISTS");
      }
    }

    const data: {
      name?: string;
      email?: string;
      passwordHash?: string;
      contractNumber?: string | null;
      country?: string | null;
      department?: string | null;
      municipality?: string | null;
    } = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.email !== undefined) data.email = parsed.data.email;
    if (parsed.data.password) data.passwordHash = bcrypt.hashSync(parsed.data.password, 10);
    if (parsed.data.contractNumber !== undefined) data.contractNumber = parsed.data.contractNumber;
    if (parsed.data.country !== undefined) data.country = parsed.data.country;
    if (parsed.data.department !== undefined) data.department = parsed.data.department;
    if (parsed.data.municipality !== undefined) data.municipality = parsed.data.municipality;

    const user = await updateUser(id, data);

    await auditLog(prisma, {
      companyId: session.company.id,
      userId: session.user.id,
      action: "UPDATE_USER",
      entity: "USER",
      entityId: id,
      details: { email: user.email },
    });

    return ok(
      serialize({
        id: user.id,
        name: user.name,
        email: user.email,
        active: user.active,
        createdAt: user.createdAt,
      }),
    );
  },
  { permissions: ["users.edit"] },
);
