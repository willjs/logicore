"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, ExternalLink, HandCoins, Search, User, X } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
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

import { CustomerAvatar, type Customer } from "../customers/customers-client";

type PaymentMethod = "EFECTIVO" | "TRANSFERENCIA";

const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

interface CustomerDetailData {
  customer: Customer;
  pendingBalance: number;
  cartera: {
    id: number;
    saleNumber: string;
    saleDate: string;
    total: number;
    status: string;
    paid: number;
    balance: number;
    truck: { id: number; name: string } | null;
  }[];
}

interface CreatedPayment {
  id: number;
  saleId: number;
  amount: number;
  kind: "PAGO" | "ABONO";
}

async function dataUrlToFile(dataUrl: string, filename: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: "image/png" });
}

function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [hasStroke, setHasStroke] = useState(false);

  function getPos(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    canvas.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(getPos(event).x, getPos(event).y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
  }

  function onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current!;
    const pos = getPos(event);
    const ctx = canvas.getContext("2d")!;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasStroke(true);
    onChange(canvas.toDataURL("image/png"));
  }

  function stop() {
    drawingRef.current = false;
  }

  function clear() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    drawingRef.current = false;
    setHasStroke(false);
    onChange(null);
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-white">
        <canvas
          ref={canvasRef}
          width={560}
          height={200}
          className="h-40 w-full touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={stop}
          onPointerLeave={stop}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {hasStroke ? "Firma capturada" : "Firme con el dedo o el mouse"}
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={clear}>
          Limpiar
        </Button>
      </div>
    </div>
  );
}

