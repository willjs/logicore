import { withApi, ApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { deleteStored } from "@/lib/storage";

export const DELETE = withApi(
  async ({ session, params }) => {
    const customerId = Number(params.id);
    const documentId = Number(params.documentId);
    if (!Number.isInteger(customerId) || !Number.isInteger(documentId)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }

    const doc = await prisma.attachment.findFirst({
      where: {
        id: documentId,
        companyId: session.company.id,
        entityType: "CUSTOMER",
        entityId: customerId,
        kind: "DOCUMENTO",
      },
    });

    if (doc) {
      await prisma.attachment.delete({ where: { id: doc.id } });
      await deleteStored(doc.path);
    }

    await auditLog(prisma, {
      companyId: session.company.id,
      userId: session.user.id,
      action: "DELETE_CUSTOMER_DOCUMENT",
      entity: "CUSTOMER",
      entityId: customerId,
      details: doc ? { filename: doc.originalName } : {},
    });

    return ok({ ok: true });
  },
  { permissions: ["customers.edit"] },
);
