"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PackageSearch, Truck as TruckIcon, UserCheck } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AssignVendorDialog } from "./trucks-client";

const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

interface TruckStockRow {
  id: number;
  quantity: number;
  product: { id: number; name: string; serial: string | null; salePrice: number };
}

interface VendorOption {
  id: number;
  name: string;
  contractNumber: string | null;
  inventory: { productId: number; quantity: number }[];
}

interface AssignmentItem {
  id: number;
  productId: number;
  product: { id: number; name: string; serial: string | null };
  quantity: number;
  returnedQuantity: number;
  remaining: number;
}

interface Assignment {
  id: number;
  status: "ASIGNADO" | "DEVUELTO";
  assignmentDate: string;
  user: { id: number; name: string };
  assigned: { id: number; name: string };
  truck: { id: number; name: string; plate: string | null };
  items: AssignmentItem[];
}

interface StockRequestItem {
  id: number;
  productId: number;
  quantity: number;
  product: { id: number; name: string; serial: string | null };
}

interface StockRequest {
  id: number;
  status: "PENDIENTE" | "PROCESADO";
  requestDate: string;
  notes: string | null;
  truck: { id: number; name: string; plate: string | null };
  user: { id: number; name: string };
  processed: { id: number; name: string } | null;
  items: StockRequestItem[];
}

interface TruckMine {
  truck: { id: number; name: string; plate: string | null } | null;
  inventory: TruckStockRow[];
  vendors: VendorOption[];
  assignments: Assignment[];
  requests: StockRequest[];
}

