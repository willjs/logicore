import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import { signToken } from "@/lib/jwt";
import { COMPANY_COOKIE, TOKEN_COOKIE } from "@/lib/constants";
import { loginSchema } from "@/lib/validations";
import { fail, ok } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { serialize } from "@/lib/serialize";

const SESSION_MAX_AGE = 60 * 60 * 12;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      return fail("Credenciales inválidas", 401, "INVALID_CREDENTIALS");
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return fail("Credenciales inválidas", 401, "INVALID_CREDENTIALS");
    }

    const token = await signToken({
      sub: String(user.id),
      email: user.email,
      name: user.name,
    });

    const cookieStore = await cookies();
    cookieStore.set(TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    if (user.superadmin) {
      return ok(
        serialize({
          user: { id: user.id, name: user.name, email: user.email, superadmin: true },
          companies: [],
          activeCompanyId: null,
        }),
      );
    }

    const memberships = await prisma.userCompany.findMany({
      where: { userId: user.id, active: true },
      include: { company: true, role: true },
    });
    const activeCompanies = memberships.filter(
      (m) => m.company.active && m.role.active,
    );
    if (activeCompanies.length === 0) {
      return fail(
        "El usuario no tiene empresas activas asignadas",
        403,
        "NO_ACTIVE_COMPANY",
      );
    }

    const firstCompany = activeCompanies[0];
    cookieStore.set(COMPANY_COOKIE, String(firstCompany.companyId), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    await auditLog(prisma, {
      companyId: firstCompany.companyId,
      userId: user.id,
      action: "LOGIN",
      entity: "USER",
      entityId: user.id,
      details: { email: user.email },
    });

    return ok(
      serialize({
        user: { id: user.id, name: user.name, email: user.email },
        companies: activeCompanies.map((c) => ({
          id: c.companyId,
          name: c.company.name,
        })),
        activeCompanyId: firstCompany.companyId,
      }),
    );
  } catch (error) {
    console.error("[LOGIN]", error);
    return NextResponse.json(
      { error: { message: "Error interno del servidor", code: "INTERNAL_ERROR" } },
      { status: 500 },
    );
  }
}
