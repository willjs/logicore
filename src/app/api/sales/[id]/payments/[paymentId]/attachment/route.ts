import { withApi, ApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { serialize } from "@/lib/serialize";
import { deleteStored, readStored, writeStored } from "@/lib/storage";

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
const KINDS = ["EVIDENCIA", "FIRMA"] as const;

function parseKind(raw: string | null) {
  if (!raw || !KINDS.includes(raw as (typeof KINDS)[number])) {
    throw new ApiError("Tipo de adjunto inválido", 400, "INVALID_KIND");
  }
  return raw as (typeof KINDS)[number];
}

async function findPaymentAttachment(
  companyId: number,
  paymentId: number,
  kind: (typeof KINDS)[number],
) {
  return prisma.attachment.findFirst({
    where: { companyId, entityType: "PAYMENT", entityId: paymentId, kind },
  });
}

export const POST = withApi(
  async ({ req, session, params }) => {
    const saleId = Number(params.id);
    const paymentId = Number(params.paymentId);
    if (!Number.isInteger(saleId) || !Number.isInteger(paymentId)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }
    const kind = parseKind(req.nextUrl.searchParams.get("kind"));

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, saleId, companyId: session.company.id },
    });
    if (!payment) {
      throw new ApiError("El pago no existe", 404, "PAYMENT_NOT_FOUND");
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
    const ext = MIME_EXT[file.type] ?? "png";
    const filename = `${session.company.id}-${paymentId}-${Date.now()}.${ext}`;
    const relPath = `sales/${filename}`;
    await writeStored(relPath, bytes);

    const existing = await findPaymentAttachment(session.company.id, paymentId, kind);
    if (existing) {
      await prisma.attachment.update({
        where: { id: existing.id },
        data: { path: relPath, mimeType: file.type, size: file.size, originalName: file.name },
      });
      await deleteStored(existing.path);
    } else {
      await prisma.attachment.create({
        data: {
          companyId: session.company.id,
          entityType: "PAYMENT",
          entityId: paymentId,
          kind,
          originalName: file.name,
          path: relPath,
          mimeType: file.type,
          size: file.size,
        },
      });
    }

    await auditLog(prisma, {
      companyId: session.company.id,
      userId: session.user.id,
      action: kind === "FIRMA" ? "UPLOAD_PAYMENT_SIGNATURE" : "UPLOAD_PAYMENT_RECEIPT",
      entity: "PAYMENT",
      entityId: paymentId,
      details: { saleId, filename: file.name },
    });

    return ok(serialize({ ok: true }));
  },
  { permissions: ["payments.create"] },
);

export const GET = withApi(
  async ({ session, params, req }) => {
    const paymentId = Number(params.paymentId);
    if (!Number.isInteger(paymentId)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }
    const kind = parseKind(req.nextUrl.searchParams.get("kind"));

    const attachment = await findPaymentAttachment(session.company.id, paymentId, kind);
    if (!attachment) {
      throw new ApiError("El adjunto no existe", 404, "ATTACHMENT_NOT_FOUND");
    }

    const bytes = await readStored(attachment.path);
    if (!bytes) {
      throw new ApiError("No se encontró el archivo", 404, "ATTACHMENT_NOT_FOUND");
    }

    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": attachment.mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  },
  { permissions: ["sales.view"] },
);

export const DELETE = withApi(
  async ({ session, params, req }) => {
    const saleId = Number(params.id);
    const paymentId = Number(params.paymentId);
    if (!Number.isInteger(saleId) || !Number.isInteger(paymentId)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }
    const kind = parseKind(req.nextUrl.searchParams.get("kind"));

    const existing = await findPaymentAttachment(session.company.id, paymentId, kind);
    if (existing) {
      await prisma.attachment.delete({ where: { id: existing.id } });
      await deleteStored(existing.path);
    }

    await auditLog(prisma, {
      companyId: session.company.id,
      userId: session.user.id,
      action: "DELETE_PAYMENT_ATTACHMENT",
      entity: "PAYMENT",
      entityId: paymentId,
      details: { saleId, kind },
    });

    return ok({ ok: true });
  },
  { permissions: ["payments.create"] },
);
