import { withApi, ok } from "@/lib/api";
import { listVendorsWithStock } from "@/lib/services/vendor.service";
import { serialize } from "@/lib/serialize";

export const GET = withApi(
  async ({ session }) => {
    const vendors = await listVendorsWithStock(session.company.id);
    return ok(serialize(vendors));
  },
  { permissions: ["sales.view"] },
);

export const runtime = "nodejs";