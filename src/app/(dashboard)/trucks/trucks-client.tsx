"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Boxes, Pencil, Plus } from "lucide-react";
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

interface UserOption {
  id: number;
  name: string;
  active: boolean;
}

interface TruckRow {
  id: number;
  name: string;
  plate: string | null;
  driverId: number | null;
  driver: { id: number; name: string } | null;
  active: boolean;
  _count: { sales: number; inventory: number };
}

interface Warehouse {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  serial: string | null;
}

const truckSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(80),
  plate: z.string().trim().max(20).optional().or(z.literal("")),
});

type TruckForm = z.infer<typeof truckSchema>;

function TruckFormDialog({
  open,
  onOpenChange,
  truck,
  users,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  truck?: TruckRow;
  users: UserOption[];
  onSuccess: () => void;
}) {
  const [driverId, setDriverId] = useState<string>(
    truck?.driverId ? String(truck.driverId) : "",
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TruckForm>({
    resolver: zodResolver(truckSchema),
    defaultValues: { name: truck?.name ?? "", plate: truck?.plate ?? "" },
  });

  const isEditing = Boolean(truck);

  async function onSubmit(values: TruckForm) {
    const payload = { name: values.name, plate: values.plate || null, driverId: driverId ? Number(driverId) : null };
    if (isEditing) {
      await apiFetch(`/api/trucks/${truck!.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    } else {
      await apiFetch("/api/trucks", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar camión" : "Nuevo camión"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Actualiza los datos del camión." : "Registra un nuevo camión."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" placeholder="Nombre o referencia del camión" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="plate">Placa</Label>
            <Input id="plate" placeholder="ABC-123" {...register("plate")} />
          </div>
          <div className="space-y-2">
            <Label>Conductor</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger>
                <SelectValue placeholder="Sin asignar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin asignar</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={String(user.id)}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit">{isEditing ? "Guardar cambios" : "Crear camión"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LoadTruckDialog({
  open,
  onOpenChange,
  truckId,
  truckName,
  products,
  warehouses,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  truckId: number;
  truckName: string;
  products: Product[];
  warehouses: Warehouse[];
  onSuccess: () => void;
}) {
  const [warehouseId, setWarehouseId] = useState<string>("");
  const nextKey = useRef(2);
  const [items, setItems] = useState<
    { key: number; productId: string; quantity: string }[]
  >([{ key: 1, productId: "", quantity: "" }]);
  const [formError, setFormError] = useState<string | null>(null);

  function updateItem(key: number, patch: Partial<{ productId: string; quantity: string }>) {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  async function onSubmit() {
    const clean = items
      .filter((item) => item.productId && item.quantity)
      .map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
      }));
    if (clean.length === 0 || clean.some((item) => item.quantity <= 0)) {
      setFormError("Agrega al menos un producto con cantidad mayor a 0");
      return;
    }
    setFormError(null);
    await apiFetch(`/api/trucks/${truckId}/load`, {
      method: "POST",
      body: JSON.stringify({
        warehouseId: warehouseId ? Number(warehouseId) : undefined,
        items: clean,
      }),
    });
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cargar camión</DialogTitle>
          <DialogDescription>
            Mueve productos de la bodega al camión <span className="font-medium">{truckName}</span>.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Bodega origen</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger>
                <SelectValue placeholder="Primera bodega activa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Primera bodega activa</SelectItem>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Productos a cargar</Label>
            {items.map((item) => (
              <div key={item.key} className="flex flex-wrap items-center gap-2">
                <Select value={item.productId} onValueChange={(value) => updateItem(item.key, { productId: value })}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={String(product.id)}>
                        {product.name}
                        {product.serial ? ` (${product.serial})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="w-24"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Cant."
                  value={item.quantity}
                  onChange={(event) => updateItem(item.key, { quantity: event.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={items.length === 1}
                  onClick={() => setItems((prev) => prev.filter((i) => i.key !== item.key))}
                >
                  ✕
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setItems((prev) => [
                  ...prev,
                  { key: nextKey.current++, productId: "", quantity: "" },
                ])
              }
            >
              <Plus /> Agregar producto
            </Button>
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <DialogFooter>
            <Button type="submit">Cargar camión</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TrucksClient({
  canCreate,
  canLoad,
}: {
  canCreate: boolean;
  canLoad: boolean;
}) {
  const queryClient = useQueryClient();
  const [formDialog, setFormDialog] = useState<{ open: boolean; truck?: TruckRow } | null>(null);
  const [loadDialog, setLoadDialog] = useState<TruckRow | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["trucks"],
    queryFn: () => apiFetch<TruckRow[]>("/api/trucks"),
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<UserOption[]>("/api/users"),
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: () => apiFetch<Product[]>("/api/products"),
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => apiFetch<Warehouse[]>("/api/warehouses"),
  });

  async function toggle(truck: TruckRow) {
    try {
      await apiFetch(`/api/trucks/${truck.id}/toggle`, {
        method: "POST",
        body: JSON.stringify({ active: !truck.active }),
      });
      queryClient.invalidateQueries({ queryKey: ["trucks"] });
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Camiones</h1>
          <p className="text-muted-foreground">
            Flota de camiones de la empresa activa.
          </p>
        </div>
        {canCreate && (
          <Button className="w-full sm:w-auto" onClick={() => setFormDialog({ open: true })}>
            <Plus /> Nuevo camión
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="py-8 text-center text-muted-foreground">Cargando…</p>}
          {isError && <p className="py-8 text-center text-destructive">Error al cargar los camiones</p>}
          {!isLoading && !isError && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Camíon</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Conductor</TableHead>
                  <TableHead className="text-right">Productos</TableHead>
                  <TableHead className="text-right">Ventas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No hay camiones registrados
                    </TableCell>
                  </TableRow>
                )}
                {data?.map((truck) => (
                  <TableRow key={truck.id}>
                    <TableCell className="font-medium">{truck.name}</TableCell>
                    <TableCell>{truck.plate ?? "—"}</TableCell>
                    <TableCell>{truck.driver?.name ?? "—"}</TableCell>
                    <TableCell className="text-right">{truck._count.inventory}</TableCell>
                    <TableCell className="text-right">{truck._count.sales}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={truck.active} onCheckedChange={() => toggle(truck)} />
                        <Badge variant={truck.active ? "default" : "secondary"}>
                          {truck.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canLoad && (
                          <Button variant="outline" size="sm" onClick={() => setLoadDialog(truck)}>
                            <Boxes /> Cargar
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setFormDialog({ open: true, truck })}
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

      {formDialog && (
        <TruckFormDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setFormDialog(null);
          }}
          truck={formDialog.truck}
          users={(users ?? []).filter((user) => user.active)}
          onSuccess={() => {
            toast.success(formDialog.truck ? "Camión actualizado" : "Camión creado");
            setFormDialog(null);
            queryClient.invalidateQueries({ queryKey: ["trucks"] });
          }}
        />
      )}

      {loadDialog && (
        <LoadTruckDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setLoadDialog(null);
          }}
          truckId={loadDialog.id}
          truckName={loadDialog.name}
          products={products ?? []}
          warehouses={warehouses ?? []}
          onSuccess={() => {
            toast.success("Camión cargado");
            setLoadDialog(null);
            queryClient.invalidateQueries({ queryKey: ["trucks"] });
            queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
          }}
        />
      )}
    </div>
  );
}
