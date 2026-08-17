"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Undo2 } from "lucide-react";
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
  notes: string | null;
  warehouse: { id: number; name: string };
  truck: { id: number; name: string; plate: string | null };
  user: { id: number; name: string };
  items: TransferItem[];
}

interface TruckReturn {
  id: number;
  returnDate: string;
  notes: string | null;
  truck: { id: number; name: string; plate: string | null };
  warehouse: { id: number; name: string };
  user: { id: number; name: string };
  items: { productId: number; quantity: number; product: { id: number; name: string } }[];
}

interface Warehouse {
  id: number;
  name: string;
}

const STATUS_LABELS: Record<Transfer["status"], string> = {
  SIN_REINTEGRO: "Sin reintegrar",
  PARCIAL: "Parcial",
  REINTEGRADO: "Reintegrado",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });

function ReturnFormDialog({
  open,
  onOpenChange,
  transfers,
  warehouses,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transfers: Transfer[];
  warehouses: Warehouse[];
  onSuccess: () => void;
}) {
  const available = transfers.filter((t) =>
    t.items.some((i) => i.remaining > 0),
  );
  const [transferId, setTransferId] = useState<string>("");
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selected = available.find((t) => String(t.id) === transferId);

  function selectTransfer(id: string) {
    setTransferId(id);
    const transfer = available.find((t) => String(t.id) === id);
    setWarehouseId(transfer ? String(transfer.warehouse.id) : "");
    const next: Record<number, string> = {};
    for (const item of transfer?.items ?? []) {
      if (item.remaining > 0) next[item.productId] = String(item.remaining);
    }
    setQuantities(next);
  }

  async function onSubmit() {
    if (!selected) {
      setFormError("Selecciona un traslado");
      return;
    }
    if (!warehouseId) {
      setFormError("Selecciona la bodega de destino");
      return;
    }
    const items = selected.items
      .filter((i) => i.remaining > 0)
      .map((i) => {
        const value = Number(quantities[i.productId] ?? "");
        return { productId: i.productId, quantity: value };
      })
      .filter((i) => Number.isFinite(i.quantity) && i.quantity > 0);
    if (items.length === 0) {
      setFormError("Ingresa al menos una cantidad válida");
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      await apiFetch("/api/inventory/returns", {
        method: "POST",
        body: JSON.stringify({
          transferId: selected.id,
          warehouseId: Number(warehouseId),
          notes: notes.trim() || null,
          items,
        }),
      });
      toast.success("Reintegro registrado");
      onSuccess();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Error al registrar el reintegro");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo reintegro</DialogTitle>
          <DialogDescription>
            Devuelve mercancía del camión a una bodega.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Traslado *</Label>
            <Select value={transferId} onValueChange={selectTransfer}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un traslado" />
              </SelectTrigger>
              <SelectContent>
                {available.map((transfer) => (
                  <SelectItem key={transfer.id} value={String(transfer.id)}>
                    #{transfer.id} · {transfer.truck.name} · {transfer.warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Bodega de destino *</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una bodega" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selected && (
            <div className="space-y-2">
              <Label>Productos a reintegrar</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Disponible</TableHead>
                    <TableHead className="w-28">Cantidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selected.items
                    .filter((i) => i.remaining > 0)
                    .map((item) => (
                      <TableRow key={`${item.productId}-${item.id}`}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-right">{item.remaining}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            max={item.remaining}
                            value={quantities[item.productId] ?? ""}
                            onChange={(event) =>
                              setQuantities((prev) => ({
                                ...prev,
                                [item.productId]: event.target.value,
                              }))
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="return-notes">Notas</Label>
            <Input
              id="return-notes"
              placeholder="Observación del reintegro"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <DialogFooter>
            <Button onClick={onSubmit} disabled={saving}>
              {saving ? "Guardando…" : "Registrar reintegro"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ReturnsClient({ canCreate }: { canCreate: boolean }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: transfers, isLoading: transfersLoading } = useQuery({
    queryKey: ["transfers"],
    queryFn: () => apiFetch<Transfer[]>("/api/inventory/transfers"),
  });
  const { data: returns, isLoading: returnsLoading } = useQuery({
    queryKey: ["returns"],
    queryFn: () => apiFetch<TruckReturn[]>("/api/inventory/returns"),
  });

  const pending = (transfers ?? []).filter((t) =>
    t.items.some((i) => i.remaining > 0),
  );

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["transfers"] });
    queryClient.invalidateQueries({ queryKey: ["returns"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reintegros</h1>
          <p className="text-muted-foreground">
            Devolución de mercancía del camión a la bodega.
          </p>
        </div>
        {canCreate && (
          <Button className="w-full sm:w-auto" onClick={() => setOpen(true)}>
            <Undo2 /> Nuevo reintegro
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Traslados pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          {transfersLoading && (
            <p className="py-8 text-center text-muted-foreground">Cargando…</p>
          )}
          {!transfersLoading && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Camion</TableHead>
                  <TableHead>Bodega</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No hay traslados con mercancía pendiente de reintegrar
                    </TableCell>
                  </TableRow>
                )}
                {pending.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell className="font-medium">#{transfer.id}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDate(transfer.transferDate)}
                    </TableCell>
                    <TableCell>{transfer.truck.name}</TableCell>
                    <TableCell>{transfer.warehouse.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          transfer.status === "PARCIAL"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {STATUS_LABELS[transfer.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canCreate && (
                        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
                          <Undo2 /> Reintegrar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reintegros registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {returnsLoading && (
            <p className="py-8 text-center text-muted-foreground">Cargando…</p>
          )}
          {!returnsLoading && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Camion</TableHead>
                  <TableHead>Bodega</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(returns ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Sin reintegros registrados
                    </TableCell>
                  </TableRow>
                )}
                {(returns ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDate(r.returnDate)}
                    </TableCell>
                    <TableCell>{r.truck.name}</TableCell>
                    <TableCell>{r.warehouse.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {r.items.map((item) => (
                          <Badge key={item.productId} variant="outline">
                            {item.product.name} × {item.quantity}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{r.user.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.notes ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {open && (
        <ReturnFormDialog
          open={true}
          onOpenChange={setOpen}
          transfers={transfers ?? []}
          warehouses={(transfers ?? [])
            .map((t) => t.warehouse)
            .filter((w, index, arr) => arr.findIndex((x) => x.id === w.id) === index)}
          onSuccess={() => {
            setOpen(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}
