import { withApi, ApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { serialize } from "@/lib/serialize";
import { writeStored } from "@/lib/storage";

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

function serializeDoc(companyId: number, customerId: number, doc: {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}) {
  return {
    id: doc.id,
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    size: doc.size,
    createdAt: doc.createdAt,
    fileUrl: `/api/customers/${customerId}/documents/${doc.id}/file`,
  };
}

export const GET = withApi(
  async ({ session, params }) => {
    const customerId = Number(params.id);
    if (!Number.isInteger(customerId)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }

    const docs = await prisma.attachment.findMany({
      where: {
        companyId: session.company.id,
        entityType: "CUSTOMER",
        entityId: customerId,
        kind: "DOCUMENTO",
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(serialize(docs.map((doc) => serializeDoc(session.company.id, customerId, doc))));
  },
  { permissions: ["customers.view"] },
);

export const POST = withApi(
  async ({ req, session, params }) => {
    if (
      !session.permissions.some(
        (permission) => permission === "customers.create" || permission === "customers.edit",
      )
    ) {
      throw new ApiError("No tiene permisos para realizar esta operación", 403, "FORBIDDEN");
    }
    const customerId = Number(params.id);
    if (!Number.isInteger(customerId)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, companyId: session.company.id },
    });
    if (!customer) {
      throw new ApiError("El cliente no existe", 404, "CUSTOMER_NOT_FOUND");
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ApiError("Selecciona un archivo", 400, "FILE_REQUIRED");
    }

    if (!ALLOWED_MIME.has(file.type)) {
      throw new ApiError("Formato no permitido (JPG, PNG, WebP o PDF)", 400, "INVALID_MIME");
    }
    if (file.size > MAX_SIZE) {
      throw new ApiError("El archivo no puede superar 10 MB", 400, "FILE_TOO_LARGE");
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = MIME_EXT[file.type] ?? "pdf";
    const filename = `${session.company.id}-${customerId}-${Date.now()}.${ext}`;
    const relPath = `documents/${filename}`;
    await writeStored(relPath, bytes);

    const doc = await prisma.attachment.create({
      data: {
        companyId: session.company.id,
        entityType: "CUSTOMER",
        entityId: customerId,
        kind: "DOCUMENTO",
        originalName: file.name,
        path: relPath,
        mimeType: file.type,
        size: file.size,
      },
    });

    await auditLog(prisma, {
      companyId: session.company.id,
      userId: session.user.id,
      action: "UPLOAD_CUSTOMER_DOCUMENT",
      entity: "CUSTOMER",
      entityId: customerId,
      details: { filename: file.name },
    });

    return ok(serialize(serializeDoc(session.company.id, customerId, doc)));
  },
);
