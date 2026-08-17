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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

interface Brand {
  id: number;
  name: string;
  active: boolean;
  _count: { products: number };
}

const brandSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(80),
});

function BrandFormDialog({
  open,
  onOpenChange,
  brand,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand?: Brand;
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(brandSchema),
    defaultValues: { name: brand?.name ?? "" },
  });

  const isEditing = Boolean(brand);

  async function onSubmit(values: { name: string }) {
    if (isEditing) {
      await apiFetch(`/api/brands/${brand!.id}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      });
    } else {
      await apiFetch("/api/brands", {
        method: "POST",
        body: JSON.stringify(values),
      });
    }
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar marca" : "Nueva marca"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Actualiza el nombre de la marca." : "Registra una nueva marca."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" placeholder="Nombre de la marca" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit">{isEditing ? "Guardar cambios" : "Crear marca"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BrandsClient() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | undefined>(undefined);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["brands"],
    queryFn: () => apiFetch<Brand[]>("/api/brands"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      apiFetch(`/api/brands/${id}/toggle`, {
        method: "POST",
        body: JSON.stringify({ active }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brands"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marcas</h1>
          <p className="text-muted-foreground">
            Catálogo de marcas de la empresa activa.
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setDialogOpen(true)}>
          <Plus /> Nueva marca
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="py-8 text-center text-muted-foreground">Cargando…</p>}
          {isError && <p className="py-8 text-center text-destructive">Error al cargar las marcas</p>}
          {!isLoading && !isError && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Marca</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      No hay marcas registradas
                    </TableCell>
                  </TableRow>
                )}
                {data?.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell className="font-medium">{brand.name}</TableCell>
                    <TableCell>{brand._count.products}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={brand.active}
                          onCheckedChange={(active) =>
                            toggleMutation.mutate({ id: brand.id, active })
                          }
                        />
                        <Badge variant={brand.active ? "default" : "secondary"}>
                          {brand.active ? "Activa" : "Inactiva"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(brand);
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
        <BrandFormDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditing(undefined);
          }}
          brand={editing}
          onSuccess={() => {
            toast.success(editing ? "Marca actualizada" : "Marca creada");
            setDialogOpen(false);
            setEditing(undefined);
            queryClient.invalidateQueries({ queryKey: ["brands"] });
          }}
        />
      )}
    </div>
  );
}
