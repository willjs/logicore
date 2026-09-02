"use client";

import { useMemo, useState, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  PackageSearch,
  Plus,
  Search,
  Trash2,
  Undo2,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/client/api";
import {
  WhatsAppShareDialog,
  type SaleShareData,
} from "@/components/sales/sale-share-dialog";
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
import {
  CustomerAvatar,
  CustomerFormDialog,
  type Customer,
} from "../customers/customers-client";

type SaleStatus = "PAGADO" | "ABONO" | "PENDIENTE";
type PaymentMethod = "EFECTIVO" | "TRANSFERENCIA";

const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

interface VendorStockRow {
  productId: number;
  quantity: number;
  product: { id: number; name: string; serial: string | null; salePrice: number };
}

interface VendorAssignmentItem {
  id: number;
  productId: number;
  product: { id: number; name: string; serial: string | null };
  quantity: number;
  returnedQuantity: number;
  remaining: number;
}

interface VendorAssignment {
  id: number;
  status: "ASIGNADO" | "DEVUELTO";
  assignmentDate: string;
  truck: { id: number; name: string; plate: string | null };
  assigned: { id: number; name: string };
  items: VendorAssignmentItem[];
}

interface CustomerDetailData {
  customer: Customer;
  pendingBalance: number;
}

interface SaleItemDraft {
  productId: number;
  name: string;
  serial: string | null;
  quantity: number;
  unitPrice: number;
  available: number;
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

function ProductPickerDialog({
  open,
  onOpenChange,
  stock,
  added,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stock: VendorStockRow[];
  added: Map<number, number>;
  onAdd: (item: SaleItemDraft) => void;
}) {
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<number, string>>({});

  const filtered = stock.filter((row) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      row.product.name.toLowerCase().includes(q) ||
      (row.product.serial ?? "").toLowerCase().includes(q)
    );
  });

  function remaining(row: VendorStockRow) {
    return row.quantity - (added.get(row.productId) ?? 0);
  }

  function add(row: VendorStockRow) {
    const available = remaining(row);
    if (available <= 0) {
      toast.error(`"${row.product.name}" ya está agotado de tu stock`);
      return;
    }
    const raw = Math.floor(Number(quantities[row.productId] ?? "1"));
    const qty = Number.isFinite(raw) && raw > 0 ? raw : 1;
    if (qty > available) {
      toast.error(`Solo tienes ${available} disponibles de "${row.product.name}"`);
      return;
    }
    onAdd({
      productId: row.product.id,
      name: row.product.name,
      serial: row.product.serial,
      quantity: qty,
      unitPrice: Number(row.product.salePrice),
      available: row.quantity,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Productos de mi stock</DialogTitle>
          <DialogDescription>
            Selecciona el producto y la cantidad a vender.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar producto…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Sin productos en tu stock
              </p>
            )}
            {filtered.map((row) => {
              const available = remaining(row);
              return (
                <div
                  key={row.productId}
                  className="flex flex-wrap items-center gap-2 rounded-md border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{row.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.product.serial ?? ""}
                      {row.product.serial ? " · " : ""}
                      {currency.format(Number(row.product.salePrice))} · {available} disponibles
                    </p>
                  </div>
                  <Input
                    className="w-20"
                    type="number"
                    min="1"
                    max={available}
                    step="1"
                    value={quantities[row.productId] ?? "1"}
                    onChange={(event) =>
                      setQuantities((prev) => ({
                        ...prev,
                        [row.productId]: event.target.value,
                      }))
                    }
                  />
                  <Button type="button" size="sm" onClick={() => add(row)}>
                    Agregar
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VendorSaleDialog({
  open,
  onOpenChange,
  stock,
  vendorName,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stock: VendorStockRow[];
  vendorName: string;
  onSuccess: (sale: SaleShareData) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [customerSearched, setCustomerSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [items, setItems] = useState<SaleItemDraft[]>([]);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"" | PaymentMethod>("");
  const [amountReceived, setAmountReceived] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: selectedDetail } = useQuery({
    queryKey: ["customer-detail", selectedCustomer?.id],
    queryFn: () => apiFetch<CustomerDetailData>(`/api/customers/${selectedCustomer!.id}`),
    enabled: open && Boolean(selectedCustomer),
  });

  const addedQty = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of items) {
      map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
    }
    return map;
  }, [items]);

  const subtotal = items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  const total = subtotal;

  const transferValue = Number(transferAmount || 0);

  const receivedValue = Number(amountReceived || 0);
  const amount =
    paymentMethod === "TRANSFERENCIA"
      ? transferValue > 0
        ? Math.min(transferValue, total)
        : 0
      : paymentMethod === "EFECTIVO"
        ? Math.min(receivedValue, total)
        : 0;
  const change = paymentMethod === "EFECTIVO" ? receivedValue - amount : 0;

  function reset() {
    setStep(1);
    setSelectedCustomer(null);
    setCustomerSearch("");
    setCustomerResults([]);
    setCustomerSearched(false);
    setDetailCustomerId(null);
    setCreateOpen(false);
    setItems([]);
    setProductPickerOpen(false);
    setPaymentMethod("");
    setAmountReceived("");
    setTransferAmount("");
    setReceiptFile(null);
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceiptPreview(null);
    setSignature(null);
    setNotes("");
    setFormError(null);
    setSubmitting(false);
  }

  const [detailCustomerId, setDetailCustomerId] = useState<number | null>(null);

  async function doSearch() {
    const q = customerSearch.trim();
    if (!q) return;
    setSearching(true);
    setCustomerSearched(true);
    try {
      const results = await apiFetch<Customer[]>(
        `/api/customers?search=${encodeURIComponent(q)}`,
      );
      setCustomerResults(results);
    } catch (error) {
      toast.error((error as Error).message);
      setCustomerResults([]);
    } finally {
      setSearching(false);
    }
  }

  function onAddItem(item: SaleItemDraft) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId
            ? { ...i, quantity: Math.min(i.available, i.quantity + item.quantity) }
            : i,
        );
      }
      return [...prev, item];
    });
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

  async function dataUrlToFile(dataUrl: string, filename: string) {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return new File([blob], filename, { type: "image/png" });
  }

  function nextStep() {
    setFormError(null);
    if (step === 1) {
      if (!selectedCustomer) {
        setFormError("Selecciona o crea el cliente para continuar");
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (items.length === 0) {
        setFormError("Agrega al menos un producto a la venta");
        return;
      }
      setStep(3);
    }
  }

  const pendingToPay = total - amount;

  async function submit() {
    if (!selectedCustomer) {
      setFormError("Selecciona o crea el cliente");
      setStep(1);
      return;
    }
    if (items.length === 0) {
      setFormError("Agrega al menos un producto a la venta");
      setStep(2);
      return;
    }
    if (!paymentMethod) {
      setFormError("Selecciona el método de pago");
      setStep(3);
      return;
    }
    if (paymentMethod === "TRANSFERENCIA") {
      if (!receiptFile) {
        setFormError("Adjunta el pantallazo/comprobante de la transferencia (obligatorio)");
        setStep(3);
        return;
      }
      if (transferValue <= 0) {
        setFormError("Ingresa el valor de la transferencia");
        setStep(3);
        return;
      }
    }
    if (paymentMethod === "EFECTIVO") {
      if (!Number.isFinite(receivedValue) || receivedValue <= 0) {
        setFormError("Ingresa el monto recibido");
        setStep(3);
        return;
      }
      if (!signature) {
        setFormError("Captura la firma del cliente");
        setStep(3);
        return;
      }
    }
    setFormError(null);
    setSubmitting(true);
    let sale: {
      id: number;
      saleNumber: string;
      total: number;
      customer: { name: string; phone: string | null };
      items: { product: { name: string }; quantity: number; unitPrice: number }[];
      payments: { id: number }[];
    };
    try {
      const payload = {
        customerId: selectedCustomer.id,
        source: "VENDOR",
        paymentMethod,
        amountReceived: amount > 0 ? amount : undefined,
        notes: notes.trim() || null,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      };
      sale = await apiFetch("/api/sales", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (error) {
      toast.error((error as Error).message);
      setFormError((error as Error).message);
      setSubmitting(false);
      return;
    }

    toast.success("Venta registrada");

    const paymentId = sale.payments?.[0]?.id;
    if (paymentId && paymentMethod === "TRANSFERENCIA" && receiptFile) {
      const form = new FormData();
      form.append("file", receiptFile);
      apiFetch(`/api/sales/${sale.id}/payments/${paymentId}/attachment?kind=EVIDENCIA`, {
        method: "POST",
        body: form,
      }).catch(() => {});
    }
    if (paymentId && paymentMethod === "EFECTIVO" && signature) {
      dataUrlToFile(signature, "firma.png")
        .then((file) => {
          const form = new FormData();
          form.append("file", file);
          return apiFetch(
            `/api/sales/${sale.id}/payments/${paymentId}/attachment?kind=FIRMA`,
            { method: "POST", body: form },
          );
        })
        .catch(() => {});
    }

    reset();
    onSuccess({
      id: sale.id,
      saleNumber: sale.saleNumber,
      total,
      customer: selectedCustomer,
      items: items.map((item) => ({
        product: { name: item.name },
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      pendingBalance: amount < total ? total - amount : 0,
    });
  }

  const steps = [
    { id: 1, label: "Cliente" },
    { id: 2, label: "Productos" },
    { id: 3, label: "Pago" },
  ] as const;

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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Venta · {vendorName}</DialogTitle>
          <DialogDescription>
            Compra desde tu stock asignado. Al finalizar podrás compartir el comprobante por
            WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          {steps.map((s) => (
            <div key={s.id} className="flex flex-1 items-center gap-2">
              <div
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  step === s.id
                    ? "bg-primary text-primary-foreground"
                    : step > s.id
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s.id ? <Check className="size-4" /> : s.id}
              </div>
              <span
                className={`text-sm ${step === s.id ? "font-medium" : "text-muted-foreground"}`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por documento, nombre o teléfono…"
                  value={customerSearch}
                  onChange={(event) => setCustomerSearch(event.target.value)}
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
              <Button type="button" variant="outline" onClick={() => setCreateOpen(true)}>
                <Plus /> Crear cliente
              </Button>
            </div>

            {customerSearched && !searching && (
              <div className="space-y-2">
                {customerResults.length === 0 ? (
                  <p className="rounded-md border p-4 text-center text-sm text-muted-foreground">
                    Sin resultados. Puedes{" "}
                    <button
                      type="button"
                      className="font-medium text-primary underline underline-offset-2"
                      onClick={() => setCreateOpen(true)}
                    >
                      crear el cliente
                    </button>
                    .
                  </p>
                ) : (
                  customerResults.map((customer) => (
                    <div
                      key={customer.id}
                      className={`flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center ${
                        selectedCustomer?.id === customer.id
                          ? "border-primary bg-primary/5"
                          : ""
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
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetailCustomerId(customer.id)}
                        >
                          Cartera
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setSelectedCustomer(customer)}
                        >
                          {selectedCustomer?.id === customer.id ? (
                            <>
                              <Check /> Seleccionado
                            </>
                          ) : (
                            "Seleccionar"
                          )}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {selectedCustomer && (
              <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <CustomerAvatar customer={selectedCustomer} />
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {selectedCustomer.name} {selectedCustomer.lastname ?? ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedCustomer.identificationType} · {selectedCustomer.identification}
                    </p>
                  </div>
                </div>
                <div className="shrink-0">
                  <p className="text-right text-xs text-muted-foreground">Saldo pendiente</p>
                  <div className="flex items-center justify-end gap-2">
                    <p
                      className={`text-lg font-bold ${
                        (selectedDetail?.pendingBalance ?? 0) > 0
                          ? "text-destructive"
                          : "text-green-700"
                      }`}
                    >
                      {currency.format(selectedDetail?.pendingBalance ?? 0)}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setDetailCustomerId(selectedCustomer.id)}
                      title="Ver cartera"
                    >
                      <FileText className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="truncate font-medium">
                {selectedCustomer?.name} {selectedCustomer?.lastname ?? ""}
              </span>
              <span className="text-xs text-muted-foreground">
                Saldo pendiente:{" "}
                <span
                  className={`font-semibold ${
                    (selectedDetail?.pendingBalance ?? 0) > 0 ? "text-destructive" : "text-green-700"
                  }`}
                >
                  {currency.format(selectedDetail?.pendingBalance ?? 0)}
                </span>
              </span>
            </div>

            <div className="space-y-2">
              {items.length === 0 && (
                <p className="rounded-md border p-4 text-center text-sm text-muted-foreground">
                  Sin productos agregados
                </p>
              )}
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex flex-wrap items-center gap-2 rounded-md border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.serial ?? ""} · disponible: {item.available}
                    </p>
                  </div>
                  <Input
                    className="w-20"
                    type="number"
                    min="1"
                    max={item.available}
                    step="1"
                    value={item.quantity}
                    onChange={(event) => {
                      const qty = Math.max(
                        1,
                        Math.min(item.available, Number(event.target.value) || 1),
                      );
                      setItems((prev) =>
                        prev.map((i) =>
                          i.productId === item.productId ? { ...i, quantity: qty } : i,
                        ),
                      );
                    }}
                  />
                  <span className="w-24 text-right text-sm font-medium">
                    {currency.format(item.quantity * item.unitPrice)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setItems((prev) =>
                        prev.filter((i) => i.productId !== item.productId),
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setProductPickerOpen(true)}
            >
              <PackageSearch /> Agregar productos de mi stock
            </Button>

            <div className="flex items-center justify-end gap-4">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-lg font-bold">{currency.format(total)}</span>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {selectedCustomer?.name} {selectedCustomer?.lastname ?? ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {items.length} {items.length === 1 ? "producto" : "productos"}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total a pagar</span>
                <span className="text-xl font-bold">{currency.format(total)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Método de pago</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("TRANSFERENCIA")}
                  className={`flex items-center gap-2 rounded-md border p-3 text-left ${
                    paymentMethod === "TRANSFERENCIA" ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <Camera className="size-5" />
                  <div>
                    <p className="text-sm font-medium">Transferencia</p>
                    <p className="text-xs text-muted-foreground">
                      Pantallazo + valor · captura obligatoria
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("EFECTIVO")}
                  className={`flex items-center gap-2 rounded-md border p-3 text-left ${
                    paymentMethod === "EFECTIVO" ? "border-primary bg-primary/5" : ""
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

            {paymentMethod === "TRANSFERENCIA" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Pantallazo del comprobante *</Label>
                  {receiptPreview ? (
                    <div className="relative overflow-hidden rounded-lg border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={receiptPreview}
                        alt="Comprobante de transferencia"
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
                    Toma una foto del comprobante (JPG, PNG o WebP · máx. 10 MB)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transfer-amount">Valor de la transferencia *</Label>
                  <Input
                    id="transfer-amount"
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="0"
                    value={transferAmount}
                    onChange={(event) => setTransferAmount(event.target.value)}
                  />
                  <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm font-medium">
                    {transferValue <= 0
                      ? "—"
                      : transferValue >= total
                        ? "Pago completo"
                        : `Abono · saldo pendiente ${currency.format(total - transferValue)}`}
                  </div>
                  {transferValue > 0 && transferValue < total && (
                    <p className="text-sm font-medium text-destructive">
                      Saldo pendiente: {currency.format(pendingToPay)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {paymentMethod === "EFECTIVO" && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="amountReceived">Monto recibido *</Label>
                    <Input
                      id="amountReceived"
                      type="number"
                      min="0"
                      step="100"
                      placeholder="0"
                      value={amountReceived}
                      onChange={(event) => setAmountReceived(event.target.value)}
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
                        : receivedValue >= total
                          ? "Pago completo"
                          : `Abono · falta ${currency.format(total - receivedValue)}`}
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
              <Textarea
                id="notes"
                placeholder="Observaciones de la venta"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
          </div>
        )}

        {formError && <p className="text-sm text-destructive">{formError}</p>}

        <DialogFooter className="gap-2">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormError(null);
                setStep((prev) => (prev - 1) as 1 | 2);
              }}
            >
              <ChevronLeft /> Atrás
            </Button>
          )}
          {step < 3 ? (
            <Button type="button" onClick={nextStep}>
              Continuar <ChevronRight />
            </Button>
          ) : (
            <Button type="button" onClick={submit} disabled={submitting}>
              {submitting ? "Registrando…" : "Registrar venta"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {createOpen && (
        <CustomerFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={(customer) => {
            if (customer) {
              setSelectedCustomer(customer);
              setCustomerSearch("");
              setCustomerResults([]);
              toast.success("Cliente creado");
            }
            setCreateOpen(false);
          }}
        />
      )}

      {productPickerOpen && (
        <ProductPickerDialog
          open={productPickerOpen}
          onOpenChange={setProductPickerOpen}
          stock={stock}
          added={addedQty}
          onAdd={onAddItem}
        />
      )}

      {detailCustomerId !== null && (
        <Dialog
          open={true}
          onOpenChange={(next) => {
            if (!next) setDetailCustomerId(null);
          }}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Cliente</DialogTitle>
            </DialogHeader>
            {selectedDetail && (
              <div className="space-y-2 text-sm">
                <p className="font-semibold">
                  {selectedDetail.customer.name} {selectedDetail.customer.lastname ?? ""}
                </p>
                <p className="text-muted-foreground">
                  {selectedDetail.customer.identificationType} ·{" "}
                  {selectedDetail.customer.identification}
                </p>
                <p>
                  Saldo pendiente:{" "}
                  <span
                    className={`font-bold ${
                      selectedDetail.pendingBalance > 0 ? "text-destructive" : "text-green-700"
                    }`}
                  >
                    {currency.format(selectedDetail.pendingBalance)}
                  </span>
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}

function ReturnToTruckDialog({
  open,
  onOpenChange,
  assignment,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: VendorAssignment;
  onSuccess: () => void;
}) {
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const returnableItems = assignment.items.filter((i) => i.remaining > 0);

  async function onSubmit() {
    const items = returnableItems
      .map((i) => {
        const value = Number(quantities[i.productId] ?? "");
        return { productId: i.productId, quantity: value };
      })
      .filter((i) => Number.isFinite(i.quantity) && i.quantity > 0);
    if (items.length === 0) {
      setFormError("Ingresa al menos una cantidad mayor a 0");
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      await apiFetch(`/api/inventory/vendors/${assignment.id}/return`, {
        method: "POST",
        body: JSON.stringify({ assignmentId: assignment.id, items }),
      });
      toast.success("Mercancía devuelta al camión");
      onSuccess();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Error al devolver");
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
          <DialogTitle>Devolver al camión</DialogTitle>
          <DialogDescription>
            Devuelve a <span className="font-medium">{assignment.truck.name}</span> la mercancía
            que no vendiste.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {returnableItems.length === 0 ? (
            <p className="rounded-md border p-4 text-center text-sm text-muted-foreground">
              No hay productos disponibles para devolver en esta asignación.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Disponible</TableHead>
                  <TableHead className="w-28">Devolver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returnableItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product.name}</TableCell>
                    <TableCell className="text-right">{item.remaining}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        max={item.remaining}
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
                ))}
              </TableBody>
            </Table>
          )}
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <DialogFooter>
            <Button onClick={onSubmit} disabled={saving || returnableItems.length === 0}>
              {saving ? "Devolviendo…" : "Devolver al camión"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
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

function RequestStockDialog({
  open,
  onOpenChange,
  assignments,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignments: VendorAssignment[];
  onSuccess: () => void;
}) {
  const truckOptions = useMemo(() => {
    const map = new Map<number, { id: number; name: string; plate: string | null }>();
    for (const a of assignments) {
      if (a.status === "DEVUELTO") continue;
      map.set(a.truck.id, a.truck);
    }
    return [...map.values()];
  }, [assignments]);

  const [truckId, setTruckId] = useState<string>("");
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedTruckId = truckId ? Number(truckId) : truckOptions[0]?.id;

  const productOptions = useMemo(() => {
    const map = new Map<
      number,
      {
        productId: number;
        product: { id: number; name: string; serial: string | null };
        available: number;
      }
    >();
    for (const a of assignments) {
      if (a.status === "DEVUELTO") continue;
      if (a.truck.id !== selectedTruckId) continue;
      for (const item of a.items) {
        const current = map.get(item.productId);
        map.set(item.productId, {
          productId: item.productId,
          product: item.product,
          available: item.remaining + (current?.available ?? 0),
        });
      }
    }
    return [...map.values()];
  }, [assignments, selectedTruckId]);

  async function submit() {
    const items = productOptions
      .map((opt) => ({
        productId: opt.productId,
        quantity: Number(quantities[opt.productId] ?? ""),
      }))
      .filter((i) => Number.isInteger(i.quantity) && i.quantity > 0);
    if (items.length === 0) {
      setFormError("Solicita al menos un producto con cantidad");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await apiFetch("/api/inventory/vendors/requests", {
        method: "POST",
        body: JSON.stringify({
          truckId: selectedTruckId,
          notes: notes.trim() || null,
          items,
        }),
      });
      toast.success("Solicitud de stock enviada al camión");
      onSuccess();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Error al enviar la solicitud");
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
          <DialogTitle>Pedir más stock</DialogTitle>
          <DialogDescription>
            Solicita al camión más mercancía de la que te ha asignado.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {truckOptions.length === 0 ? (
            <p className="rounded-md border p-4 text-center text-sm text-muted-foreground">
              No tienes asignaciones activas para pedir stock.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Camion</Label>
                <Select
                  value={selectedTruckId ? String(selectedTruckId) : ""}
                  onValueChange={(value) => {
                    setTruckId(value);
                    setQuantities({});
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el camión" />
                  </SelectTrigger>
                  <SelectContent>
                    {truckOptions.map((truck) => (
                      <SelectItem key={truck.id} value={String(truck.id)}>
                        {truck.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Disponible</TableHead>
                    <TableHead className="w-28">Pedir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productOptions.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="py-6 text-center text-muted-foreground"
                      >
                        Sin productos disponibles en este camión.
                      </TableCell>
                    </TableRow>
                  )}
                  {productOptions.map((opt) => (
                    <TableRow key={opt.productId}>
                      <TableCell className="font-medium">{opt.product.name}</TableCell>
                      <TableCell className="text-right">{opt.available}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          placeholder="0"
                          value={quantities[opt.productId] ?? ""}
                          onChange={(event) =>
                            setQuantities((prev) => ({
                              ...prev,
                              [opt.productId]: event.target.value,
                            }))
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="space-y-2">
                <Label htmlFor="request-notes">Notas (opcional)</Label>
                <Textarea
                  id="request-notes"
                  placeholder="Ej: necesito más del producto X"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>
            </>
          )}
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <DialogFooter>
            <Button onClick={submit} disabled={saving || truckOptions.length === 0}>
              {saving ? "Enviando…" : "Enviar solicitud"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function VendorSalesClient({
  canCreate,
  canPay,
  vendorName,
}: {
  canCreate: boolean;
  canPay: boolean;
  vendorName: string;
}) {
  const queryClient = useQueryClient();
  const [saleOpen, setSaleOpen] = useState(false);
  const [shareSale, setShareSale] = useState<SaleShareData | null>(null);
  const [returnAssignment, setReturnAssignment] = useState<VendorAssignment | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);

  const { data: stock, isLoading: stockLoading } = useQuery({
    queryKey: ["vendor-stock"],
    queryFn: () => apiFetch<VendorStockRow[]>("/api/inventory/vendors/stock"),
  });

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["vendor-assignments"],
    queryFn: () => apiFetch<VendorAssignment[]>("/api/inventory/vendors?mine=1"),
  });

  const { data: sales, isLoading: salesLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: () => apiFetch<SaleRow[]>("/api/sales"),
  });

  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ["vendor-requests"],
    queryFn: () => apiFetch<StockRequest[]>("/api/inventory/vendors/requests?mine=1"),
  });

  const totalUnits = (stock ?? []).reduce((acc, row) => acc + row.quantity, 0);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["vendor-stock"] });
    queryClient.invalidateQueries({ queryKey: ["vendor-assignments"] });
    queryClient.invalidateQueries({ queryKey: ["sales"] });
    queryClient.invalidateQueries({ queryKey: ["vendor-requests"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mi venta · {vendorName}</h1>
          <p className="text-muted-foreground">
            Solo ves el stock que te fue asignado desde el camión.
          </p>
        </div>
        {canCreate && (stock ?? []).length > 0 && (
          <Button className="w-full sm:w-auto" onClick={() => setSaleOpen(true)}>
            <Plus /> Vender
          </Button>
        )}
        {canCreate && (assignments ?? []).some((a) => a.status !== "DEVUELTO") && (
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => setRequestOpen(true)}>
            <PackageSearch /> Pedir más
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <PackageSearch className="size-5" /> Mi stock
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline">{(stock ?? []).length} productos</Badge>
            <Badge variant="outline">{totalUnits} unidades</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {stockLoading && <p className="py-8 text-center text-muted-foreground">Cargando…</p>}
          {!stockLoading && (stock ?? []).length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              Aún no tienes stock asignado. Espera a que te asignen productos desde el camión.
            </p>
          )}
          {!stockLoading && (stock ?? []).length > 0 && (
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
                {(stock ?? []).map((row) => (
                  <TableRow key={row.productId}>
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
            <Undo2 className="size-5" /> Mis asignaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignmentsLoading && (
            <p className="py-8 text-center text-muted-foreground">Cargando…</p>
          )}
          {!assignmentsLoading && (assignments ?? []).length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              Sin asignaciones registradas.
            </p>
          )}
          {!assignmentsLoading && (assignments ?? []).length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Camion</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments?.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">#{assignment.id}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(assignment.assignmentDate).toLocaleDateString("es-CO")}
                    </TableCell>
                    <TableCell>{assignment.truck.name}</TableCell>
                    <TableCell>
                      <Badge variant={assignment.status === "DEVUELTO" ? "secondary" : "default"}>
                        {assignment.status === "DEVUELTO" ? "Devuelto" : "Asignado"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
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
                    <TableCell className="text-right">
                      {assignment.status !== "DEVUELTO" && canPay && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReturnAssignment(assignment)}
                        >
                          <Undo2 /> Devolver
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
            <PackageSearch className="size-5" /> Solicitudes de stock
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requestsLoading && <p className="py-8 text-center text-muted-foreground">Cargando…</p>}
          {!requestsLoading && (requests ?? []).length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              Aún no has solicitado stock al camión.
            </p>
          )}
          {!requestsLoading && (requests ?? []).length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Camion</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(requests ?? []).map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">#{request.id}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(request.requestDate).toLocaleDateString("es-CO")}
                    </TableCell>
                    <TableCell>{request.truck.name}</TableCell>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mis ventas</CardTitle>
        </CardHeader>
        <CardContent>
          {salesLoading && <p className="py-8 text-center text-muted-foreground">Cargando…</p>}
          {!salesLoading && (sales ?? []).length === 0 && (
            <p className="py-8 text-center text-muted-foreground">Aún no registras ventas.</p>
          )}
          {!salesLoading && (sales ?? []).length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Venta</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(sales ?? []).map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.saleNumber}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(sale.saleDate).toLocaleDateString("es-CO")}
                    </TableCell>
                    <TableCell>
                      {sale.customer.name} {sale.customer.lastname ?? ""}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {currency.format(sale.total)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sale.status === "PAGADO"
                            ? "default"
                            : sale.status === "ABONO"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {sale.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {saleOpen && (
        <VendorSaleDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setSaleOpen(false);
          }}
          stock={stock ?? []}
          vendorName={vendorName}
          onSuccess={(sale) => {
            setSaleOpen(false);
            refresh();
            toast.success("Venta registrada");
            setShareSale(sale);
          }}
        />
      )}

      {shareSale && (
        <WhatsAppShareDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setShareSale(null);
          }}
          sale={shareSale}
        />
      )}

      {returnAssignment && (
        <ReturnToTruckDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setReturnAssignment(null);
          }}
          assignment={returnAssignment}
          onSuccess={() => {
            setReturnAssignment(null);
            refresh();
          }}
        />
      )}

      {requestOpen && (
        <RequestStockDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setRequestOpen(false);
          }}
          assignments={assignments ?? []}
          onSuccess={() => {
            setRequestOpen(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

interface SaleRow {
  id: number;
  saleNumber: string;
  saleDate: string;
  total: number;
  status: SaleStatus;
  customer: { id: number; name: string; lastname: string | null; identification: string };
  user: { id: number; name: string };
}