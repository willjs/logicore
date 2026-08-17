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

interface Category {
  id: number;
  name: string;
  active: boolean;
  _count: { products: number };
}

const categorySchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(80),
});

function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category;
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: category?.name ?? "" },
  });

  const isEditing = Boolean(category);

  async function onSubmit(values: { name: string }) {
    if (isEditing) {
      await apiFetch(`/api/categories/${category!.id}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      });
    } else {
      await apiFetch("/api/categories", {
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
          <DialogTitle>{isEditing ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Actualiza el nombre de la categoría." : "Registra una nueva categoría."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" placeholder="Nombre de la categoría" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit">{isEditing ? "Guardar cambios" : "Crear categoría"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CategoriesClient() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | undefined>(undefined);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<Category[]>("/api/categories"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      apiFetch(`/api/categories/${id}/toggle`, {
        method: "POST",
        body: JSON.stringify({ active }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categorías</h1>
          <p className="text-muted-foreground">
            Catálogo de categorías de la empresa activa.
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setDialogOpen(true)}>
          <Plus /> Nueva categoría
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="py-8 text-center text-muted-foreground">Cargando…</p>}
          {isError && (
            <p className="py-8 text-center text-destructive">Error al cargar las categorías</p>
          )}
          {!isLoading && !isError && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      No hay categorías registradas
                    </TableCell>
                  </TableRow>
                )}
                {data?.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>{category._count.products}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={category.active}
                          onCheckedChange={(active) =>
                            toggleMutation.mutate({ id: category.id, active })
                          }
                        />
                        <Badge variant={category.active ? "default" : "secondary"}>
                          {category.active ? "Activa" : "Inactiva"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(category);
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
        <CategoryFormDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditing(undefined);
          }}
          category={editing}
          onSuccess={() => {
            toast.success(editing ? "Categoría actualizada" : "Categoría creada");
            setDialogOpen(false);
            setEditing(undefined);
            queryClient.invalidateQueries({ queryKey: ["categories"] });
          }}
        />
      )}
    </div>
  );
}
