"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus, Search } from "lucide-react";
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

interface Brand {
  id: number;
  name: string;
  active: boolean;
}

interface Category {
  id: number;
  name: string;
  active: boolean;
}

interface Product {
  id: number;
  name: string;
  serial: string | null;
  description: string | null;
  salePrice: number;
  brandId: number | null;
  categoryId: number | null;
  brand: { id: number; name: string } | null;
  category: { id: number; name: string } | null;
  active: boolean;
}

const productSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(120),
  serial: z.string().trim().max(60).optional().or(z.literal("")),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  salePrice: z.number().nonnegative("El precio no puede ser negativo"),
});

type ProductForm = z.infer<typeof productSchema>;

const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function ProductFormDialog({
  open,
  onOpenChange,
  product,
  brands,
  categories,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
  brands: Brand[];
  categories: Category[];
  onSuccess: () => void;
}) {
  const [brandId, setBrandId] = useState<string>(product?.brandId ? String(product.brandId) : "none");
  const [categoryId, setCategoryId] = useState<string>(
    product?.categoryId ? String(product.categoryId) : "none",
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "",
      serial: product?.serial ?? "",
      description: product?.description ?? "",
      salePrice: product?.salePrice ?? 0,
    },
  });

  const isEditing = Boolean(product);

  async function onSubmit(values: ProductForm) {
    const payload = {
      name: values.name,
      serial: values.serial || null,
      description: values.description || null,
      salePrice: values.salePrice,
      brandId: brandId === "none" ? null : Number(brandId),
      categoryId: categoryId === "none" ? null : Number(categoryId),
    };
    if (isEditing) {
      await apiFetch(`/api/products/${product!.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    } else {
      await apiFetch("/api/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Actualiza los datos del producto."
              : "Registra un nuevo producto del catálogo."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" placeholder="Nombre del producto" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="serial">Serial / Referencia</Label>
              <Input id="serial" placeholder="REF-0001" {...register("serial")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salePrice">Precio de venta</Label>
              <Input
                id="salePrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                {...register("salePrice", { valueAsNumber: true })}
              />
              {errors.salePrice && (
                <p className="text-sm text-destructive">{errors.salePrice.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Marca</Label>
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin marca</SelectItem>
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" placeholder="Descripción del producto" {...register("description")} />
          </div>
          <DialogFooter>
            <Button type="submit">{isEditing ? "Guardar cambios" : "Crear producto"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProductsClient() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | undefined>(undefined);
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery({
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

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      apiFetch(`/api/products/${id}/toggle`, {
        method: "POST",
        body: JSON.stringify({ active }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const filtered = (data ?? []).filter((product) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      product.name.toLowerCase().includes(q) ||
      (product.serial ?? "").toLowerCase().includes(q) ||
      (product.brand?.name ?? "").toLowerCase().includes(q) ||
      (product.category?.name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="text-muted-foreground">
            Catálogo de productos de la empresa activa.
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setDialogOpen(true)}>
          <Plus /> Nuevo producto
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nombre, referencia, marca…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="py-8 text-center text-muted-foreground">Cargando…</p>}
          {isError && <p className="py-8 text-center text-destructive">Error al cargar los productos</p>}
          {!isLoading && !isError && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      {search ? "Sin resultados para la búsqueda" : "No hay productos registrados"}
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <span className="block font-medium">{product.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {product.serial ?? ""}
                      </span>
                    </TableCell>
                    <TableCell>{product.brand?.name ?? "—"}</TableCell>
                    <TableCell>{product.category?.name ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {currency.format(product.salePrice)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={product.active}
                          onCheckedChange={(active) =>
                            toggleMutation.mutate({ id: product.id, active })
                          }
                        />
                        <Badge variant={product.active ? "default" : "secondary"}>
                          {product.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(product);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {dialogOpen && (
        <ProductFormDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditing(undefined);
          }}
          product={editing}
          brands={brands ?? []}
          categories={categories ?? []}
          onSuccess={() => {
            toast.success(editing ? "Producto actualizado" : "Producto creado");
            setDialogOpen(false);
            setEditing(undefined);
            queryClient.invalidateQueries({ queryKey: ["products"] });
          }}
        />
      )}
    </div>
  );
}