function PaymentDialog({
  open,
  onOpenChange,
  customer,
  pendingBalance,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  pendingBalance: number;
  onSuccess: () => void;
}) {
  const [method, setMethod] = useState<"" | PaymentMethod>("");
  const [received, setReceived] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const receivedValue = Number(received || 0);
  const transferValue = Number(transferAmount || 0);
  const amount =
    method === "TRANSFERENCIA"
      ? transferValue > 0
        ? Math.min(transferValue, pendingBalance)
        : pendingBalance
      : Math.min(receivedValue, pendingBalance);
  const change = receivedValue - amount;

  function reset() {
    setMethod("");
    setReceived("");
    setTransferAmount("");
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceiptFile(null);
    setReceiptPreview(null);
    setSignature(null);
    setNotes("");
    setFormError(null);
    setSubmitting(false);
  }

  function onReceiptChange(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Formato no permitido (JPG, PNG o WebP)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("El archivo no puede superar 10 MB");
      return;
    }
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
  }

  async function submit() {
    if (!method) {
      setFormError("Selecciona el método de pago");
      return;
    }
    if (method === "TRANSFERENCIA") {
      if (!receiptFile) {
        setFormError("Adjunta la captura de la transferencia (obligatoria)");
        return;
      }
      if (transferAmount && transferValue <= 0) {
        setFormError("El valor de la transferencia debe ser mayor a 0");
        return;
      }
    }
    if (method === "EFECTIVO") {
      if (!Number.isFinite(receivedValue) || receivedValue <= 0) {
        setFormError("Ingresa el monto recibido");
        return;
      }
      if (!signature) {
        setFormError("Captura la firma del cliente");
        return;
      }
    }
    setFormError(null);
    setSubmitting(true);
    let result: { payments: CreatedPayment[] };
    try {
      result = await apiFetch<{ payments: CreatedPayment[] }>("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          customerId: customer.id,
          amount,
          method,
          received: method === "EFECTIVO" ? receivedValue : undefined,
          change: method === "EFECTIVO" && receivedValue > amount ? change : undefined,
          notes: notes.trim() || null,
        }),
      });
    } catch (error) {
      setFormError((error as Error).message);
      toast.error((error as Error).message);
      setSubmitting(false);
      return;
    }

    toast.success("Pago registrado");
    onSuccess();

    for (const payment of result.payments) {
      if (method === "TRANSFERENCIA" && receiptFile) {
        const form = new FormData();
        form.append("file", receiptFile);
        apiFetch(
          `/api/sales/${payment.saleId}/payments/${payment.id}/attachment?kind=EVIDENCIA`,
          { method: "POST", body: form },
        ).catch(() => {});
      }
      if (method === "EFECTIVO" && signature) {
        dataUrlToFile(signature, "firma.png")
          .then((file) => {
            const form = new FormData();
            form.append("file", file);
            return apiFetch(
              `/api/sales/${payment.saleId}/payments/${payment.id}/attachment?kind=FIRMA`,
              { method: "POST", body: form },
            );
          })
          .catch(() => {});
      }
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset();
          onOpenChange(false);
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            Cobro de saldos pendientes para {customer.name} {customer.lastname ?? ""}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3">
            <span className="text-sm text-muted-foreground">Saldo pendiente</span>
            <span className="text-lg font-bold">{currency.format(pendingBalance)}</span>
          </div>

          <div className="space-y-2">
            <Label>Método de pago</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMethod("TRANSFERENCIA")}
                className={`flex items-center gap-2 rounded-md border p-3 text-left ${
                  method === "TRANSFERENCIA" ? "border-primary bg-primary/5" : ""
                }`}
              >
                <Camera className="size-5" />
                <div>
                  <p className="text-sm font-medium">Transferencia</p>
                  <p className="text-xs text-muted-foreground">
                    Pago del saldo · captura obligatoria
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMethod("EFECTIVO")}
                className={`flex items-center gap-2 rounded-md border p-3 text-left ${
                  method === "EFECTIVO" ? "border-primary bg-primary/5" : ""
                }`}
              >
                <User className="size-5" />
                <div>
                  <p className="text-sm font-medium">Efectivo</p>
                  <p className="text-xs text-muted-foreground">
                    Monto y cambio · firma del cliente
                  </p>
                </div>
              </button>
            </div>
          </div>

          {method === "TRANSFERENCIA" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="transfer-amount">Valor a pagar *</Label>
                <Input
                  id="transfer-amount"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder={currency.format(pendingBalance)}
                  value={transferAmount}
                  onChange={(event) => setTransferAmount(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Deja vacío para pagar el saldo completo ({currency.format(pendingBalance)})
                </p>
                <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm font-medium">
                  {amount <= 0
                    ? "—"
                    : amount >= pendingBalance
                      ? "Pago completo"
                      : `Abono · falta ${currency.format(pendingBalance - amount)}`}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Captura de la transferencia *</Label>
                {receiptPreview ? (
                  <div className="relative overflow-hidden rounded-lg border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={receiptPreview}
                      alt="Captura de transferencia"
                      className="max-h-56 w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (receiptPreview) URL.revokeObjectURL(receiptPreview);
                        setReceiptFile(null);
                        setReceiptPreview(null);
                      }}
                      className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-destructive text-white"
                      title="Quitar"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    onChange={(event) => onReceiptChange(event.target.files?.[0])}
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Toma una foto del comprobante con la cámara (JPG, PNG o WebP · máx. 10 MB)
                </p>
              </div>
            </div>
          )}

          {method === "EFECTIVO" && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="received">Monto recibido *</Label>
                  <Input
                    id="received"
                    type="number"
                    min="0"
                    step="100"
                    placeholder="0"
                    value={received}
                    onChange={(event) => setReceived(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cambio</Label>
                  <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm">
                    {receivedValue > 0 ? currency.format(change) : "—"}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm font-medium">
                    {receivedValue <= 0
                      ? "—"
                      : receivedValue >= pendingBalance
                        ? "Pago completo"
                        : `Abono · falta ${currency.format(pendingBalance - receivedValue)}`}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Firma del cliente *</Label>
                <SignaturePad onChange={setSignature} />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Input
              id="notes"
              placeholder="Observaciones del pago"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <DialogFooter>
            <Button type="button" onClick={submit} disabled={submitting}>
              {submitting ? "Registrando…" : "Registrar pago"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PaymentsClient({ canPay }: { canPay: boolean }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["customer-detail", selected?.id],
    queryFn: () => apiFetch<CustomerDetailData>(`/api/customers/${selected!.id}`),
    enabled: Boolean(selected),
  });

  const pendingBalance = detail?.pendingBalance ?? 0;

  async function doSearch() {
    const q = search.trim();
    if (!q) return;
    setSearching(true);
    setSearched(true);
    try {
      const customers = await apiFetch<Customer[]>(
        `/api/customers?search=${encodeURIComponent(q)}`,
      );
      setResults(customers);
    } catch (error) {
      toast.error((error as Error).message);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pagos pendientes</h1>
        <p className="text-muted-foreground">
          Cobra saldos pendientes por documento: efectivo con firma o transferencia con captura.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por cédula, nombre o teléfono…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    doSearch();
                  }
                }}
              />
            </div>
            <Button type="button" variant="outline" onClick={doSearch} disabled={searching}>
              {searching ? "Buscando…" : "Buscar"}
            </Button>
          </div>

          {searched && !searching && (
            <div className="space-y-2">
              {results.length === 0 ? (
                <p className="rounded-md border p-4 text-center text-sm text-muted-foreground">
                  Sin clientes para ese documento
                </p>
              ) : (
                results.map((customer) => (
                  <div
                    key={customer.id}
                    className={`flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center ${
                      selected?.id === customer.id ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <CustomerAvatar customer={customer} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {customer.name} {customer.lastname ?? ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {customer.identificationType} · {customer.identification}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setSelected(customer);
                        setResults([]);
                        setSearched(false);
                        setSearch("");
                      }}
                    >
                      {selected?.id === customer.id ? (
                        <>
                          <Check /> Seleccionado
                        </>
                      ) : (
                        "Seleccionar"
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <CustomerAvatar customer={selected} />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold">
                  {selected.name} {selected.lastname ?? ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selected.identificationType} · {selected.identification}
                </p>
                {(selected.address || selected.phone || selected.email) && (
                  <p className="text-sm text-muted-foreground">
                    {selected.address ?? ""}
                    {selected.address && selected.phone ? " · " : ""}
                    {selected.phone ?? ""}
                    {selected.phone && selected.email ? " · " : ""}
                    {selected.email ?? ""}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Saldo pendiente</p>
                <p
                  className={`text-2xl font-bold ${
                    pendingBalance > 0 ? "text-destructive" : "text-green-700"
                  }`}
                >
                  {currency.format(pendingBalance)}
                </p>
              </div>
            </div>

            {detailLoading ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Cargando cartera…</p>
            ) : (
              detail && detail.cartera.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Saldos pendientes por venta</p>
                  {detail.cartera
                    .filter((sale) => sale.balance > 0)
                    .map((sale) => (
                      <div
                        key={sale.id}
                        className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
                      >
                        <span className="font-medium">{sale.saleNumber}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(sale.saleDate).toLocaleDateString("es-CO")}
                        </span>
                        {sale.truck && (
                          <span className="text-xs text-muted-foreground">
                            <ExternalLink className="mr-1 inline size-3" />
                            {sale.truck.name}
                          </span>
                        )}
                        <span className="ml-auto font-semibold text-destructive">
                          {currency.format(sale.balance)}
                        </span>
                      </div>
                    ))}
                </div>
              )
            )}

            {canPay && (
              <div className="flex justify-end">
                <Button onClick={() => setPayOpen(true)} disabled={pendingBalance <= 0}>
                  <HandCoins /> Registrar pago
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selected && payOpen && (
        <PaymentDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setPayOpen(false);
          }}
          customer={selected}
          pendingBalance={pendingBalance}
          onSuccess={() => {
            toast.success("Pago registrado");
            setPayOpen(false);
            queryClient.invalidateQueries({ queryKey: ["customer-detail", selected.id] });
            queryClient.invalidateQueries({ queryKey: ["sales"] });
            queryClient.invalidateQueries({ queryKey: ["sale"] });
          }}
        />
      )}
    </div>
  );
}
