"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
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

interface Product {
  id: number;
  name: string;
  salePrice: number | null;
}

interface Warehouse {
  id: number;
  name: string;
}

interface Truck {
  id: number;
  name: string;
  plate: string | null;
  driver: { id: number; name: string } | null;
}

interface StockItem {
  productId: number;
  quantity: number;
}

interface TransferItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  returnedQuantity: number;
  remaining: number;
}

interface Transfer {
  id: number;
  status: "SIN_REINTEGRO" | "PARCIAL" | "REINTEGRADO";
  transferDate: string;
  warehouse: { id: number; name: string };
  truck: { id: number; name: string; plate: string | null };
  user: { id: number; name: string };
  items: TransferItem[];
}

const STATUS_LABELS: Record<Transfer["status"], string> = {
  SIN_REINTEGRO: "Sin reintegrar",
  PARCIAL: "Parcial",
  REINTEGRADO: "Reintegrado",
};

const STATUS_VARIANT: Record<Transfer["status"], "outline" | "secondary" | "default"> = {
  SIN_REINTEGRO: "outline",
  PARCIAL: "secondary",
  REINTEGRADO: "default",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });

interface TransferFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trucks: Truck[];
  warehouses: Warehouse[];
  products: Product[];
  onSuccess: () => void;
}

function TransferFormDialog({
  open,
  onOpenChange,
  trucks,
  warehouses,
  products,
  onSuccess,
}: TransferFormDialogProps) {
  const [truckId, setTruckId] = useState<string>("");
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [lines, setLines] = useState<{ productId: string; quantity: string }[]>([
    { productId: "", quantity: "" },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: stock } = useQuery({
    queryKey: ["warehouse-stock", warehouseId],
    queryFn: () =>
      apiFetch<StockItem[]>(`/api/inventory/stock${warehouseId ? `?warehouseId=${warehouseId}` : ""}`),
    enabled: open && !!warehouseId,
  });

  const stockMap = new Map((stock ?? []).map((s) => [s.productId, s.quantity]));

  function addLine() {
    setLines((prev) => [...prev, { productId: "", quantity: "" }]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLine(index: number, field: "productId" | "quantity", value: string) {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    );
  }

  async function onSubmit() {
    if (!truckId) {
      setFormError("Selecciona un camión");
      return;
    }
    if (!warehouseId) {
      setFormError("Selecciona una bodega de origen");
      return;
    }
    const items = lines
      .map((l) => ({ productId: Number(l.productId), quantity: Number(l.quantity) }))
      .filter((i) => i.productId > 0 && Number.isFinite(i.quantity) && i.quantity > 0);
    if (items.length === 0) {
      setFormError("Agrega al menos un producto con cantidad válida");
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      await apiFetch("/api/inventory/transfers", {
        method: "POST",
        body: JSON.stringify({
          truckId: Number(truckId),
          warehouseId: Number(warehouseId),
          items,
        }),
      });
      toast.success("Traslado registrado correctamente");
      setTruckId("");
      setWarehouseId("");
      setLines([{ productId: "", quantity: "" }]);
      onSuccess();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Error al registrar el traslado");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo traslado</DialogTitle>
          <DialogDescription>
            Carga productos desde la bodega hacia un camión.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Camión *</Label>
              <Select value={truckId} onValueChange={setTruckId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un camión" />
                </SelectTrigger>
                <SelectContent>
                  {trucks.map((truck) => (
                    <SelectItem key={truck.id} value={String(truck.id)}>
                      {truck.name}
                      {truck.plate ? ` (${truck.plate})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bodega de origen *</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una bodega" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Productos</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="mr-1 size-3" />
                Agregar
              </Button>
            </div>
            <div className="space-y-2">
              {lines.map((line, index) => {
                const totalStock = line.productId ? (stockMap.get(Number(line.productId)) ?? 0) : 0;
                const usedInOtherLines = lines.reduce((sum, l, i) => {
                  if (i === index) return sum;
                  if (String(l.productId) === String(line.productId)) {
                    return sum + (Number(l.quantity) || 0);
                  }
                  return sum;
                }, 0);
                const maxQty = Math.max(0, totalStock - usedInOtherLines);
                return (
                  <div key={index} className="flex gap-2">
                    <Select
                      value={line.productId}
                      onValueChange={(v) => updateLine(index, "productId", v)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      max={maxQty || undefined}
                      placeholder="Cant."
                      className="w-24"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, "quantity", e.target.value)}
                    />
                    {line.productId && totalStock > 0 && (
                      <span className="flex items-center text-xs text-muted-foreground whitespace-nowrap">
                        Disp: {maxQty}
                      </span>
                    )}
                    {lines.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive"
                        onClick={() => removeLine(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <DialogFooter>
            <Button onClick={onSubmit} disabled={saving}>
              {saving ? "Guardando…" : "Registrar traslado"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TransfersClient({ canCreate }: { canCreate: boolean }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: transfers, isLoading } = useQuery({
    queryKey: ["transfers"],
    queryFn: () => apiFetch<Transfer[]>("/api/inventory/transfers"),
  });

  const { data: trucks } = useQuery({
    queryKey: ["trucks"],
    queryFn: () => apiFetch<Truck[]>("/api/trucks"),
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => apiFetch<Warehouse[]>("/api/warehouses"),
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: () => apiFetch<Product[]>("/api/products"),
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["transfers"] });
  }

  const allTransfers = transfers ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Traslados</h1>
          <p className="text-muted-foreground">
            Traslados de productos desde la bodega hacia los camiones.
          </p>
        </div>
        {canCreate && (
          <Button className="w-full sm:w-auto" onClick={() => setOpen(true)}>
            <Plus /> Nuevo traslado
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de traslados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="py-8 text-center text-muted-foreground">Cargando…</p>
          )}
          {!isLoading && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Camión</TableHead>
                  <TableHead>Bodega</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Usuario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allTransfers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Sin traslados registrados
                    </TableCell>
                  </TableRow>
                )}
                {allTransfers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">#{t.id}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDate(t.transferDate)}
                    </TableCell>
                    <TableCell>
                      {t.truck.name}
                      {t.truck.plate ? (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({t.truck.plate})
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>{t.warehouse.name}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[t.status]}>
                        {STATUS_LABELS[t.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {t.items.map((item) => (
                          <Badge key={item.id} variant="outline">
                            {item.productName} × {item.quantity}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{t.user.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {open && (
        <TransferFormDialog
          open={true}
          onOpenChange={setOpen}
          trucks={trucks ?? []}
          warehouses={warehouses ?? []}
          products={products ?? []}
          onSuccess={() => {
            setOpen(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}
