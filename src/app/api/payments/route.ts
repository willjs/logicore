import { withApi, ApiError, ok } from "@/lib/api";
import { customerPaymentSchema } from "@/lib/validations";
import { addCustomerPayment } from "@/lib/services/sale.service";
import { serialize } from "@/lib/serialize";

export const POST = withApi(
  async ({ json, session }) => {
    const parsed = customerPaymentSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    const result = await addCustomerPayment(session.company.id, session.user.id, {
      customerId: parsed.data.customerId,
      amount: parsed.data.amount,
      method: parsed.data.method,
      received: parsed.data.received,
      change: parsed.data.change,
      notes: parsed.data.notes ?? null,
    });

    return ok(serialize(result), 201);
  },
  { permissions: ["payments.create"] },
);
