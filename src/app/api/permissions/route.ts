import { withApi, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { serialize } from "@/lib/serialize";

export const GET = withApi(
  async () => {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: "asc" }, { code: "asc" }],
    });
    return ok(serialize(permissions));
  },
  { permissions: ["roles.view"] },
);
