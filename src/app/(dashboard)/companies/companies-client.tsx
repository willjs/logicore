"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

interface Company {
  id: number;
  name: string;
  nit: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo: string | null;
  active: boolean;
  createdAt: string;
}

const companySchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(120),
  nit: z.string().trim().max(60).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Correo inválido")
    .max(120)
    .optional()
    .or(z.literal("")),
  logo: z.string().trim().max(500).optional().or(z.literal("")),
});

type CompanyForm = z.infer<typeof companySchema>;

function CompanyFormDialog({
  open,
  onOpenChange,
  company,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company;
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company.name,
      nit: company.nit ?? "",
      address: company.address ?? "",
      phone: company.phone ?? "",
      email: company.email ?? "",
      logo: company.logo ?? "",
    },
  });

  async function onSubmit(values: CompanyForm) {
    const payload = {
      name: values.name,
      nit: values.nit || null,
      address: values.address || null,
      phone: values.phone || null,
      email: values.email || null,
      logo: values.logo || null,
    };
    await apiFetch(`/api/companies/${company.id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    onSuccess();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar empresa</DialogTitle>
          <DialogDescription>Actualiza los datos de la empresa.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" placeholder="Empresa S.A.S." {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nit">NIT</Label>
              <Input id="nit" placeholder="900000000-1" {...register("nit")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" placeholder="+57 ..." {...register("phone")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" type="email" placeholder="contacto@empresa.com" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" placeholder="Dirección" {...register("address")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logo">Logo (URL)</Label>
            <Input id="logo" placeholder="https://ejemplo.com/logo.png" {...register("logo")} />
            <p className="text-xs text-muted-foreground">
              URL de la imagen del logo. Se mostrará en reportes PDF y documents.
            </p>
          </div>
          <DialogFooter>
            <Button type="submit">Guardar cambios</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CompaniesClient() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["companies"],
    queryFn: () => apiFetch<Company[]>("/api/companies"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      apiFetch(`/api/companies/${id}/toggle`, {
        method: "POST",
        body: JSON.stringify({ active }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function handleSuccess(message: string) {
    toast.success(message);
    setDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["companies"] });
  }

  const currentCompany = data?.[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Empresa</h1>
        <p className="text-muted-foreground">
          Información de la empresa activa en el sistema.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos de la empresa</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="py-8 text-center text-muted-foreground">Cargando…</p>}
          {isError && (
            <p className="py-8 text-center text-destructive">Error al cargar la empresa</p>
          )}
          {!isLoading && !isError && currentCompany && (
            <div className="space-y-4">
              {currentCompany.logo && (
                <div className="flex items-center gap-4">
                  <img
                    src={currentCompany.logo}
                    alt="Logo de la empresa"
                    className="h-16 w-16 rounded-lg border object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <div>
                    <p className="text-sm text-muted-foreground">Logo actual</p>
                    <p className="text-xs text-muted-foreground truncate max-w-xs">
                      {currentCompany.logo}
                    </p>
                  </div>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Nombre</p>
                  <p className="font-medium">{currentCompany.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">NIT</p>
                  <p className="font-medium">{currentCompany.nit ?? "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Correo</p>
                  <p className="font-medium">{currentCompany.email ?? "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Teléfono</p>
                  <p className="font-medium">{currentCompany.phone ?? "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dirección</p>
                  <p className="font-medium">{currentCompany.address ?? "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <Badge variant={currentCompany.active ? "default" : "secondary"}>
                    {currentCompany.active ? "Activa" : "Inactiva"}
                  </Badge>
                </div>
              </div>
              <div className="pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(true)}>
                  <Pencil className="mr-1 size-4" />
                  Editar datos
                </Button>
              </div>
            </div>
          )}
          {!isLoading && !isError && !currentCompany && (
            <p className="py-8 text-center text-muted-foreground">No hay empresa configurada</p>
          )}
        </CardContent>
      </Card>

      {currentCompany && (
        <CompanyFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          company={currentCompany}
          onSuccess={() => handleSuccess("Empresa actualizada")}
        />
      )}
    </div>
  );
}
