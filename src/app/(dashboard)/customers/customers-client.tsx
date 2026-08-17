"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, ExternalLink, FileText, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

export interface Customer {
  id: number;
  name: string;
  lastname: string | null;
  identificationType: string;
  identification: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
  photoUrl: string | null;
  documentsCount: number;
}

interface CustomerDocument {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  fileUrl: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CustomerAvatar({ customer, size = "md" }: { customer: Customer; size?: "md" | "sm" }) {
  const className =
    size === "sm"
      ? "size-8 rounded-full object-cover"
      : "size-20 rounded-full object-cover ring-1 ring-border";
  const initials = `${customer.name.charAt(0)}${(customer.lastname ?? "").charAt(0) || ""}`.toUpperCase();

  if (customer.photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={customer.photoUrl} alt={`Foto de ${customer.name}`} className={className} />;
  }

  return (
    <div
      className={`flex items-center justify-center bg-muted font-semibold text-muted-foreground ${
        size === "sm" ? "size-8 rounded-full text-xs" : "size-20 rounded-full text-lg"
      }`}
    >
      {initials || "?"}
    </div>
  );
}

const customerSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(120),
  lastname: z.string().trim().max(120).optional().or(z.literal("")),
  identificationType: z.string().trim().min(1).max(10),
  identification: z.string().trim().min(1, "El documento es requerido").max(40),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Correo inválido")
    .max(120)
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
});

type CustomerForm = z.infer<typeof customerSchema>;

