"use client";

import { useEffect, useState } from "react";
import { BarChart3, CalendarRange, FileText, Download, TrendingUp, Users, Package, CircleDollarSign } from "lucide-react";

import { apiFetch } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

interface DailyRow {
  day: string;
  count: number;
  total: number;
}

interface StatusRow {
  status: "PAGADO" | "ABONO" | "PENDIENTE";
  count: number;
  total: number;
}

interface MethodRow {
  method: "EFECTIVO" | "TRANSFERENCIA";
  count: number;
  amount: number;
}

interface ProductRow {
  productId: number;
  name: string;
  units: number;
  revenue: number;
}

interface CustomerRow {
  customerId: number;
  name: string;
  count: number;
  revenue: number;
}

interface CarteraRow {
  saleId: number;
  saleNumber: string;
  saleDate: string;
  customerName: string;
  total: number;
  paid: number;
  balance: number;
  status: "PAGADO" | "ABONO" | "PENDIENTE";
}

interface Report {
  range: { from: string; to: string };
  summary: {
    salesCount: number;
    totalSales: number;
    totalPaid: number;
    carteraTotal: number;
  };
  daily: DailyRow[];
  byStatus: StatusRow[];
  byMethod: MethodRow[];
  topProducts: ProductRow[];
  topCustomers: CustomerRow[];
  cartera: CarteraRow[];
}

const STATUS_LABELS: Record<string, string> = {
  PAGADO: "Pagado",
  ABONO: "Abono",
  PENDIENTE: "Pendiente",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  PAGADO: "default",
  ABONO: "secondary",
  PENDIENTE: "outline",
};

const METHOD_LABELS: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", { dateStyle: "short" });

function toInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

const DEFAULT_FROM = toInput(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
const DEFAULT_TO = toInput(new Date());

export function ReportsClient() {
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function fetchReport() {
    return apiFetch<Report>(`/api/reports?from=${from}&to=${to}`);
  }

  function loadReport() {
    setLoading(true);
    setError(null);
    fetchReport()
      .then(setReport)
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar el reporte"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchReport()
      .then(setReport)
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar el reporte"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function exportPdf() {
    setExporting(true);
    try {
      const res = await fetch(`/api/reports/pdf?from=${from}&to=${to}`);
      if (!res.ok) throw new Error("Error al generar el PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte_${from}_${to}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al exportar PDF");
    } finally {
      setExporting(false);
    }
  }

  const maxDaily = report ? Math.max(1, ...report.daily.map((d) => d.count)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reportes</h1>
          <p className="text-muted-foreground">
            Ventas, productos y cuentas por cobrar por rango de fechas.
          </p>
        </div>
        {report && (
          <Button variant="outline" className="w-full sm:w-auto" onClick={exportPdf} disabled={exporting}>
            <Download className="mr-1 size-4" />
            {exporting ? "Generando…" : "Exportar PDF"}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="from">Desde</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to">Hasta</Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
          <Button onClick={loadReport} disabled={loading}>
            <CalendarRange className="mr-1 size-4" />
            {loading ? "Consultando…" : "Consultar"}
          </Button>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {report && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100">
                    <TrendingUp className="size-5 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ventas del período</p>
                    <p className="text-2xl font-bold">{report.summary.salesCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-green-100">
                    <CircleDollarSign className="size-5 text-green-700" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ingresos</p>
                    <p className="text-2xl font-bold">{currency.format(report.summary.totalSales)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100">
                    <CircleDollarSign className="size-5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cobrado</p>
                    <p className="text-2xl font-bold">{currency.format(report.summary.totalPaid)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100">
                    <FileText className="size-5 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cartera pendiente</p>
                    <p className="text-2xl font-bold">{currency.format(report.summary.carteraTotal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {report.byStatus.map((row) => (
              <Card key={row.status}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABELS[row.status]}</Badge>
                    <span className="text-xs text-muted-foreground">{row.count} ventas</span>
                  </div>
                  <p className="mt-2 text-xl font-bold">{currency.format(row.total)}</p>
                </CardContent>
              </Card>
            ))}
            {report.byMethod.map((row) => (
              <Card key={row.method}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{METHOD_LABELS[row.method]}</Badge>
                    <span className="text-xs text-muted-foreground">{row.count} pagos</span>
                  </div>
                  <p className="mt-2 text-xl font-bold">{currency.format(row.amount)}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                <CalendarRange className="mr-2 inline size-4 text-muted-foreground" />
                Ventas por día
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.daily.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">Sin ventas en el período</p>
              ) : (
                <div className="space-y-2">
                  {report.daily.map((row) => (
                    <div key={row.day} className="flex items-center gap-3">
                      <span className="w-24 text-sm text-muted-foreground">
                        {formatDate(row.day)}
                      </span>
                      <div className="h-6 flex-1 overflow-hidden rounded bg-muted">
                        <div
                          className="flex h-full items-center rounded bg-primary/80 px-2"
                          style={{ width: `${(row.count / maxDaily) * 100}%` }}
                        >
                          <span className="text-xs font-medium text-primary-foreground">
                            {row.count}
                          </span>
                        </div>
                      </div>
                      <span className="w-28 text-right text-sm font-medium">
                        {currency.format(row.total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  <Package className="mr-2 inline size-4 text-muted-foreground" />
                  Productos más vendidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.topProducts.length === 0 ? (
                  <p className="py-6 text-center text-muted-foreground">Sin ventas en el período</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Unidades</TableHead>
                        <TableHead className="text-right">Ingresos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.topProducts.map((row) => (
                        <TableRow key={row.productId}>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell className="text-right">{row.units}</TableCell>
                          <TableCell className="text-right font-medium">
                            {currency.format(row.revenue)}
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
                <CardTitle>
                  <Users className="mr-2 inline size-4 text-muted-foreground" />
                  Mejores clientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.topCustomers.length === 0 ? (
                  <p className="py-6 text-center text-muted-foreground">Sin ventas en el período</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Ventas</TableHead>
                        <TableHead className="text-right">Ingresos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.topCustomers.map((row) => (
                        <TableRow key={row.customerId}>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell className="text-right">{row.count}</TableCell>
                          <TableCell className="text-right font-medium">
                            {currency.format(row.revenue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {report.cartera.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <FileText className="mr-2 inline size-4 text-muted-foreground" />
                  Cuentas por cobrar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Factura</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Abonado</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.cartera.map((row) => (
                      <TableRow key={row.saleId}>
                        <TableCell className="font-medium">{row.saleNumber}</TableCell>
                        <TableCell>{row.customerName}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDate(row.saleDate)}
                        </TableCell>
                        <TableCell className="text-right">{currency.format(row.total)}</TableCell>
                        <TableCell className="text-right">{currency.format(row.paid)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {currency.format(row.balance)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[row.status]}>
                            {STATUS_LABELS[row.status]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
