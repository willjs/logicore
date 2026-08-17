import { withSuperAdminApi, ApiError, ok } from "@/lib/api";
import { createCompanyWithDefaults, listCompanies } from "@/lib/services/company.service";
import { prisma } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import bcrypt from "bcryptjs";

export const GET = withSuperAdminApi(async () => {
  const companies = await listCompanies();
  const companiesWithCounts = await Promise.all(
    companies.map(async (company) => {
      const userCount = await prisma.userCompany.count({
        where: { companyId: company.id, active: true },
      });
      return { ...company, userCount };
    }),
  );
  return ok(serialize(companiesWithCounts));
});

export const POST = withSuperAdminApi(async ({ json, session }) => {
  const name = typeof json?.name === "string" ? json.name.trim() : "";
  if (!name) {
    throw new ApiError("El nombre de la empresa es requerido", 400, "VALIDATION_ERROR");
  }

  const company = await createCompanyWithDefaults({
    name,
    nit: typeof json?.nit === "string" && json.nit.trim() ? json.nit.trim() : null,
    address: typeof json?.address === "string" && json.address.trim() ? json.address.trim() : null,
    phone: typeof json?.phone === "string" && json.phone.trim() ? json.phone.trim() : null,
    email: typeof json?.email === "string" && json.email.trim() ? json.email.trim() : null,
  });

  return ok(serialize(company), 201);
});
