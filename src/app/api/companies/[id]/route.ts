import { withApi, ApiError, getCompanyId, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { companySchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { updateCompany } from "@/lib/services/company.service";
import { serialize } from "@/lib/serialize";

export const PATCH = withApi(
  async ({ json, session, params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }

    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError("La empresa no existe", 404, "COMPANY_NOT_FOUND");
    }

    const parsed = companySchema.partial().safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    const company = await updateCompany(id, parsed.data);

    await auditLog(prisma, {
      companyId: getCompanyId(session),
      userId: session.user.id,
      action: "UPDATE_COMPANY",
      entity: "COMPANY",
      entityId: id,
      details: { name: company.name },
    });

    return ok(serialize(company));
  },
  { permissions: ["companies.edit"] },
);
