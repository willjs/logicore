import { NextRequest, NextResponse } from "next/server";

import { verifyToken } from "@/lib/jwt";
import { TOKEN_COOKIE } from "@/lib/constants";

const RATE_LIMIT = new Map<string, { count: number; resetAt: number }>();

function getRateLimitKey(req: NextRequest, path: string): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";
  return `${path}:${ip}`;
}

function checkRateLimit(key: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const entry = RATE_LIMIT.get(key);

  if (!entry || now > entry.resetAt) {
    RATE_LIMIT.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxAttempts) return false;

  entry.count++;
  return true;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const valid = token ? await verifyToken(token) : null;

  const isApi = pathname.startsWith("/api");
  const isLoginPage = pathname === "/login";
  const isPublicAuthRoute =
    pathname === "/api/auth/login" || pathname === "/api/auth/logout";

  if (pathname === "/api/auth/login" && request.method === "POST") {
    const key = getRateLimitKey(request, "login");
    if (!checkRateLimit(key, 5, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: { message: "Demasiados intentos. Intente de nuevo en 15 minutos.", code: "RATE_LIMITED" } },
        { status: 429 },
      );
    }
  }

  if (isApi && !isPublicAuthRoute) {
    if (!valid) {
      return NextResponse.json(
        { error: { message: "No autorizado", code: "UNAUTHORIZED" } },
        { status: 401 },
      );
    }
    return addSecurityHeaders(request, NextResponse.next());
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

  return addSecurityHeaders(request, NextResponse.next());
}

function addSecurityHeaders(_req: NextRequest, res: NextResponse): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("X-DNS-Prefetch-Control", "off");

  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
