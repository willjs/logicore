"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Shield, Users } from "lucide-react";
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

const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

interface Company {
  id: number;
  name: string;
  nit: string | null;
  email: string | null;
  active: boolean;
  userCount: number;
}

function CompanyFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [nit, setNit] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit() {
    if (!name.trim()) {
      setFormError("El nombre de la empresa es requerido");
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      await apiFetch("/api/superadmin/companies", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          nit: nit.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
        }),
      });
      toast.success("Empresa creada correctamente");
      setName("");
      setNit("");
      setEmail("");
      setPhone("");
      onSuccess();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Error al crear la empresa");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva empresa</DialogTitle>
          <DialogDescription>
            Crea una nueva empresa en el sistema. Se generarán los roles por defecto.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Nombre *</Label>
            <Input
              id="company-name"
              placeholder="Nombre de la empresa"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company-nit">NIT</Label>
              <Input
                id="company-nit"
                placeholder="900000000-1"
                value={nit}
                onChange={(e) => setNit(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-email">Email</Label>
              <Input
                id="company-email"
                type="email"
                placeholder="empresa@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-phone">Teléfono</Label>
            <Input
              id="company-phone"
              placeholder="300 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <DialogFooter>
            <Button onClick={onSubmit} disabled={saving}>
              {saving ? "Creando…" : "Crear empresa"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AdminFormDialog({
  open,
  onOpenChange,
  companyId,
  companyName,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: number;
  companyName: string;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit() {
    if (!name.trim()) {
      setFormError("El nombre es requerido");
      return;
    }
    if (!email.trim()) {
      setFormError("El email es requerido");
      return;
    }
    if (!password || password.length < 6) {
      setFormError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      await apiFetch(`/api/superadmin/companies/${companyId}/admin`, {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });
      toast.success(`Admin creado para ${companyName}`);
      setName("");
      setEmail("");
      setPassword("");
      onSuccess();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Error al crear el admin");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear admin de empresa</DialogTitle>
          <DialogDescription>
            Crea el usuario administrador para <span className="font-medium">{companyName}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-name">Nombre *</Label>
            <Input
              id="admin-name"
              placeholder="Nombre del administrador"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email *</Label>
            <Input
              id="admin-email"
              type="email"
              placeholder="admin@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Contraseña *</Label>
            <Input
              id="admin-password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <DialogFooter>
            <Button onClick={onSubmit} disabled={saving}>
              {saving ? "Creando…" : "Crear admin"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SuperAdminClient() {
  const queryClient = useQueryClient();
  const [companyOpen, setCompanyOpen] = useState(false);
  const [adminTarget, setAdminTarget] = useState<{ id: number; name: string } | null>(null);

  const { data: companies, isLoading } = useQuery({
    queryKey: ["superadmin-companies"],
    queryFn: () => apiFetch<Company[]>("/api/superadmin/companies"),
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["superadmin-companies"] });
  }

  const allCompanies = companies ?? [];
  const totalUsers = allCompanies.reduce((sum, c) => sum + c.userCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Panel de administración</h1>
          <p className="text-muted-foreground">
            Gestión de empresas y usuarios del sistema.
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setCompanyOpen(true)}>
          <Plus /> Nueva empresa
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{allCompanies.length}</p>
                <p className="text-sm text-muted-foreground">Empresas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalUsers}</p>
                <p className="text-sm text-muted-foreground">Usuarios</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-green-100">
                <Shield className="size-5 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{allCompanies.filter((c) => c.active).length}</p>
                <p className="text-sm text-muted-foreground">Activas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Empresas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="py-8 text-center text-muted-foreground">Cargando…</p>
          )}
          {!isLoading && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>NIT</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Usuarios</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allCompanies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No hay empresas registradas
                    </TableCell>
                  </TableRow>
                )}
                {allCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {company.nit ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {company.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">{company.userCount}</TableCell>
                    <TableCell>
                      <Badge variant={company.active ? "default" : "secondary"}>
                        {company.active ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAdminTarget({ id: company.id, name: company.name })}
                      >
                        <Shield className="mr-1 size-3" />
                        Crear admin
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {companyOpen && (
        <CompanyFormDialog
          open={true}
          onOpenChange={setCompanyOpen}
          onSuccess={() => {
            setCompanyOpen(false);
            refresh();
          }}
        />
      )}

      {adminTarget && (
        <AdminFormDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setAdminTarget(null);
          }}
          companyId={adminTarget.id}
          companyName={adminTarget.name}
          onSuccess={() => {
            setAdminTarget(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
