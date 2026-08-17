import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido").trim().toLowerCase(),
  password: z.string().min(1, "La contraseña es requerida"),
});

export const companySchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(120),
  nit: z.string().trim().max(60).optional().nullable(),
  address: z.string().trim().max(200).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().email("Correo inválido").max(120).optional().nullable(),
});

export const companyToggleSchema = z.object({
  active: z.boolean(),
});

export const userCreateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(120),
  email: z.string().email("Correo electrónico inválido").trim().toLowerCase(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  assignments: z
    .array(z.object({ companyId: z.number().int().positive(), roleId: z.number().int().positive() }))
    .optional()
    .default([]),
});

export const userEditSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(120).optional(),
  email: z.string().email("Correo electrónico inválido").trim().toLowerCase().optional(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional(),
  active: z.boolean().optional(),
});

export const userToggleSchema = z.object({
  active: z.boolean(),
});

export const userAssignmentSchema = z.object({
  companyId: z.number().int().positive(),
  roleId: z.number().int().positive(),
});

export const roleSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(60),
  description: z.string().trim().max(200).optional().nullable(),
  permissionCodes: z.array(z.string()).optional().default([]),
});

export const roleToggleSchema = z.object({
  active: z.boolean(),
});

export const switchCompanySchema = z.object({
  companyId: z.number().int().positive(),
});

export const customerCreateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(120),
  lastname: z.string().trim().max(120).optional().nullable(),
  identificationType: z.string().trim().min(1, "El tipo de documento es requerido").max(10).default("CC"),
  identification: z.string().trim().min(1, "El documento es requerido").max(40),
  address: z.string().trim().max(200).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().email("Correo inválido").max(120).optional().nullable(),
});

export const customerEditSchema = customerCreateSchema.partial();

export const customerToggleSchema = z.object({ active: z.boolean() });

export const brandSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(80),
});

export const brandEditSchema = brandSchema.partial();

export const categorySchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(80),
});

export const categoryEditSchema = categorySchema.partial();

export const productSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(120),
  serial: z.string().trim().max(60).optional().nullable(),
  description: z.string().trim().max(300).optional().nullable(),
  salePrice: z.number().nonnegative("El precio no puede ser negativo").default(0),
  brandId: z.number().int().positive().nullable().optional(),
  categoryId: z.number().int().positive().nullable().optional(),
});

export const productEditSchema = productSchema.partial();

export const productToggleSchema = z.object({ active: z.boolean() });

export const warehouseSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(80),
  location: z.string().trim().max(200).optional().nullable(),
  branchId: z.number().int().positive().optional().nullable(),
});

export const warehouseEditSchema = warehouseSchema.partial();

export const warehouseToggleSchema = z.object({ active: z.boolean() });

export const movementTypeSchema = z.enum(["ENTRADA", "SALIDA", "AJUSTE"]);

export const movementSchema = z.object({
  type: movementTypeSchema,
  productId: z.number().int().positive("El producto es requerido"),
  warehouseId: z.number().int().positive("La bodega es requerida"),
  quantity: z
    .number()
    .int("La cantidad debe ser un número entero")
    .refine((q) => q !== 0, "La cantidad no puede ser 0"),
  referenceType: z
    .enum(["SALE", "TRANSFER", "RETURN", "ADJUSTMENT", "ENTRY", "EXIT"])
    .optional()
    .nullable(),
  referenceId: z.number().int().positive().optional().nullable(),
  description: z.string().trim().max(300).optional().nullable(),
});

export const truckSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(80),
  plate: z.string().trim().max(20).optional().nullable(),
  driverId: z.number().int().positive().nullable().optional(),
});

export const truckEditSchema = truckSchema.partial();

export const truckToggleSchema = z.object({ active: z.boolean() });

export const truckLoadSchema = z.object({
  warehouseId: z.number().int().positive().optional(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive("El producto es requerido"),
        quantity: z.number().int("La cantidad debe ser un entero").positive("La cantidad debe ser mayor a 0"),
      }),
    )
    .min(1, "Agrega al menos un producto"),
});

export const transferCreateSchema = z.object({
  truckId: z.number().int().positive("El camión es requerido"),
  warehouseId: z.number().int().positive().optional(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive("El producto es requerido"),
        quantity: z.number().int("La cantidad debe ser un entero").positive("La cantidad debe ser mayor a 0"),
      }),
    )
    .min(1, "Agrega al menos un producto"),
});

export const saleItemSchema = z.object({
  productId: z.number().int().positive("El producto es requerido"),
  quantity: z.number().int("La cantidad debe ser un entero").positive("La cantidad debe ser mayor a 0"),
  unitPrice: z.number().nonnegative("El precio no puede ser negativo"),
});

export const saleCreateSchema = z.object({
  customerId: z.number().int().positive("El cliente es requerido"),
  truckId: z.number().int().positive().nullable().optional(),
  paymentMethod: z.enum(["EFECTIVO", "TRANSFERENCIA"]).nullable().optional(),
  amountReceived: z.number().nonnegative().optional(),
  notes: z.string().trim().max(300).optional().nullable(),
  items: z.array(saleItemSchema).min(1, "Agrega al menos un producto"),
});

export const salePaymentSchema = z.object({
  amount: z.number().positive("El monto debe ser mayor a 0"),
  method: z.enum(["EFECTIVO", "TRANSFERENCIA"]),
  notes: z.string().trim().max(300).optional().nullable(),
});

export const customerPaymentSchema = z.object({
  customerId: z.number().int().positive("El cliente es requerido"),
  amount: z.number().positive("El monto debe ser mayor a 0"),
  method: z.enum(["EFECTIVO", "TRANSFERENCIA"]),
  received: z.number().nonnegative().optional(),
  change: z.number().nonnegative().optional(),
  notes: z.string().trim().max(300).optional().nullable(),
});

export const returnItemSchema = z.object({
  productId: z.number().int().positive("El producto es requerido"),
  quantity: z.number().int("La cantidad debe ser un entero").positive("La cantidad debe ser mayor a 0"),
});

export const returnCreateSchema = z.object({
  transferId: z.number().int().positive("El traslado es requerido"),
  warehouseId: z.number().int().positive().optional(),
  notes: z.string().trim().max(300).optional().nullable(),
  items: z.array(returnItemSchema).min(1, "Agrega al menos un producto"),
});
