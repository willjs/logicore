"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus, MapPin, Warehouse } from "lucide-react";
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

interface Branch {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  active: boolean;
  _count: { warehouses: number };
}

const branchSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(80),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
});

type BranchForm = z.infer<typeof branchSchema>;

function BranchFormDialog({
  open,
  onOpenChange,
  branch,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch?: Branch;
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BranchForm>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: branch?.name ?? "",
      address: branch?.address ?? "",
      phone: branch?.phone ?? "",
    },
  });

  const isEditing = Boolean(branch);

  async function onSubmit(values: BranchForm) {
    const payload = {
      name: values.name,
      address: values.address || null,
      phone: values.phone || null,
    };
    if (isEditing) {
      await apiFetch(`/api/branches/${branch!.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    } else {
      await apiFetch("/api/branches", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
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
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar sede" : "Nueva sede"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Actualiza los datos de la sede." : "Registra una nueva sede."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" placeholder="Sede Principal" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" placeholder="Calle 123 #45-67" {...register("address")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" placeholder="300 123 4567" {...register("phone")} />
          </div>
          <DialogFooter>
            <Button type="submit">{isEditing ? "Guardar cambios" : "Crear sede"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BranchesClient() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | undefined>(undefined);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["branches"],
    queryFn: () => apiFetch<Branch[]>("/api/branches"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      apiFetch(`/api/branches/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function handleSuccess(message: string) {
    toast.success(message);
    setDialogOpen(false);
    setEditing(undefined);
    queryClient.invalidateQueries({ queryKey: ["branches"] });
  }

  const branches = data ?? [];
  const totalWarehouses = branches.reduce((sum, b) => sum + b._count.warehouses, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sedes</h1>
          <p className="text-muted-foreground">
            Administra las sedes de la empresa. Cada sede puede tener múltiples bodegas.
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setDialogOpen(true)}>
          <Plus /> Nueva sede
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <MapPin className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{branches.length}</p>
                <p className="text-sm text-muted-foreground">Sedes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-green-100">
                <Warehouse className="size-5 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalWarehouses}</p>
                <p className="text-sm text-muted-foreground">Bodegas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100">
                <MapPin className="size-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{branches.filter((b) => b.active).length}</p>
                <p className="text-sm text-muted-foreground">Activas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="py-8 text-center text-muted-foreground">Cargando…</p>}
          {isError && (
            <p className="py-8 text-center text-destructive">Error al cargar las sedes</p>
          )}
          {!isLoading && !isError && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sede</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="text-right">Bodegas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No hay sedes registradas
                    </TableCell>
                  </TableRow>
                )}
                {branches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-medium">{branch.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {branch.address ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {branch.phone ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">{branch._count.warehouses}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={branch.active}
                          onCheckedChange={(active) =>
                            toggleMutation.mutate({ id: branch.id, active })
                          }
                        />
                        <Badge variant={branch.active ? "default" : "secondary"}>
                          {branch.active ? "Activa" : "Inactiva"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(branch);
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

      <BranchFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(undefined);
        }}
        branch={editing}
        onSuccess={() =>
          handleSuccess(editing ? "Sede actualizada" : "Sede creada")
        }
      />
    </div>
  );
}