const ID_TYPES = ["CC", "NIT", "CE", "TI"];

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
  onSuccess: (customer?: Customer) => void;
}) {
  const [idType, setIdType] = useState(customer?.identificationType ?? "CC");
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customer?.name ?? "",
      lastname: customer?.lastname ?? "",
      identificationType: customer?.identificationType ?? "CC",
      identification: customer?.identification ?? "",
      phone: customer?.phone ?? "",
      email: customer?.email ?? "",
      address: customer?.address ?? "",
    },
  });

  const isEditing = Boolean(customer);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(customer?.photoUrl ?? null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [existingDocs, setExistingDocs] = useState<CustomerDocument[]>([]);
  const [pendingDocs, setPendingDocs] = useState<File[]>([]);
  const [removedDocs, setRemovedDocs] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && customer) {
      apiFetch<CustomerDocument[]>(`/api/customers/${customer.id}/documents`)
        .then(setExistingDocs)
        .catch(() => setExistingDocs([]));
    }
  }, [open, customer]);

  function onPhotoChange(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Formato no permitido (JPG, PNG o WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar 5 MB");
      return;
    }
    if (photoPreview && !customer?.photoUrl) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setRemovePhoto(false);
  }

  function onDocumentChange(file: File | undefined) {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)
    ) {
      toast.error("Formato no permitido (JPG, PNG, WebP o PDF)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("El archivo no puede superar 10 MB");
      return;
    }
    setPendingDocs((prev) => [...prev, file]);
  }

  async function uploadPhoto(customerId: number) {
    const form = new FormData();
    form.append("file", photoFile!);
    await apiFetch<{ photoUrl: string }>(`/api/customers/${customerId}/photo`, {
      method: "POST",
      body: form,
    });
  }

  async function uploadDocuments(customerId: number) {
    for (const file of pendingDocs) {
      const form = new FormData();
      form.append("file", file);
      await apiFetch(`/api/customers/${customerId}/documents`, {
        method: "POST",
        body: form,
      });
    }
  }

  async function deleteRemovedDocuments(customerId: number) {
    for (const docId of removedDocs) {
      await apiFetch(`/api/customers/${customerId}/documents/${docId}`, {
        method: "DELETE",
      });
    }
  }

  async function onSubmit(values: CustomerForm) {
    const payload = {
      name: values.name,
      lastname: values.lastname || null,
      identificationType: idType,
      identification: values.identification,
      phone: values.phone || null,
      email: values.email || null,
      address: values.address || null,
    };
    setSubmitting(true);
    try {
      if (isEditing) {
        const customerId = customer!.id;
        await apiFetch(`/api/customers/${customerId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        if (photoFile) {
          await uploadPhoto(customerId);
        } else if (removePhoto) {
          await apiFetch(`/api/customers/${customerId}/photo`, { method: "DELETE" });
        }
        await deleteRemovedDocuments(customerId);
        await uploadDocuments(customerId);
      } else {
        const created = await apiFetch<Customer>("/api/customers", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (photoFile) {
          await uploadPhoto(created.id);
        }
        await uploadDocuments(created.id);
        onSuccess(created);
      }
      if (isEditing) {
        onSuccess(customer);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Actualiza los datos del cliente."
              : "Registra un nuevo cliente de la empresa."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {photoPreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt="Foto del cliente"
                  className="size-20 rounded-full object-cover ring-1 ring-border"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoFile(null);
                    setRemovePhoto(Boolean(customer?.photoUrl));
                    setPhotoPreview(customer?.photoUrl ?? null);
                    if (!customer?.photoUrl) URL.revokeObjectURL(photoPreview);
                  }}
                  className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-destructive text-white"
                  title="Quitar foto"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex size-20 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Camera className="size-8" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="photo">Foto del cliente</Label>
              <Input
                id="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => onPhotoChange(event.target.files?.[0])}
              />
              <p className="text-xs text-muted-foreground">JPG, PNG o WebP · máx. 5 MB</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input id="name" placeholder="Nombre" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastname">Apellido</Label>
              <Input id="lastname" placeholder="Apellido" {...register("lastname")} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo de documento</Label>
              <Select
                value={idType}
                onValueChange={(value) => {
                  setIdType(value);
                  setValue("identificationType", value);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ID_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="identification">Documento *</Label>
              <Input id="identification" placeholder="Número de documento" {...register("identification")} />
              {errors.identification && (
                <p className="text-sm text-destructive">{errors.identification.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" placeholder="+57 ..." {...register("phone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" placeholder="cliente@correo.com" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" placeholder="Dirección" {...register("address")} />
          </div>
          <div className="space-y-3 rounded-lg border p-3">
            <Label>Cédula / documentos</Label>
            <div className="space-y-2">
              {existingDocs.length === 0 && pendingDocs.length === 0 && (
                <p className="text-sm text-muted-foreground">Sin documentos adjuntos</p>
              )}
              {existingDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{doc.originalName}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatBytes(doc.size)}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Ver documento"
                    >
                      <Button type="button" variant="ghost" size="icon">
                        <ExternalLink className="size-4" />
                      </Button>
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="Quitar documento"
                      onClick={() => {
                        setRemovedDocs((prev) => [...prev, doc.id]);
                        setExistingDocs((prev) => prev.filter((item) => item.id !== doc.id));
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {pendingDocs.map((doc, index) => (
                <div
                  key={`${doc.name}-${index}`}
                  className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{doc.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatBytes(doc.size)}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Quitar"
                    onClick={() =>
                      setPendingDocs((prev) => prev.filter((_, i) => i !== index))
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) => {
                onDocumentChange(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <p className="text-xs text-muted-foreground">
              JPG, PNG, WebP o PDF · máx. 10 MB por archivo
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Guardando…" : isEditing ? "Guardar cambios" : "Crear cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CustomersClient() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | undefined>(undefined);
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["customers"],
    queryFn: () => apiFetch<Customer[]>("/api/customers"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      apiFetch(`/api/customers/${id}/toggle`, {
        method: "POST",
        body: JSON.stringify({ active }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const filtered = (data ?? []).filter((customer) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      customer.name.toLowerCase().includes(q) ||
      (customer.lastname ?? "").toLowerCase().includes(q) ||
      customer.identification.toLowerCase().includes(q) ||
      (customer.email ?? "").toLowerCase().includes(q)
    );
  });

  function handleSuccess(message: string) {
    toast.success(message);
    setDialogOpen(false);
    setEditing(undefined);
    queryClient.invalidateQueries({ queryKey: ["customers"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">
            Administra los clientes de la empresa activa.
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setDialogOpen(true)}>
          <Plus /> Nuevo cliente
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nombre, documento o correo…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="py-8 text-center text-muted-foreground">Cargando…</p>}
          {isError && (
            <p className="py-8 text-center text-destructive">Error al cargar los clientes</p>
          )}
          {!isLoading && !isError && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      {search ? "Sin resultados para la búsqueda" : "No hay clientes registrados"}
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <CustomerAvatar customer={customer} size="sm" />
                        <div className="min-w-0">
                          <span className="block truncate font-medium">
                            {customer.name} {customer.lastname ?? ""}
                          </span>
                          {customer.documentsCount > 0 && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <FileText className="size-3" />
                              {customer.documentsCount}{" "}
                              {customer.documentsCount === 1 ? "documento" : "documentos"}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{customer.identificationType}</Badge>{" "}
                      {customer.identification}
                    </TableCell>
                    <TableCell>
                      <span className="block text-sm">{customer.email ?? "—"}</span>
                      <span className="block text-xs text-muted-foreground">
                        {customer.phone ?? ""}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={customer.active}
                          onCheckedChange={(active) =>
                            toggleMutation.mutate({ id: customer.id, active })
                          }
                        />
                        <Badge variant={customer.active ? "default" : "secondary"}>
                          {customer.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(customer);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {dialogOpen && (
        <CustomerFormDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditing(undefined);
          }}
          customer={editing}
          onSuccess={() => handleSuccess(editing ? "Cliente actualizado" : "Cliente creado")}
        />
      )}
    </div>
  );
}
