import { withApi, ApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { readStored } from "@/lib/storage";

export const GET = withApi(
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

    if (!doc) {
      throw new ApiError("El documento no existe", 404, "DOCUMENT_NOT_FOUND");
    }

    const bytes = await readStored(doc.path);
    if (!bytes) {
      throw new ApiError("No se encontró el archivo", 404, "DOCUMENT_NOT_FOUND");
    }

    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.originalName)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  },
  { permissions: ["customers.view"] },
);
