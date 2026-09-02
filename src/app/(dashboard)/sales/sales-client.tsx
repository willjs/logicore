"use client";

import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  PackageSearch,
  Plus,
  Search,
  Trash2,
  Truck,
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

interface TruckStockRow {
  id: number;
  quantity: number;
  product: { id: number; name: string; serial: string | null; salePrice: number };
}

interface TruckWithStock {
  id: number;
  name: string;
  plate: string | null;
  driver: { id: number; name: string } | null;
  inventory: TruckStockRow[];
}

interface SaleItemDraft {
  productId: number;
  name: string;
  serial: string | null;
  quantity: number;
  unitPrice: number;
  available: number;
}

interface PaymentAttachment {
  id: number;
  kind: "EVIDENCIA" | "FIRMA";
  originalName: string;
  mimeType: string;
  size: number;
  fileUrl: string;
}

interface SaleRow {
  id: number;
  saleNumber: string;
  saleDate: string;
  total: number;
  status: SaleStatus;
  customer: { id: number; name: string; lastname: string | null; identification: string };
  truck: { id: number; name: string } | null;
  user: { id: number; name: string };
  _count: { items: number; payments: number };
}

interface SaleDetail {
  id: number;
  saleNumber: string;
  saleDate: string;
  subtotal: number;
  total: number;
  status: SaleStatus;
  paymentMethod: PaymentMethod | null;
  notes: string | null;
  customer: Customer;
  truck: { id: number; name: string; plate: string | null } | null;
  user: { id: number; name: string };
  items: {
    id: number;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    product: { id: number; name: string; serial: string | null };
  }[];
  payments: {
    id: number;
    amount: number;
    method: PaymentMethod;
    kind: "PAGO" | "ABONO";
    received: number | null;
    change: number | null;
    notes: string | null;
    createdAt: string;
    user: { id: number; name: string };
    attachments: PaymentAttachment[];
  }[];
}

