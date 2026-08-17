import { withApi, ApiError, ok } from "@/lib/api";
import { customerCreateSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  createCustomer,
  listCustomersByCompany,
  searchCustomersByCompany,
} from "@/lib/services/customer.service";
import { serialize } from "@/lib/serialize";

export const GET = withApi(
  async ({ session, req }) => {
    const search = req.nextUrl.searchParams.get("search") ?? "";
    const customers = search.trim()
      ? await searchCustomersByCompany(session.company.id, search.trim())
      : await listCustomersByCompany(session.company.id);
    return ok(serialize(customers));
  },
  { permissions: ["customers.view"] },
);

export const POST = withApi(
  async ({ json, session }) => {
    const parsed = customerCreateSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    const customer = await createCustomer(session.company.id, parsed.data);

    await auditLog(prisma, {
      companyId: session.company.id,
      userId: session.user.id,
      action: "CREATE_CUSTOMER",
      entity: "CUSTOMER",
      entityId: customer.id,
      details: { name: customer.name, identification: customer.identification },
    });

    return ok(serialize(customer), 201);
  },
  { permissions: ["customers.create"] },
);
