"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

interface RoleRow {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
  permissionCodes: string[];
}

interface Permission {
  id: number;
  code: string;
  module: string;
  description: string | null;
}

function RoleFormDialog({
  open,
  onOpenChange,
  role,
  permissions,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RoleRow | null;
  permissions: Permission[];
  onSuccess: () => void;
}) {
  const [permissionCodes, setPermissionCodes] = useState<string[]>(
    role?.permissionCodes ?? [],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { name: role?.name ?? "", description: role?.description ?? "" },
  });

  const isEditing = Boolean(role);

  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const permission of permissions) {
      const list = map.get(permission.module) ?? [];
      list.push(permission);
      map.set(permission.module, list);
    }
    return Array.from(map.entries());
  }, [permissions]);

  function togglePermission(code: string) {
    setPermissionCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  async function onSubmit(values: { name: string; description: string }) {
    const payload = {
      name: values.name,
      description: values.description || null,
      permissionCodes,
    };
    if (isEditing) {
      await apiFetch(`/api/roles/${role!.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    } else {
      await apiFetch("/api/roles", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar rol" : "Nuevo rol"}</DialogTitle>
          <DialogDescription>
            Configura el nombre y los permisos del rol.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role-name">Nombre *</Label>
            <Input id="role-name" placeholder="Nombre del rol" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="role-desc">Descripción</Label>
            <Textarea id="role-desc" placeholder="Descripción del rol" {...register("description")} />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Permisos</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPermissionCodes(permissions.map((p) => p.code))}
              >
                Seleccionar todos
              </Button>
            </div>
            {grouped.map(([module, perms]) => (
              <div key={module} className="rounded-md border p-3">
                <p className="mb-2 text-sm font-semibold">{module}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {perms.map((permission) => (
                    <label
                      key={permission.code}
                      className="flex items-start gap-2 rounded p-1 text-sm hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={permissionCodes.includes(permission.code)}
                        onCheckedChange={() => togglePermission(permission.code)}
                      />
                      <span className="leading-tight">
                        <span className="block font-medium">{permission.code}</span>
                        <span className="block text-xs text-muted-foreground">
                          {permission.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="submit">{isEditing ? "Guardar cambios" : "Crear rol"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RolesClient() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RoleRow | null>(null);

  const { data: roles, isLoading, isError } = useQuery({
    queryKey: ["roles"],
    queryFn: () => apiFetch<RoleRow[]>("/api/roles"),
  });

  const { data: permissions } = useQuery({
    queryKey: ["permissions"],
    queryFn: () => apiFetch<Permission[]>("/api/permissions"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      apiFetch(`/api/roles/${id}/toggle`, {
        method: "POST",
        body: JSON.stringify({ active }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Roles y permisos</h1>
          <p className="text-muted-foreground">
            Configura los roles de la empresa y sus permisos.
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setDialogOpen(true)}>
          <Plus /> Nuevo rol
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="py-8 text-center text-muted-foreground">Cargando…</p>}
          {isError && <p className="py-8 text-center text-destructive">Error al cargar los roles</p>}
          {!isLoading && !isError && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rol</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Permisos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles?.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell className="max-w-md text-muted-foreground">
                      {role.description ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{role.permissionCodes.length} permisos</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={role.active}
                          onCheckedChange={(active) =>
                            toggleMutation.mutate({ id: role.id, active })
                          }
                        />
                        <Badge variant={role.active ? "default" : "secondary"}>
                          {role.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(role);
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
        <RoleFormDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditing(null);
          }}
          role={editing}
          permissions={permissions ?? []}
          onSuccess={() => {
            toast.success(editing ? "Rol actualizado" : "Rol creado");
            setDialogOpen(false);
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: ["roles"] });
          }}
        />
      )}
    </div>
  );
}
