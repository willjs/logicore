"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Pencil, Plus, UserCog } from "lucide-react";
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

interface UserRow {
  id: number;
  name: string;
  email: string;
  active: boolean;
  role: { id: number; name: string } | null;
  createdAt: string;
}

interface Company {
  id: number;
  name: string;
}

interface Role {
  id: number;
  name: string;
}

interface Assignment {
  companyId: number;
  companyName: string;
  companyActive: boolean;
  roleId: number;
  roleName: string;
  active: boolean;
}

const createSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(120),
  email: z.string().email("Correo electrónico inválido").trim().toLowerCase(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  companyId: z.number().int().positive(),
  roleId: z.number().int().positive(),
});

type CreateForm = z.infer<typeof createSchema>;

const editSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es requerido").max(120),
    email: z.string().email("Correo electrónico inválido").trim().toLowerCase(),
    password: z.string().optional().or(z.literal("")),
  })
  .passthrough();

type EditForm = z.infer<typeof editSchema>;

function CreateUserDialog({
  open,
  onOpenChange,
  companies,
  roles,
  activeCompanyId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: Company[];
  roles: Role[];
  activeCompanyId: number;
  onSuccess: () => void;
}) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(activeCompanyId);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { companyId: activeCompanyId },
  });

  async function onSubmit(values: CreateForm) {
    await apiFetch("/api/users", {
      method: "POST",
      body: JSON.stringify({
        name: values.name,
        email: values.email,
        password: values.password,
        assignments: [{ companyId: values.companyId, roleId: values.roleId }],
      }),
    });
    onSuccess();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
          <DialogDescription>
            Crea el usuario y asígnalo a una empresa con un rol.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre completo *</Label>
            <Input id="name" placeholder="Nombre del usuario" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico *</Label>
            <Input id="email" type="email" placeholder="usuario@empresa.com" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña *</Label>
            <Input id="password" type="password" placeholder="Mínimo 6 caracteres" {...register("password")} />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Empresa *</Label>
              <Select
                value={String(selectedCompanyId)}
                onValueChange={(value) => {
                  setValue("companyId", Number(value), { shouldValidate: true });
                  setSelectedCompanyId(Number(value));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={String(company.id)}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rol *</Label>
              <Select
                onValueChange={(value) => setValue("roleId", Number(value), { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={String(role.id)}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Crear usuario</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserRow | null;
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      password: "",
    },
  });

  async function onSubmit(values: EditForm) {
    if (!user) return;
    const payload: Record<string, unknown> = {
      name: values.name,
      email: values.email,
    };
    if (values.password) payload.password = values.password;
    await apiFetch(`/api/users/${user.id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
          <DialogDescription>Actualiza los datos del usuario.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nombre completo</Label>
            <Input id="edit-name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">Correo electrónico</Label>
            <Input id="edit-email" type="email" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-password">Nueva contraseña (opcional)</Label>
            <Input id="edit-password" type="password" placeholder="Dejar vacío para no cambiar" {...register("password")} />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit">Guardar cambios</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AssignmentsDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserRow | null;
}) {
  const queryClient = useQueryClient();
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [roleId, setRoleId] = useState<number | null>(null);

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["assignments", user?.id],
    queryFn: () => apiFetch<Assignment[]>(`/api/users/${user!.id}/assignments`),
    enabled: Boolean(user),
  });

  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: () => apiFetch<Company[]>("/api/companies"),
  });

  const { data: roles } = useQuery({
    queryKey: ["company-roles", companyId],
    queryFn: () => apiFetch<Role[]>(`/api/companies/${companyId}/roles`),
    enabled: Boolean(companyId),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/users/${user!.id}/assignments`, {
        method: "POST",
        body: JSON.stringify({ companyId, roleId }),
      }),
    onSuccess: () => {
      toast.success("Asignación agregada");
      setCompanyId(null);
      setRoleId(null);
      queryClient.invalidateQueries({ queryKey: ["assignments", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeMutation = useMutation({
    mutationFn: (targetCompanyId: number) =>
      apiFetch(`/api/users/${user!.id}/assignments/${targetCompanyId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Asignación eliminada");
      queryClient.invalidateQueries({ queryKey: ["assignments", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setCompanyId(null);
          setRoleId(null);
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Asignaciones de {user?.name}</DialogTitle>
          <DialogDescription>
            Empresas y roles a los que pertenece el usuario.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
          {!isLoading && assignments?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              El usuario no tiene empresas asignadas.
            </p>
          )}
          {assignments?.map((assignment) => (
            <div
              key={assignment.companyId}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div>
                <p className="text-sm font-medium">{assignment.companyName}</p>
                <p className="text-xs text-muted-foreground">
                  Rol: {assignment.roleName}
                  {!assignment.companyActive && " · Empresa inactiva"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => removeMutation.mutate(assignment.companyId)}
              >
                Quitar
              </Button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Empresa</Label>
            <Select
              value={companyId ? String(companyId) : ""}
              onValueChange={(value) => setCompanyId(Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {companies?.map((company) => (
                  <SelectItem key={company.id} value={String(company.id)}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select
              value={roleId ? String(roleId) : ""}
              onValueChange={(value) => setRoleId(Number(value))}
              disabled={!companyId}
            >
              <SelectTrigger>
                <SelectValue placeholder={companyId ? "Seleccionar" : "Elige empresa"} />
              </SelectTrigger>
              <SelectContent>
                {roles?.map((role) => (
                  <SelectItem key={role.id} value={String(role.id)}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            disabled={!companyId || !roleId || addMutation.isPending}
            onClick={() => addMutation.mutate()}
          >
            {addMutation.isPending && <Loader2 className="animate-spin" />}
            Agregar asignación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UsersClient({ activeCompanyId }: { activeCompanyId: number }) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [assigning, setAssigning] = useState<UserRow | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<UserRow[]>("/api/users"),
  });

  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: () => apiFetch<Company[]>("/api/companies"),
  });

  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => apiFetch<Role[]>("/api/roles"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      apiFetch(`/api/users/${id}/toggle`, {
        method: "POST",
        body: JSON.stringify({ active }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground">
            Administra los usuarios de la empresa activa.
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
          <Plus /> Nuevo usuario
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="py-8 text-center text-muted-foreground">Cargando…</p>}
          {isError && <p className="py-8 text-center text-destructive">Error al cargar los usuarios</p>}
          {!isLoading && !isError && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No hay usuarios en esta empresa
                    </TableCell>
                  </TableRow>
                )}
                {data?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.role ? (
                        <Badge variant="secondary">{user.role.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">Sin rol</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={user.active}
                          onCheckedChange={(active) =>
                            toggleMutation.mutate({ id: user.id, active })
                          }
                        />
                        <Badge variant={user.active ? "default" : "secondary"}>
                          {user.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Asignaciones"
                          onClick={() => {
                            setAssigning(user);
                            setAssignOpen(true);
                          }}
                        >
                          <UserCog />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(user);
                            setEditOpen(true);
                          }}
                        >
                          <Pencil />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {createOpen && (
        <CreateUserDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          companies={companies ?? []}
          roles={roles ?? []}
          activeCompanyId={activeCompanyId}
          onSuccess={() => {
            toast.success("Usuario creado");
            setCreateOpen(false);
            queryClient.invalidateQueries({ queryKey: ["users"] });
          }}
        />
      )}

      {editOpen && editing && (
        <EditUserDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          user={editing}
          onSuccess={() => {
            toast.success("Usuario actualizado");
            setEditOpen(false);
            queryClient.invalidateQueries({ queryKey: ["users"] });
          }}
        />
      )}

      {assignOpen && assigning && (
        <AssignmentsDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          user={assigning}
        />
      )}
    </div>
  );
}
