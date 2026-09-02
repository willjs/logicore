import { withApi, ApiError, ok } from "@/lib/api";
import { saleCreateSchema } from "@/lib/validations";
import { createSale, listSalesByCompany } from "@/lib/services/sale.service";
import { serialize } from "@/lib/serialize";

export const GET = withApi(
  async ({ session, req }) => {
    const status = req.nextUrl.searchParams.get("status") ?? undefined;
    const search = req.nextUrl.searchParams.get("search") ?? undefined;
    const rawCustomerId = req.nextUrl.searchParams.get("customerId");
    const customerId = rawCustomerId ? Number(rawCustomerId) : undefined;

    const sales = await listSalesByCompany(session.company.id, {
      status,
      search: search || undefined,
      customerId: Number.isInteger(customerId) ? customerId : undefined,
      userId: /vendedor/i.test(session.role.name) ? session.user.id : undefined,
    });
    return ok(serialize(sales));
  },
  { permissions: ["sales.view"] },
);

export const POST = withApi(
  async ({ json, session }) => {
    const parsed = saleCreateSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    const sale = await createSale({
      companyId: session.company.id,
      userId: session.user.id,
      customerId: parsed.data.customerId,
      truckId: parsed.data.truckId ?? null,
      paymentMethod: parsed.data.paymentMethod ?? null,
      amountReceived: parsed.data.amountReceived,
      notes: parsed.data.notes ?? null,
      items: parsed.data.items,
      source: parsed.data.source ?? null,
    });

    return ok(serialize(sale), 201);
  },
  { permissions: ["sales.create"] },
);
