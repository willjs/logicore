import { withApi, ApiError, ok } from "@/lib/api";
import { getSale } from "@/lib/services/sale.service";
import { serialize } from "@/lib/serialize";

export const GET = withApi(
  async ({ session, params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }

    const sale = await getSale(id, session.company.id);
    return ok(serialize(sale));
  },
  { permissions: ["sales.view"] },
);