interface CustomerDetailData {
  customer: Customer;
  pendingBalance: number;
  cartera: {
    id: number;
    saleNumber: string;
    saleDate: string;
    total: number;
    status: SaleStatus;
    paid: number;
    balance: number;
    truck: { id: number; name: string } | null;
  }[];
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

function CustomerDetailDialog({
  open,
  onOpenChange,
  customerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: number;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["customer-detail", customerId],
    queryFn: () => apiFetch<CustomerDetailData>(`/api/customers/${customerId}`),
    enabled: open && customerId > 0,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalle del cliente</DialogTitle>
          <DialogDescription>
            Cartera y saldo pendiente del cliente.
          </DialogDescription>
        </DialogHeader>
        {isLoading && <p className="py-8 text-center text-muted-foreground">Cargando…</p>}
        {isError && (
          <p className="py-8 text-center text-destructive">Error al cargar el cliente</p>
        )}
        {!isLoading && !isError && data && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
              <CustomerAvatar customer={data.customer} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {data.customer.name} {data.customer.lastname ?? ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  {data.customer.identificationType} · {data.customer.identification}
                </p>
                {(data.customer.phone || data.customer.email) && (
                  <p className="text-sm text-muted-foreground">
                    {data.customer.phone ?? ""}
                    {data.customer.phone && data.customer.email ? " · " : ""}
                    {data.customer.email ?? ""}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Saldo pendiente</p>
                <p
                  className={`text-lg font-bold ${
                    data.pendingBalance > 0 ? "text-destructive" : "text-green-700"
                  }`}
                >
                  {currency.format(data.pendingBalance)}
                </p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium">Cartera</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Venta</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Camion</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Abonado</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.cartera.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-4 text-center text-muted-foreground">
                        Sin ventas registradas
                      </TableCell>
                    </TableRow>
                  )}
                  {data.cartera.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.saleNumber}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {new Date(sale.saleDate).toLocaleDateString("es-CO")}
                      </TableCell>
                      <TableCell>{sale.truck?.name ?? "—"}</TableCell>
                      <TableCell className="text-right">{currency.format(sale.total)}</TableCell>
                      <TableCell className="text-right">{currency.format(sale.paid)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {sale.balance > 0 ? (
                          <span className="text-destructive">{currency.format(sale.balance)}</span>
                        ) : (
                          <span className="text-green-700">Al día</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProductSearchDialog({
  open,
  onOpenChange,
  stock,
  added,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stock: TruckStockRow[];
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

  function remaining(row: TruckStockRow) {
    return row.quantity - (added.get(row.product.id) ?? 0);
  }

  function add(row: TruckStockRow) {
    const available = remaining(row);
    if (available <= 0) {
      toast.error(`"${row.product.name}" ya está agotado en el camión`);
      return;
    }
    const raw = Math.floor(Number(quantities[row.product.id] ?? "1"));
    const qty = Number.isFinite(raw) && raw > 0 ? raw : 1;
    if (qty > available) {
      toast.error(`Solo quedan ${available} disponibles de "${row.product.name}"`);
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
          <DialogTitle>Productos del camión</DialogTitle>
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
                Sin productos con stock en el camión
              </p>
            )}
            {filtered.map((row) => {
              const available = remaining(row);
              return (
                <div
                  key={row.product.id}
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
                    value={quantities[row.product.id] ?? "1"}
                    onChange={(event) =>
                      setQuantities((prev) => ({
                        ...prev,
                        [row.product.id]: event.target.value,
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

function TruckSaleDialog({
  open,
  onOpenChange,
  truck,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  truck: TruckWithStock;
  onSuccess: (sale: SaleShareData) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [customerSearched, setCustomerSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [detailCustomerId, setDetailCustomerId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [items, setItems] = useState<SaleItemDraft[]>([]);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"" | PaymentMethod>("");
  const [amountReceived, setAmountReceived] = useState("");
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
  const received =
    paymentMethod === "EFECTIVO"
      ? Number(amountReceived || 0)
      : paymentMethod === "TRANSFERENCIA"
        ? total
        : 0;
  const change = received - total;

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
    setReceiptFile(null);
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceiptPreview(null);
    setSignature(null);
    setNotes("");
    setFormError(null);
    setSubmitting(false);
  }

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
    if (paymentMethod === "TRANSFERENCIA" && !receiptFile) {
      setFormError("Adjunta la captura de la transferencia (obligatoria)");
      setStep(3);
      return;
    }
    if (paymentMethod === "EFECTIVO") {
      if (!Number.isFinite(received) || received <= 0) {
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
    let sale: { id: number; saleNumber: string; payments: { id: number }[] };
    try {
      const payload = {
        customerId: selectedCustomer.id,
        truckId: truck.id,
        paymentMethod,
        amountReceived: received,
        notes: notes.trim() || null,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      };
      sale = await apiFetch<{ id: number; saleNumber: string; payments: { id: number }[] }>(
        "/api/sales",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
    } catch (error) {
      toast.error((error as Error).message);
      setFormError((error as Error).message);
      setSubmitting(false);
      return;
    }

    toast.success("Venta registrada");
    onSuccess({
      id: sale.id,
      saleNumber: sale.saleNumber,
      total,
      customer: { name: selectedCustomer.name, phone: selectedCustomer.phone },
      items: items.map((item) => ({
        product: { name: item.name },
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      pendingBalance: 0,
    });

    const paymentId = sale.payments?.[0]?.id;
    if (paymentId && paymentMethod === "TRANSFERENCIA" && receiptFile) {
      const form = new FormData();
      form.append("file", receiptFile);
      apiFetch(
        `/api/sales/${sale.id}/payments/${paymentId}/attachment?kind=EVIDENCIA`,
        { method: "POST", body: form },
      ).catch(() => {});
    }
    if (paymentId && paymentMethod === "EFECTIVO" && signature) {
      dataUrlToFile(signature, "firma.png")
        .then((file) => {
          const form = new FormData();
          form.append("file", file);
          return apiFetch(`/api/sales/${sale.id}/payments/${paymentId}/attachment?kind=FIRMA`, {
            method: "POST",
            body: form,
          });
        })
        .catch(() => {});
    }
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
          <DialogTitle>Venta en camión · {truck.name}</DialogTitle>
          <DialogDescription>
            <span className="flex items-center gap-1">
              <Truck className="size-3.5" /> {truck.plate || "Sin placa"}
              {truck.driver ? ` · Conductor: ${truck.driver.name}` : ""}
            </span>
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
                  <Input
                    className="w-28"
                    type="number"
                    min="0"
                    step="100"
                    value={item.unitPrice}
                    onChange={(event) => {
                      const price = Number(event.target.value);
                      setItems((prev) =>
                        prev.map((i) =>
                          i.productId === item.productId
                            ? { ...i, unitPrice: Number.isFinite(price) ? price : 0 }
                            : i,
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
              <PackageSearch /> Agregar productos del camión
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
                    paymentMethod === "TRANSFERENCIA"
                      ? "border-primary bg-primary/5"
                      : ""
                  }`}
                >
                  <Camera className="size-5" />
                  <div>
                    <p className="text-sm font-medium">Transferencia</p>
                    <p className="text-xs text-muted-foreground">
                      Pago total · captura obligatoria
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
                      {received > 0 ? currency.format(change) : "—"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm font-medium">
                      {received <= 0
                        ? "—"
                        : received < total
                          ? `Abono · falta ${currency.format(total - received)}`
                          : "Pago completo"}
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
        <ProductSearchDialog
          open={productPickerOpen}
          onOpenChange={setProductPickerOpen}
          stock={truck.inventory}
          added={addedQty}
          onAdd={onAddItem}
        />
      )}

      {detailCustomerId !== null && (
        <CustomerDetailDialog
          open={true}
          onOpenChange={(next) => {
            if (!next) setDetailCustomerId(null);
          }}
          customerId={detailCustomerId}
        />
      )}
    </Dialog>
  );
}

function AbonoDialog({
  open,
  onOpenChange,
  saleId,
  pending,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: number;
  pending: number;
  onSuccess: () => void;
}) {
  const [method, setMethod] = useState<string>("EFECTIVO");
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit } = useForm<{ amount: string }>({ defaultValues: { amount: "" } });

  async function onSubmit(values: { amount: string }) {
    const amount = Number(values.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Ingresa un monto válido");
      return;
    }
    if (amount > pending) {
      setFormError("El abono excede el saldo pendiente");
      return;
    }
    setFormError(null);
    await apiFetch(`/api/sales/${saleId}/payments`, {
      method: "POST",
      body: JSON.stringify({ amount, method, notes: null }),
    });
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar abono</DialogTitle>
          <DialogDescription>
            Saldo pendiente: <span className="font-medium">{currency.format(pending)}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Monto</Label>
            <Input id="amount" type="number" min="0" step="100" placeholder="0" {...register("amount")} />
          </div>
          <div className="space-y-2">
            <Label>Método</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <DialogFooter>
            <Button type="submit">Registrar abono</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SaleDetailDialog({
  open,
  onOpenChange,
  sale,
  isLoading,
  canPay,
  onAbono,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale?: SaleDetail;
  isLoading: boolean;
  canPay: boolean;
  onAbono: () => void;
}) {
  const paid = (sale?.payments ?? []).reduce((acc, p) => acc + p.amount, 0);
  const pending = sale ? sale.total - paid : 0;
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Venta {sale?.saleNumber}</DialogTitle>
          <DialogDescription>
            {sale && `${formatDate(sale.saleDate)} · Cliente: ${sale.customer.name} ${sale.customer.lastname ?? ""}`}
          </DialogDescription>
        </DialogHeader>
        {isLoading && <p className="py-8 text-center text-muted-foreground">Cargando…</p>}
        {!isLoading && sale && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant={
                  sale.status === "PAGADO" ? "default" : sale.status === "ABONO" ? "secondary" : "outline"
                }
              >
                {sale.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {sale.truck ? `Camión: ${sale.truck.name}` : "Sin camión"} · Vendedor: {sale.user.name}
              </span>
              <span className="ml-auto text-lg font-bold">{currency.format(sale.total)}</span>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium">Productos</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sale.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <span className="block font-medium">{item.product.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {item.product.serial ?? ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{currency.format(item.unitPrice)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {currency.format(item.lineTotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium">Pagos</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Adjuntos</TableHead>
                    <TableHead>Usuario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sale.payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-4 text-center text-muted-foreground">
                        Sin pagos registrados
                      </TableCell>
                    </TableRow>
                  )}
                  {sale.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(payment.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={payment.kind === "PAGO" ? "default" : "secondary"}>
                          {payment.kind}
                        </Badge>
                      </TableCell>
                      <TableCell>{payment.method}</TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium">{currency.format(payment.amount)}</span>
                        {payment.received != null && (
                          <span className="block text-xs text-muted-foreground">
                            Recibió {currency.format(payment.received)}
                            {payment.change ? ` · Cambio ${currency.format(payment.change)}` : ""}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {payment.attachments.length === 0 && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                          {payment.attachments.map((attachment) => (
                            <a
                              key={attachment.id}
                              href={attachment.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`${attachment.originalName} (${formatBytes(attachment.size)})`}
                              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"
                            >
                              <ExternalLink className="size-3" />
                              {attachment.kind === "FIRMA" ? "Firma" : "Comprobante"}
                            </a>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{payment.user.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-2 flex justify-end gap-6 text-sm">
                <span>
                  Abonado: <span className="font-medium">{currency.format(paid)}</span>
                </span>
                <span>
                  Pendiente: <span className="font-medium">{currency.format(pending)}</span>
                </span>
              </div>
            </div>

            {sale.notes && (
              <p className="rounded-md bg-muted/50 p-3 text-sm">
                <span className="font-medium">Notas: </span>
                {sale.notes}
              </p>
            )}

            {canPay && pending > 0 && (
              <div className="flex justify-end">
                <Button onClick={onAbono}>Registrar abono</Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function SalesClient({ canCreate, canPay, isAdmin }: { canCreate: boolean; canPay: boolean; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [saleOpen, setSaleOpen] = useState(false);
  const [shareSale, setShareSale] = useState<SaleShareData | null>(null);
  const [truckId, setTruckId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [abonoSale, setAbonoSale] = useState<SaleDetail | null>(null);

  const { data: trucks, isLoading: trucksLoading } = useQuery({
    queryKey: ["sales-trucks"],
    queryFn: () => apiFetch<TruckWithStock[]>("/api/sales/trucks"),
  });

  const selectedTruck =
    (trucks ?? []).find((truck) => String(truck.id) === truckId) ?? trucks?.[0] ?? null;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["sales"],
    queryFn: () => apiFetch<SaleRow[]>("/api/sales"),
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["sale", detailId],
    queryFn: () => apiFetch<SaleDetail>(`/api/sales/${detailId}`),
    enabled: detailId !== null,
  });

  const filtered = (data ?? []).filter((sale) => {
    if (statusFilter && sale.status !== statusFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      sale.saleNumber.toLowerCase().includes(q) ||
      sale.customer.name.toLowerCase().includes(q) ||
      (sale.customer.lastname ?? "").toLowerCase().includes(q)
    );
  });

  const totalUnits = (selectedTruck?.inventory ?? []).reduce(
    (acc, row) => acc + row.quantity,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ventas en camión</h1>
          <p className="text-muted-foreground">
            Vende desde el camión: cliente, productos del camión y pago.
          </p>
        </div>
        {canCreate && selectedTruck && (
          <Button className="w-full sm:w-auto" onClick={() => setSaleOpen(true)}>
            <Plus /> Vender
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Truck className="size-5" /> Carga del camión
          </CardTitle>
          <div className="w-full sm:w-56">
            <Select value={String(selectedTruck?.id ?? "")} onValueChange={setTruckId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un camión" />
              </SelectTrigger>
              <SelectContent>
                {(trucks ?? []).map((truck) => (
                  <SelectItem key={truck.id} value={String(truck.id)}>
                    {truck.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {trucksLoading && (
            <p className="py-8 text-center text-muted-foreground">Cargando…</p>
          )}
          {!trucksLoading && trucks?.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              No hay camiones activos para vender.
            </p>
          )}
          {!trucksLoading && selectedTruck && (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge variant="outline">
                  {selectedTruck.inventory.length}{" "}
                  {selectedTruck.inventory.length === 1 ? "producto" : "productos"}
                </Badge>
                <Badge variant="outline">{totalUnits} unidades</Badge>
                {selectedTruck.driver && (
                  <Badge variant="outline">Conductor: {selectedTruck.driver.name}</Badge>
                )}
              </div>
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
                  {selectedTruck.inventory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                        Este camión no tiene productos cargados.
                      </TableCell>
                    </TableRow>
                  )}
                  {selectedTruck.inventory.map((row) => (
                    <TableRow key={row.id}>
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
            </>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por número o cliente…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="w-44">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los estados</SelectItem>
                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  <SelectItem value="ABONO">Abono</SelectItem>
                  <SelectItem value="PAGADO">Pagado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Historial de ventas</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading && <p className="py-8 text-center text-muted-foreground">Cargando…</p>}
              {isError && <p className="py-8 text-center text-destructive">Error al cargar las ventas</p>}
              {!isLoading && !isError && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Venta</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Camion</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                          {search || statusFilter ? "Sin resultados" : "No hay ventas registradas"}
                        </TableCell>
                      </TableRow>
                    )}
                    {filtered.map((sale) => (
                      <TableRow key={sale.id} className="cursor-pointer" onClick={() => setDetailId(sale.id)}>
                        <TableCell className="font-medium">{sale.saleNumber}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {new Date(sale.saleDate).toLocaleDateString("es-CO")}
                        </TableCell>
                        <TableCell>
                          {sale.customer.name} {sale.customer.lastname ?? ""}
                        </TableCell>
                        <TableCell>{sale.truck?.name ?? "—"}</TableCell>
                        <TableCell className="text-right font-medium">
                          {currency.format(sale.total)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              sale.status === "PAGADO" ? "default" : sale.status === "ABONO" ? "secondary" : "outline"
                            }
                          >
                            {sale.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            Ver
                          </Button>
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

      {saleOpen && selectedTruck && (
        <TruckSaleDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setSaleOpen(false);
          }}
          truck={selectedTruck}
          onSuccess={(sale) => {
            setSaleOpen(false);
            setShareSale(sale);
            queryClient.invalidateQueries({ queryKey: ["sales"] });
            queryClient.invalidateQueries({ queryKey: ["sales-trucks"] });
            queryClient.invalidateQueries({ queryKey: ["sale", detailId] });
            queryClient.invalidateQueries({ queryKey: ["customer-detail"] });
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

      {detailId !== null && (
        <SaleDetailDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setDetailId(null);
          }}
          sale={detail}
          isLoading={detailLoading}
          canPay={canPay}
          onAbono={() => detail && setAbonoSale(detail)}
        />
      )}

      {abonoSale && (
        <AbonoDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setAbonoSale(null);
          }}
          saleId={abonoSale.id}
          pending={abonoSale.total - abonoSale.payments.reduce((acc, p) => acc + p.amount, 0)}
          onSuccess={() => {
            toast.success("Abono registrado");
            setAbonoSale(null);
            queryClient.invalidateQueries({ queryKey: ["sale", abonoSale.id] });
            queryClient.invalidateQueries({ queryKey: ["sales"] });
          }}
        />
      )}
    </div>
  );
}
