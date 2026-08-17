import { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/db";

interface AuditInput {
  companyId: number;
  userId: number;
  action: string;
  entity: string;
  entityId?: number;
  details?: Record<string, unknown>;
}

type DbLike = Prisma.TransactionClient | typeof prisma;

export async function auditLog(db: DbLike, input: AuditInput) {
  await db.auditLog.create({
    data: {
      companyId: input.companyId,
      userId: input.userId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      details: (input.details ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}
