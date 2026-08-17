import { cookies } from "next/headers";

import { COMPANY_COOKIE, TOKEN_COOKIE } from "@/lib/constants";
import { ok } from "@/lib/api";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_COOKIE);
  cookieStore.delete(COMPANY_COOKIE);
  return ok({ message: "Sesión cerrada" });
}
