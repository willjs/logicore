import { withApi, ApiError, ok } from "@/lib/api";
import { customerEditSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { getCustomerDetail, updateCustomer } from "@/lib/services/customer.service";
import { serialize } from "@/lib/serialize";

export const GET = withApi(
  async ({ session, params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }

    const detail = await getCustomerDetail(session.company.id, id);
    return ok(serialize(detail));
  },
  { permissions: ["customers.view"] },
);

export const PATCH = withApi(
  async ({ json, session, params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }

    const parsed = customerEditSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    const customer = await updateCustomer(id, session.company.id, parsed.data);

    await auditLog(prisma, {
      companyId: session.company.id,
      userId: session.user.id,
      action: "UPDATE_CUSTOMER",
      entity: "CUSTOMER",
      entityId: id,
      details: { name: customer.name },
    });

    return ok(serialize(customer));
  },
  { permissions: ["customers.edit"] },
);
