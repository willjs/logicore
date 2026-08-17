"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus } from "lucide-react";
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

interface Branch {
  id: number;
  name: string;
  active: boolean;
}

interface Warehouse {
  id: number;
  name: string;
  location: string | null;
  active: boolean;
  branch: { id: number; name: string } | null;
  _count: { inventory: number };
}

const warehouseSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(80),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  branchId: z.string().optional(),
});

type WarehouseForm = z.infer<typeof warehouseSchema>;

function WarehouseFormDialog({
  open,
  onOpenChange,
  warehouse,
  branches,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse?: Warehouse;
  branches: Branch[];
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WarehouseForm>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      name: warehouse?.name ?? "",
      location: warehouse?.location ?? "",
      branchId: warehouse?.branch?.id?.toString() ?? "",
    },
  });

  const isEditing = Boolean(warehouse);
  const selectedBranchId = watch("branchId");

  async function onSubmit(values: WarehouseForm) {
    const payload = {
      name: values.name,
      location: values.location || null,
      branchId: values.branchId ? Number(values.branchId) : null,
    };
    if (isEditing) {
      await apiFetch(`/api/warehouses/${warehouse!.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    } else {
      await apiFetch("/api/warehouses", {
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
          <DialogTitle>{isEditing ? "Editar bodega" : "Nueva bodega"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Actualiza los datos de la bodega." : "Registra una nueva bodega."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" placeholder="Nombre de la bodega" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Ubicación</Label>
            <Input id="location" placeholder="Dirección o referencia" {...register("location")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="branchId">Sede</Label>
            <Select value={selectedBranchId} onValueChange={(v) => setValue("branchId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sin sede" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin sede</SelectItem>
                {branches
                  .filter((b) => b.active)
                  .map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit">{isEditing ? "Guardar cambios" : "Crear bodega"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function WarehousesClient() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | undefined>(undefined);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => apiFetch<Warehouse[]>("/api/warehouses"),
  });

  const { data: branchesData } = useQuery({
    queryKey: ["branches"],
    queryFn: () => apiFetch<Branch[]>("/api/branches"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      apiFetch(`/api/warehouses/${id}/toggle`, {
        method: "POST",
        body: JSON.stringify({ active }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["warehouses"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const branches = branchesData ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bodegas</h1>
          <p className="text-muted-foreground">
            Almacenes de la empresa activa donde se controla el inventario.
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setDialogOpen(true)}>
          <Plus /> Nueva bodega
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="py-8 text-center text-muted-foreground">Cargando…</p>}
          {isError && (
            <p className="py-8 text-center text-destructive">Error al cargar las bodegas</p>
          )}
          {!isLoading && !isError && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bodega</TableHead>
                  <TableHead>Sede</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead className="text-right">Productos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No hay bodegas registradas
                    </TableCell>
                  </TableRow>
                )}
                {data?.map((warehouse) => (
                  <TableRow key={warehouse.id}>
                    <TableCell className="font-medium">{warehouse.name}</TableCell>
                    <TableCell>
                      {warehouse.branch ? (
                        <Badge variant="outline">{warehouse.branch.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{warehouse.location ?? "—"}</TableCell>
                    <TableCell className="text-right">{warehouse._count.inventory}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={warehouse.active}
                          onCheckedChange={(active) =>
                            toggleMutation.mutate({ id: warehouse.id, active })
                          }
                        />
                        <Badge variant={warehouse.active ? "default" : "secondary"}>
                          {warehouse.active ? "Activa" : "Inactiva"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(warehouse);
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
        <WarehouseFormDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditing(undefined);
          }}
          warehouse={editing}
          branches={branches}
          onSuccess={() => {
            toast.success(editing ? "Bodega actualizada" : "Bodega creada");
            setDialogOpen(false);
            setEditing(undefined);
            queryClient.invalidateQueries({ queryKey: ["warehouses"] });
          }}
        />
      )}
    </div>
  );
}
