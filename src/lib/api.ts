import { NextRequest, NextResponse } from "next/server";

import { getSession, getSuperAdminSession, type Session, type SuperAdminSession } from "../lib/auth";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "BAD_REQUEST") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function fail(message: string, status = 400, code = "BAD_REQUEST") {
  return NextResponse.json({ error: { message, code } }, { status });
}

export interface ApiContext {
  req: NextRequest;
  session: Session;
  json: Record<string, unknown> | undefined;
  params: Record<string, string>;
}

export interface SuperAdminApiContext {
  req: NextRequest;
  session: SuperAdminSession;
  json: Record<string, unknown> | undefined;
  params: Record<string, string>;
}

type ApiHandler = (
  ctx: ApiContext,
) => Promise<Response | void> | Response | void;

type SuperAdminApiHandler = (
  ctx: SuperAdminApiContext,
) => Promise<Response | void> | Response | void;

interface WithApiOptions {
  permissions?: string[];
  auth?: boolean;
}

export function withApi(handler: ApiHandler, options: WithApiOptions = {}) {
  const { permissions = [], auth = true } = options;

  return async (
    req: NextRequest,
    routeContext?: { params: Promise<Record<string, string>> },
  ): Promise<Response> => {
    try {
      let session: Session | null = null;
      if (auth) {
        session = await getSession();
        if (!session) {
          return fail("No autorizado", 401, "UNAUTHORIZED");
        }
        for (const code of permissions) {
          if (!session.permissions.includes(code)) {
            return fail("No tiene permisos para realizar esta operación", 403, "FORBIDDEN");
          }
        }
      }

      let json: Record<string, unknown> | undefined;
      const method = req.method.toUpperCase();
      if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        const contentType = req.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          try {
            const body = await req.json();
            json = body && typeof body === "object" ? body : {};
          } catch {
            json = {};
          }
        }
      }

      const params = routeContext ? await routeContext.params : {};

      const result = await handler({ req, session: session as Session, json, params });
      return result ?? fail("Sin respuesta", 500, "NO_RESPONSE");
    } catch (error) {
      if (error instanceof ApiError) {
        return fail(error.message, error.status, error.code);
      }
      console.error("[API ERROR]", error);
      return fail("Error interno del servidor", 500, "INTERNAL_ERROR");
    }
  };
}

export function withSuperAdminApi(handler: SuperAdminApiHandler) {
  return async (
    req: NextRequest,
    routeContext?: { params: Promise<Record<string, string>> },
  ): Promise<Response> => {
    try {
      const session = await getSuperAdminSession();
      if (!session) {
        return fail("No autorizado", 401, "UNAUTHORIZED");
      }

      let json: Record<string, unknown> | undefined;
      const method = req.method.toUpperCase();
      if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        const contentType = req.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          try {
            const body = await req.json();
            json = body && typeof body === "object" ? body : {};
          } catch {
            json = {};
          }
        }
      }

      const params = routeContext ? await routeContext.params : {};

      const result = await handler({ req, session, json, params });
      return result ?? fail("Sin respuesta", 500, "NO_RESPONSE");
    } catch (error) {
      if (error instanceof ApiError) {
        return fail(error.message, error.status, error.code);
      }
      console.error("[API ERROR]", error);
      return fail("Error interno del servidor", 500, "INTERNAL_ERROR");
    }
  };
}

export function getCompanyId(session: Session): number {
  return session.company.id;
}