function DispatchRequestDialog({
  open,
  onOpenChange,
  request,
  inventory,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: StockRequest;
  inventory: TruckStockRow[];
  onSuccess: () => void;
}) {
  const stockMap = new Map(inventory.map((row) => [row.product.id, row.quantity]));
  const [quantities, setQuantities] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const item of request.items) {
      initial[item.productId] = String(item.quantity);
    }
    return initial;
  });
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    const items = request.items
      .map((item) => ({
        productId: item.productId,
        quantity: Number(quantities[item.productId] ?? ""),
      }))
      .filter((i) => Number.isInteger(i.quantity) && i.quantity > 0);
    if (items.length === 0) {
      setFormError("Indica al menos una cantidad para despachar");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await apiFetch(`/api/inventory/vendors/requests/${request.id}/dispatch`, {
        method: "POST",
        body: JSON.stringify({ items, notes: notes.trim() || null }),
      });
      toast.success("Solicitud despachada al vendedor");
      onSuccess();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Error al despachar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setQuantities({});
          setFormError(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Despachar solicitud</DialogTitle>
          <DialogDescription>
            Entrega el stock solicitado a{" "}
            <span className="font-medium">{request.user.name}</span> desde tu camión.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Disponible</TableHead>
                <TableHead className="text-right">Solicitado</TableHead>
                <TableHead className="w-28">Despachar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {request.items.map((item) => {
                const available = stockMap.get(item.productId) ?? 0;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product.name}</TableCell>
                    <TableCell className="text-right">{available}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
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
                );
              })}
            </TableBody>
          </Table>
          <div className="space-y-2">
            <Label htmlFor="dispatch-notes">Notas (opcional)</Label>
            <Textarea
              id="dispatch-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <DialogFooter>
            <Button onClick={submit} disabled={saving}>
              {saving ? "Despachando…" : "Despachar"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TruckProfileClient({
  canAssign,
  operatorName,
}: {
  canAssign: boolean;
  operatorName: string;
}) {
  const queryClient = useQueryClient();
  const [assignOpen, setAssignOpen] = useState(false);
  const [dispatchRequest, setDispatchRequest] = useState<StockRequest | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["truck-mine"],
    queryFn: () => apiFetch<TruckMine>("/api/trucks/mine"),
  });

  const truck = data?.truck ?? null;
  const inventory = data?.inventory ?? [];
  const vendors = data?.vendors ?? [];
  const assignments = data?.assignments ?? [];
  const requests = data?.requests ?? [];
  const totalUnits = inventory.reduce((acc, row) => acc + row.quantity, 0);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["truck-mine"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mi camión · {operatorName}</h1>
          <p className="text-muted-foreground">
            Despacha la mercancía del camión a los vendedores.
          </p>
        </div>
        {canAssign && truck && (
          <Button className="w-full sm:w-auto" onClick={() => setAssignOpen(true)}>
            <UserCheck /> Asignar a vendedor
          </Button>
        )}
      </div>

      {!truck && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <TruckIcon className="size-8 text-muted-foreground" />
            <p className="font-medium">No tienes un camión asignado</p>
            <p className="text-sm text-muted-foreground">
              Pide al administrador que te asigne como conductor de un camión.
            </p>
          </CardContent>
        </Card>
      )}

      {truck && (
        <>
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <TruckIcon className="size-5" /> {truck.name}
              </CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline">{truck.plate ?? "Sin placa"}</Badge>
                <Badge variant="outline">{inventory.length} productos</Badge>
                <Badge variant="outline">{totalUnits} unidades</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading && <p className="py-8 text-center text-muted-foreground">Cargando…</p>}
              {!isLoading && inventory.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">
                  El camión no tiene productos cargados. Espera a que desde la bodega carguen el
                  camión.
                </p>
              )}
              {!isLoading && inventory.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Serial</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.map((row) => (
                      <TableRow key={row.product.id}>
                        <TableCell className="font-medium">{row.product.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.product.serial ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {currency.format(Number(row.product.salePrice))}
                        </TableCell>
                        <TableCell className="text-right font-medium">{row.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="size-5" /> Vendedores con mercancía
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vendors.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No hay vendedores registrados.
                </p>
              )}
              {vendors.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Contrato</TableHead>
                      <TableHead className="text-right">Productos</TableHead>
                      <TableHead className="text-right">Unidades</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendors.map((vendor) => {
                      const units = vendor.inventory.reduce(
                        (acc, item) => acc + item.quantity,
                        0,
                      );
                      return (
                        <TableRow key={vendor.id}>
                          <TableCell className="font-medium">{vendor.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {vendor.contractNumber ?? "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {vendor.inventory.length}
                          </TableCell>
                          <TableCell className="text-right font-medium">{units}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PackageSearch className="size-5" /> Solicitudes de los vendedores
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading && <p className="py-8 text-center text-muted-foreground">Cargando…</p>}
              {!isLoading && requests.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">
                  No hay solicitudes de stock de los vendedores.
                </p>
              )}
              {!isLoading && requests.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Productos</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">#{request.id}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {new Date(request.requestDate).toLocaleDateString("es-CO")}
                        </TableCell>
                        <TableCell>{request.user.name}</TableCell>
                        <TableCell>
                          <div className="flex max-w-md flex-wrap gap-1">
                            {request.items.map((item) => (
                              <Badge key={item.id} variant="outline">
                                {item.product.name} x{item.quantity}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={request.status === "PROCESADO" ? "secondary" : "outline"}
                          >
                            {request.status === "PROCESADO" ? "Despachado" : "Pendiente"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {request.status === "PENDIENTE" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDispatchRequest(request)}
                            >
                              <UserCheck /> Despachar
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
              <CardTitle className="flex items-center gap-2">
                <PackageSearch className="size-5" /> Asignaciones del camión
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading && <p className="py-8 text-center text-muted-foreground">Cargando…</p>}
              {!isLoading && assignments.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">
                  No hay asignaciones registradas para este camión.
                </p>
              )}
              {!isLoading && assignments.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Productos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">#{assignment.id}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {new Date(assignment.assignmentDate).toLocaleDateString("es-CO")}
                        </TableCell>
                        <TableCell>{assignment.user.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant={assignment.status === "DEVUELTO" ? "secondary" : "default"}
                          >
                            {assignment.status === "DEVUELTO" ? "Devuelto" : "Asignado"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex max-w-md flex-wrap gap-1">
                            {assignment.items.map((item) => (
                              <Badge key={item.id} variant="outline">
                                {item.product.name}
                                {item.remaining > 0 && item.remaining < item.quantity
                                  ? ` (${item.remaining})`
                                  : ""}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {canAssign && truck && (
        <AssignVendorDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          truck={{
            id: truck.id,
            name: truck.name,
            plate: truck.plate,
            inventory,
          }}
          vendors={vendors}
          onSuccess={() => {
            toast.success("Productos asignados al vendedor");
            setAssignOpen(false);
            refresh();
          }}
        />
      )}

      {dispatchRequest && (
        <DispatchRequestDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setDispatchRequest(null);
          }}
          request={dispatchRequest}
          inventory={inventory}
          onSuccess={() => {
            setDispatchRequest(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}