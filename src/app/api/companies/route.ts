import { withApi, ApiError, getCompanyId, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { companySchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { createCompanyWithDefaults, listCompanies } from "@/lib/services/company.service";
import { serialize } from "@/lib/serialize";

export const GET = withApi(
  async () => {
    const companies = await listCompanies();
    return ok(serialize(companies));
  },
  { permissions: ["companies.view"] },
);

export const POST = withApi(
  async ({ json, session }) => {
    const parsed = companySchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    const company = await createCompanyWithDefaults(parsed.data);

    await auditLog(prisma, {
      companyId: getCompanyId(session),
      userId: session.user.id,
      action: "CREATE_COMPANY",
      entity: "COMPANY",
      entityId: company.id,
      details: { name: company.name },
    });

    return ok(serialize(company), 201);
  },
  { permissions: ["companies.create"] },
);
