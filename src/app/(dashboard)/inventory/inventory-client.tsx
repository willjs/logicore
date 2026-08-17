"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  FileDown,
  FileSpreadsheet,
  History,
  PackagePlus,
  Plus,
  Search,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
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

type MovementType = "ENTRADA" | "SALIDA" | "AJUSTE";

const MOVEMENT_LABELS: Record<MovementType, string> = {
  ENTRADA: "Entrada",
  SALIDA: "Salida",
  AJUSTE: "Ajuste",
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 2,
  }).format(value);

interface Warehouse {
  id: number;
  name: string;
  active: boolean;
}

interface Brand {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  serial: string | null;
  active: boolean;
}

interface StockRow {
  id: number;
  warehouseId: number;
  productId: number;
  quantity: number;
  warehouse: { id: number; name: string };
  product: {
    id: number;
    name: string;
    serial: string | null;
    salePrice: number;
    brand: { id: number; name: string } | null;
    category: { id: number; name: string } | null;
  };
}

interface Movement {
  id: number;
  type: MovementType;
  quantity: number;
  balance: number;
  description: string | null;
  referenceType: string | null;
  referenceId: number | null;
  createdAt: string;
  product: { id: number; name: string; serial: string | null };
  user: { id: number; name: string };
}

interface ImportResult {
  total: number;
  created: number;
  updated: number;
  quantityIn: number;
  errors: { row: number; message: string }[];
}

