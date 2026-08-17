import { NextRequest, NextResponse } from "next/server";

import { verifyToken } from "@/lib/jwt";
import { TOKEN_COOKIE } from "@/lib/constants";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const valid = token ? await verifyToken(token) : null;

  const isApi = pathname.startsWith("/api");
  const isLoginPage = pathname === "/login";
  const isPublicAuthRoute =
    pathname === "/api/auth/login" || pathname === "/api/auth/logout";

  if (isApi && !isPublicAuthRoute) {
    if (!valid) {
      return NextResponse.json(
        { error: { message: "No autorizado", code: "UNAUTHORIZED" } },
        { status: 401 },
      );
    }
    return NextResponse.next();
  }

  if (!isApi) {
    if (valid && isLoginPage) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (!valid && !isLoginPage) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
