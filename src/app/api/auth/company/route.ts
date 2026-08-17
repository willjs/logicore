import { cookies } from "next/headers";

import { prisma } from "@/lib/db";
import { withApi, ApiError, fail, ok } from "@/lib/api";
import { COMPANY_COOKIE } from "@/lib/constants";
import { switchCompanySchema } from "@/lib/validations";
import { getSession } from "@/lib/auth";
import { serialize } from "@/lib/serialize";

export const POST = withApi(async ({ json, session }) => {
  const parsed = switchCompanySchema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError(
      parsed.error.issues[0]?.message ?? "Datos inválidos",
      400,
      "VALIDATION_ERROR",
    );
  }

  const membership = await prisma.userCompany.findUnique({
    where: {
      userId_companyId: {
        userId: session.user.id,
        companyId: parsed.data.companyId,
      },
    },
    include: { company: true, role: true },
  });

  if (!membership || !membership.active || !membership.company.active || !membership.role.active) {
    throw new ApiError(
      "No tiene acceso a esa empresa",
      403,
      "COMPANY_ACCESS_DENIED",
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(COMPANY_COOKIE, String(parsed.data.companyId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  const newSession = await getSession();
  if (!newSession) return fail("No autorizado", 401, "UNAUTHORIZED");

  return ok(serialize(newSession));
});
