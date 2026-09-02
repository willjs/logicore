import { withApi, ok } from "@/lib/api";
import { getVendorStock } from "@/lib/services/vendor.service";
import { serialize } from "@/lib/serialize";

export const GET = withApi(
  async ({ session }) => {
    const stock = await getVendorStock(session.company.id, session.user.id);
    return ok(serialize(stock));
  },
  { permissions: ["sales.view"] },
);

export const runtime = "nodejs";