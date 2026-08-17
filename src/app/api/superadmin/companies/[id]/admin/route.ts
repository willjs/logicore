import { withSuperAdminApi, ApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import bcrypt from "bcryptjs";

export const POST = withSuperAdminApi(async ({ json, params }) => {
  const companyId = Number(params.id);
  if (!Number.isInteger(companyId) || companyId <= 0) {
    throw new ApiError("Identificador de empresa inválido", 400, "INVALID_ID");
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    throw new ApiError("La empresa no existe", 404, "COMPANY_NOT_FOUND");
  }

  const name = typeof json?.name === "string" ? json.name.trim() : "";
  const email = typeof json?.email === "string" ? json.email.trim() : "";
  const password = typeof json?.password === "string" ? json.password : "";

  if (!name) {
    throw new ApiError("El nombre del usuario es requerido", 400, "VALIDATION_ERROR");
  }
  if (!email) {
    throw new ApiError("El email es requerido", 400, "VALIDATION_ERROR");
  }
  if (!password || password.length < 6) {
    throw new ApiError("La contraseña debe tener al menos 6 caracteres", 400, "VALIDATION_ERROR");
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new ApiError("Ya existe un usuario con ese email", 400, "EMAIL_EXISTS");
  }

  const adminRole = await prisma.role.findFirst({
    where: { companyId, name: "ADMIN" },
  });
  if (!adminRole) {
    throw new ApiError("No se encontró el rol ADMIN en esta empresa", 500, "ROLE_NOT_FOUND");
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: bcrypt.hashSync(password, 10),
    },
  });

  await prisma.userCompany.create({
    data: {
      userId: user.id,
      companyId,
      roleId: adminRole.id,
    },
  });

  return ok(serialize({ id: user.id, name: user.name, email: user.email }), 201);
});
