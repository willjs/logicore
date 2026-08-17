import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "../lib/db";
import { verifyToken } from "../lib/jwt";
import { COMPANY_COOKIE, TOKEN_COOKIE } from "../lib/constants";

export interface SessionUser {
  id: number;
  name: string;
  email: string;
}

export interface Session {
  user: SessionUser;
  company: { id: number; name: string; logo: string | null };
  role: { id: number; name: string };
  permissions: string[];
}

export interface SuperAdminSession {
  user: SessionUser;
  superadmin: true;
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  const companyRaw = cookieStore.get(COMPANY_COOKIE)?.value;
  if (!token || !companyRaw) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const userId = Number(payload.sub);
  const companyId = Number(companyRaw);
  if (!Number.isInteger(userId) || !Number.isInteger(companyId)) return null;

  const uc = await prisma.userCompany.findUnique({
    where: { userId_companyId: { userId, companyId } },
    include: {
      user: true,
      company: true,
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });

  if (!uc || !uc.active || !uc.user.active || !uc.company.active || !uc.role.active) {
    return null;
  }

  return {
    user: { id: uc.user.id, name: uc.user.name, email: uc.user.email },
    company: { id: uc.company.id, name: uc.company.name, logo: uc.company.logo },
    role: { id: uc.role.id, name: uc.role.name },
    permissions: uc.role.permissions.map((rp) => rp.permission.code),
  };
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export function hasPermission(session: Session, code: string): boolean {
  return session.permissions.includes(code);
}

export async function requirePermission(code: string): Promise<Session> {
  const session = await requireSession();
  if (!hasPermission(session, code)) redirect("/dashboard");
  return session;
}

export async function getSuperAdminSession(): Promise<SuperAdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const userId = Number(payload.sub);
  if (!Number.isInteger(userId)) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.active || !user.superadmin) return null;

  return { user: { id: user.id, name: user.name, email: user.email }, superadmin: true };
}

export async function requireSuperAdmin(): Promise<SuperAdminSession> {
  const session = await getSuperAdminSession();
  if (!session) redirect("/login");
  return session;
}