function MovementFormDialog({
  open,
  onOpenChange,
  products,
  warehouses,
  initialProductId,
  initialWarehouseId,
  defaultType,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  warehouses: Warehouse[];
  initialProductId?: number;
  initialWarehouseId?: number;
  defaultType: MovementType;
  onSuccess: () => void;
}) {
  const [type, setType] = useState<MovementType>(defaultType);
  const [productId, setProductId] = useState<string>(
    initialProductId ? String(initialProductId) : "",
  );
  const [warehouseId, setWarehouseId] = useState<string>(
    initialWarehouseId ? String(initialWarehouseId) : "",
  );
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit } = useForm<{ quantity: string; description: string }>({
    defaultValues: { quantity: "", description: "" },
  });

  async function onSubmit(values: { quantity: string; description: string }) {
    const quantity = Number(values.quantity);
    if (!Number.isFinite(quantity) || quantity === 0 || (type !== "AJUSTE" && quantity <= 0)) {
      setFormError(
        type === "AJUSTE"
          ? "La cantidad no puede ser 0"
          : "La cantidad debe ser un número mayor a 0",
      );
      return;
    }
    if (!productId || !warehouseId) {
      setFormError("Selecciona el producto y la bodega");
      return;
    }
    setFormError(null);

    await apiFetch("/api/inventory/movements", {
      method: "POST",
      body: JSON.stringify({
        type,
        productId: Number(productId),
        warehouseId: Number(warehouseId),
        quantity,
        description: values.description.trim() || null,
      }),
    });
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar movimiento</DialogTitle>
          <DialogDescription>
            {type === "ENTRADA"
              ? "Ingresa mercancía a una bodega."
              : type === "SALIDA"
                ? "Saca mercancía de una bodega."
                : "Ajusta el stock (usa valores negativos para bajar)."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de movimiento</Label>
            <Select value={type} onValueChange={(value) => setType(value as MovementType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ENTRADA">Entrada</SelectItem>
                <SelectItem value="SALIDA">Salida</SelectItem>
                <SelectItem value="AJUSTE">Ajuste</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Producto *</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un producto" />
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
          </div>
          <div className="space-y-2">
            <Label>Bodega *</Label>
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
          <div className="space-y-2">
            <Label htmlFor="quantity">Cantidad *</Label>
            <Input
              id="quantity"
              type="number"
              step="1"
              placeholder={type === "AJUSTE" ? "Ej: 10 o -5" : "0"}
              {...register("quantity")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción / Motivo</Label>
            <Input id="description" placeholder="Observación del movimiento" {...register("description")} />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <DialogFooter>
            <Button type="submit">Registrar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProductEntryDialog({
  open,
  onOpenChange,
  brands,
  categories,
  warehouses,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brands: Brand[];
  categories: Category[];
  warehouses: Warehouse[];
  onSuccess: () => void;
}) {
  const defaultWarehouse =
    warehouses.find((warehouse) => warehouse.active) ?? warehouses[0];
  const [brandId, setBrandId] = useState<string>(brands[0] ? String(brands[0].id) : "");
  const [categoryId, setCategoryId] = useState<string>(categories[0] ? String(categories[0].id) : "");
  const [warehouseId, setWarehouseId] = useState<string>(
    defaultWarehouse ? String(defaultWarehouse.id) : "",
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit } = useForm<{
    name: string;
    serial: string;
    salePrice: string;
    quantity: string;
  }>({ defaultValues: { name: "", serial: "", salePrice: "", quantity: "" } });

  async function onSubmit(values: {
    name: string;
    serial: string;
    salePrice: string;
    quantity: string;
  }) {
    const quantity = Number(values.quantity);
    const salePrice = values.salePrice === "" ? 0 : Number(values.salePrice);
    if (!values.name.trim()) {
      setFormError("El nombre del producto es obligatorio");
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setFormError("La cantidad inicial debe ser un número mayor a 0");
      return;
    }
    if (!Number.isFinite(salePrice) || salePrice < 0) {
      setFormError("El valor unitario debe ser un número mayor o igual a 0");
      return;
    }
    if (!warehouseId) {
      setFormError("Selecciona la bodega de ingreso");
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/inventory/products", {
        method: "POST",
        body: JSON.stringify({
          name: values.name.trim(),
          serial: values.serial.trim() || null,
          salePrice,
          quantity: Math.floor(quantity),
          brandId: brandId ? Number(brandId) : null,
          categoryId: categoryId ? Number(categoryId) : null,
          warehouseId: Number(warehouseId),
        }),
      });
      onSuccess();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Error al crear el producto");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo producto</DialogTitle>
          <DialogDescription>
            Registra el producto y su stock inicial de una vez.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product-name">Nombre del producto *</Label>
            <Input id="product-name" placeholder="Ej: Cemento Gris 50kg" {...register("name")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Marca</Label>
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin marca" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={String(brand.id)}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="product-serial">Serial / Referencia</Label>
              <Input id="product-serial" placeholder="Ej: CEM-001" {...register("serial")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-price">Valor unitario</Label>
              <Input
                id="product-price"
                type="number"
                step="0.01"
                placeholder="0"
                {...register("salePrice")}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="product-quantity">Cantidad inicial *</Label>
              <Input id="product-quantity" type="number" step="1" placeholder="0" {...register("quantity")} />
            </div>
            <div className="space-y-2">
              <Label>Bodega de ingreso *</Label>
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
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creando…" : "Crear producto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function onSubmit() {
    if (!file) {
      setFormError("Selecciona un archivo .xlsx o .csv");
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch<ImportResult>("/api/inventory/import", {
        method: "POST",
        body: formData,
      });
      setResult(res);
      onSuccess();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Error al importar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar inventario</DialogTitle>
          <DialogDescription>
            Sube un archivo Excel (.xlsx) o CSV. Si el producto ya existe por serial o nombre, se
            actualiza y se suma su cantidad; si no, se crea.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="import-file">Archivo *</Label>
            <Input
              id="import-file"
              type="file"
              accept=".xlsx,.csv"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <div className="rounded-lg border p-3 text-xs text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">Columnas esperadas:</p>
            <p>
              Producto, Marca, Categoría, Serial, Valor Unitario, Cantidad, Bodega.{" "}
              <Button asChild variant="link" size="xs" className="h-auto p-0 text-xs">
                <a href="/api/inventory/import/template" download>
                  Descargar plantilla
                </a>
              </Button>
            </p>
          </div>
          {result && (
            <div className="space-y-2 rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="font-medium">
                {result.created} creado(s) · {result.updated} actualizado(s) · {result.quantityIn}{" "}
                unidad(es) ingresadas
              </p>
              {result.errors.length > 0 && (
                <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-destructive">
                  {result.errors.map((error) => (
                    <li key={error.row}>
                      Fila {error.row}: {error.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setResult(null)} disabled={submitting}>
              Limpiar
            </Button>
            <Button type="button" onClick={onSubmit} disabled={submitting}>
              <Upload /> {submitting ? "Importando…" : "Importar"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function KardexDialog({
  open,
  onOpenChange,
  productName,
  warehouseName,
  movements,
  isLoading,
  onAdjust,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  warehouseName: string;
  movements?: Movement[];
  isLoading: boolean;
  onAdjust?: () => void;
}) {
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("es-CO", {
      dateStyle: "short",
      timeStyle: "short",
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Kardex: {productName}</DialogTitle>
          <DialogDescription>
            Historial de movimientos en {warehouseName}.
          </DialogDescription>
        </DialogHeader>
        {onAdjust && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={onAdjust}>
              <SlidersHorizontal /> Ajustar stock
            </Button>
          </div>
        )}
        {isLoading && (
          <p className="py-8 text-center text-muted-foreground">Cargando…</p>
        )}
        {!isLoading && (!movements || movements.length === 0) && (
          <p className="py-8 text-center text-muted-foreground">
            Sin movimientos registrados
          </p>
        )}
        {!isLoading && movements && movements.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Descripción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDate(movement.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        movement.type === "ENTRADA"
                          ? "default"
                          : movement.type === "SALIDA"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {MOVEMENT_LABELS[movement.type]}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${
                      movement.quantity > 0 ? "text-green-600" : "text-destructive"
                    }`}
                  >
                    {movement.quantity > 0 ? "+" : ""}
                    {movement.quantity}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {movement.balance}
                  </TableCell>
                  <TableCell>{movement.user.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {movement.description ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function InventoryClient({
  canCreate,
  canAdjust,
  canCreateProduct,
  canImport,
  canExport,
}: {
  canCreate: boolean;
  canAdjust: boolean;
  canCreateProduct: boolean;
  canImport: boolean;
  canExport: boolean;
}) {
  const queryClient = useQueryClient();
  const [warehouseFilter, setWarehouseFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [movementDialog, setMovementDialog] = useState<{
    type: MovementType;
    productId?: number;
    warehouseId?: number;
  } | null>(null);
  const [productDialog, setProductDialog] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  const [kardexTarget, setKardexTarget] = useState<{
    productId: number;
    warehouseId: number;
    productName: string;
    warehouseName: string;
  } | null>(null);

  const { data: stock, isLoading, isError } = useQuery({
    queryKey: ["inventory-stock"],
    queryFn: () => apiFetch<StockRow[]>("/api/inventory/stock"),
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => apiFetch<Warehouse[]>("/api/warehouses"),
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: () => apiFetch<Product[]>("/api/products"),
  });

  const { data: brands } = useQuery({
    queryKey: ["brands"],
    queryFn: () => apiFetch<Brand[]>("/api/brands"),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<Category[]>("/api/categories"),
  });

  const { data: kardex, isLoading: kardexLoading } = useQuery({
    queryKey: ["kardex", kardexTarget?.productId, kardexTarget?.warehouseId],
    queryFn: () =>
      apiFetch<Movement[]>(
        `/api/inventory/movements?productId=${kardexTarget!.productId}&warehouseId=${kardexTarget!.warehouseId}`,
      ),
    enabled: Boolean(kardexTarget),
  });

  const filtered = (stock ?? []).filter((row) => {
    if (warehouseFilter && String(row.warehouseId) !== warehouseFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      row.product.name.toLowerCase().includes(q) ||
      (row.product.serial ?? "").toLowerCase().includes(q) ||
      (row.product.brand?.name ?? "").toLowerCase().includes(q) ||
      (row.product.category?.name ?? "").toLowerCase().includes(q)
    );
  });

  function refreshStock() {
    queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["kardex"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventario</h1>
          <p className="text-muted-foreground">
            Existencias por bodega, entradas y salidas, importación, exportación y reportes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(canCreate || canAdjust) && (
            <Button
              className="w-full sm:w-auto"
              onClick={() => setMovementDialog({ type: "ENTRADA" })}
            >
              <Plus /> Registrar movimiento
            </Button>
          )}
          {canCreateProduct && (
            <Button variant="outline" onClick={() => setProductDialog(true)}>
              <PackagePlus /> Nuevo producto
            </Button>
          )}
          {canImport && (
            <Button variant="outline" onClick={() => setImportDialog(true)}>
              <Upload /> Importar
            </Button>
          )}
          {canExport && (
            <>
              <Button asChild variant="outline">
                <a href="/api/inventory/export" download>
                  <FileDown /> Exportar
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href="/api/inventory/report" target="_blank">
                  <FileSpreadsheet /> Reporte PDF
                </a>
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por producto, referencia, marca o categoría…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="w-56">
          <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
            <SelectTrigger>
              <SlidersHorizontal className="size-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas las bodegas</SelectItem>
              {(warehouses ?? []).map((warehouse) => (
                <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                  {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Existencias</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="py-8 text-center text-muted-foreground">Cargando…</p>}
          {isError && (
            <p className="py-8 text-center text-destructive">Error al cargar el inventario</p>
          )}
          {!isLoading && !isError && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Valor Unitario</TableHead>
                  <TableHead>Bodega</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      {search || warehouseFilter
                        ? "Sin resultados para el filtro"
                        : "Sin existencias registradas. Registra la primera entrada."}
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <span className="block font-medium">{row.product.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {row.product.serial ?? ""}
                      </span>
                    </TableCell>
                    <TableCell>{row.product.brand?.name ?? "—"}</TableCell>
                    <TableCell>{row.product.category?.name ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {formatMoney(row.product.salePrice)}
                    </TableCell>
                    <TableCell>{row.warehouse.name}</TableCell>
                    <TableCell className="text-right text-lg font-semibold">
                      {row.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoney(row.product.salePrice * row.quantity)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canCreate && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setMovementDialog({
                                  type: "ENTRADA",
                                  productId: row.productId,
                                  warehouseId: row.warehouseId,
                                })
                              }
                            >
                              <ArrowDownToLine /> Entrada
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setMovementDialog({
                                  type: "SALIDA",
                                  productId: row.productId,
                                  warehouseId: row.warehouseId,
                                })
                              }
                            >
                              <ArrowUpFromLine /> Salida
                            </Button>
                          </>
                        )}
                        {canAdjust && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setMovementDialog({
                                type: "AJUSTE",
                                productId: row.productId,
                                warehouseId: row.warehouseId,
                              })
                            }
                          >
                            <SlidersHorizontal /> Ajuste
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setKardexTarget({
                              productId: row.productId,
                              warehouseId: row.warehouseId,
                              productName: row.product.name,
                              warehouseName: row.warehouse.name,
                            })
                          }
                        >
                          <History /> Kardex
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

      {movementDialog && (
        <MovementFormDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setMovementDialog(null);
          }}
          products={products ?? []}
          warehouses={warehouses ?? []}
          initialProductId={movementDialog.productId}
          initialWarehouseId={movementDialog.warehouseId}
          defaultType={movementDialog.type}
          onSuccess={() => {
            toast.success("Movimiento registrado");
            setMovementDialog(null);
            refreshStock();
          }}
        />
      )}

      {productDialog && (
        <ProductEntryDialog
          open={true}
          onOpenChange={setProductDialog}
          brands={brands ?? []}
          categories={categories ?? []}
          warehouses={warehouses ?? []}
          onSuccess={() => {
            toast.success("Producto creado con su stock inicial");
            setProductDialog(false);
            refreshStock();
          }}
        />
      )}

      {importDialog && (
        <ImportDialog
          open={true}
          onOpenChange={setImportDialog}
          onSuccess={() => {
            refreshStock();
          }}
        />
      )}

      {kardexTarget && (
        <KardexDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setKardexTarget(null);
          }}
          productName={kardexTarget.productName}
          warehouseName={kardexTarget.warehouseName}
          movements={kardex}
          isLoading={kardexLoading}
          onAdjust={
            canAdjust
              ? () => {
                  setMovementDialog({
                    type: "AJUSTE",
                    productId: kardexTarget.productId,
                    warehouseId: kardexTarget.warehouseId,
                  });
                  setKardexTarget(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
