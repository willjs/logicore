import { withApi, ApiError, ok } from "@/lib/api";
import { salePaymentSchema } from "@/lib/validations";
import { addSalePayment } from "@/lib/services/sale.service";
import { serialize } from "@/lib/serialize";

export const POST = withApi(
  async ({ json, session, params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }

    const parsed = salePaymentSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    const payment = await addSalePayment(id, session.company.id, session.user.id, {
      amount: parsed.data.amount,
      method: parsed.data.method,
      notes: parsed.data.notes ?? null,
    });

    return ok(serialize(payment), 201);
  },
  { permissions: ["payments.create"] },
);
