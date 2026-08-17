import { withApi, ok } from "@/lib/api";
import { buildReport } from "@/lib/services/report.service";
import { serialize } from "@/lib/serialize";

export const GET = withApi(
  async ({ req, session }) => {
    const rawFrom = req.nextUrl.searchParams.get("from");
    const rawTo = req.nextUrl.searchParams.get("to");
    const from = rawFrom ? new Date(`${rawFrom}T00:00:00`) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = rawTo ? new Date(`${rawTo}T23:59:59.999`) : new Date();

    const report = await buildReport(session.company.id, from, to);
    return ok(serialize(report));
  },
  { permissions: ["reports.view"] },
);
