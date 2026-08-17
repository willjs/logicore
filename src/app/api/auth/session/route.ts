import { withApi, ok } from "@/lib/api";
import { serialize } from "@/lib/serialize";

export const GET = withApi(({ session }) => {
  return ok(serialize(session));
});
