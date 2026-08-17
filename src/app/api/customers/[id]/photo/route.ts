import { withApi, ApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { serialize } from "@/lib/serialize";
import { deleteStored, readStored, writeStored } from "@/lib/storage";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function findPhoto(companyId: number, customerId: number) {
  return prisma.attachment.findFirst({
    where: {
      companyId,
      entityType: "CUSTOMER",
      entityId: customerId,
      kind: "FOTO",
    },
  });
}

export const GET = withApi(
  async ({ session, params }) => {
    const customerId = Number(params.id);
    if (!Number.isInteger(customerId)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }

    const attachment = await findPhoto(session.company.id, customerId);
    if (!attachment) {
      throw new ApiError("El cliente no tiene foto", 404, "PHOTO_NOT_FOUND");
    }

    const bytes = await readStored(attachment.path);
    if (!bytes) {
      throw new ApiError("No se encontró la imagen", 404, "PHOTO_NOT_FOUND");
    }

    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": attachment.mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
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
      throw new ApiError("Selecciona una imagen", 400, "FILE_REQUIRED");
    }

    if (!ALLOWED_MIME.has(file.type)) {
      throw new ApiError("Formato no permitido (JPG, PNG o WebP)", 400, "INVALID_MIME");
    }
    if (file.size > MAX_SIZE) {
      throw new ApiError("La imagen no puede superar 5 MB", 400, "FILE_TOO_LARGE");
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    const ext = MIME_EXT[file.type] ?? "png";
    const filename = `${session.company.id}-${customerId}-${Date.now()}.${ext}`;
    const relPath = `customers/${filename}`;
    await writeStored(relPath, bytes);

    const existing = await findPhoto(session.company.id, customerId);
    if (existing) {
      await prisma.attachment.update({
        where: { id: existing.id },
        data: {
          path: relPath,
          mimeType: file.type,
          size: file.size,
          originalName: file.name,
        },
      });
      await deleteStored(existing.path);
    } else {
      await prisma.attachment.create({
        data: {
          companyId: session.company.id,
          entityType: "CUSTOMER",
          entityId: customerId,
          kind: "FOTO",
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
      action: "UPDATE_CUSTOMER_PHOTO",
      entity: "CUSTOMER",
      entityId: customerId,
      details: { filename },
    });

    return ok(serialize({ photoUrl: `/api/customers/${customerId}/photo` }));
  },
);

export const DELETE = withApi(
  async ({ session, params }) => {
    const customerId = Number(params.id);
    if (!Number.isInteger(customerId)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }

    const existing = await findPhoto(session.company.id, customerId);
    if (existing) {
      await prisma.attachment.delete({ where: { id: existing.id } });
      await deleteStored(existing.path);
    }

    await auditLog(prisma, {
      companyId: session.company.id,
      userId: session.user.id,
      action: "DELETE_CUSTOMER_PHOTO",
      entity: "CUSTOMER",
      entityId: customerId,
    });

    return ok({ ok: true });
  },
  { permissions: ["customers.edit"] },
);
