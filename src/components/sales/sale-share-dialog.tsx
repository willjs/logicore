"use client";

import { useMemo } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Download, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface SaleShareData {
  id: number;
  saleNumber: string;
  total: number;
  customer: { name: string; phone: string | null };
  items: { product: { name: string }; quantity: number; unitPrice: number }[];
  pendingBalance: number;
}

const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function WhatsAppShareDialog({
  open,
  onOpenChange,
  sale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: SaleShareData | null;
}) {
  const dateText = new Date().toLocaleDateString("es-CO", { dateStyle: "long" });
  const timeText = new Date().toLocaleTimeString("es-CO", { timeStyle: "short" });

  const receiptText = useMemo(() => {
    if (!sale) return "";
    const lines = [
      `*COMPROBANTE DE VENTA*`,
      `Venta: ${sale.saleNumber}`,
      `Fecha: ${dateText} ${timeText}`,
      `Cliente: ${sale.customer.name}`,
    ];
    lines.push("");
    lines.push(`*Detalle:*`);
    for (const item of sale.items) {
      lines.push(`• ${item.product.name} x${item.quantity} - ${currency.format(item.unitPrice)}`);
    }
    lines.push("");
    lines.push(`*Total: ${currency.format(sale.total)}*`);
    if (sale.pendingBalance > 0) {
      lines.push(`Saldo pendiente: ${currency.format(sale.pendingBalance)}`);
    }
    return lines.join("\n");
  }, [sale, dateText, timeText]);

  if (!sale) return null;
  const currentSale = sale;

  function openWhatsApp() {
    const phone = (currentSale.customer.phone ?? "").replace(/\D/g, "");
    const url = `https://wa.me/${phone ? phone : ""}?text=${encodeURIComponent(receiptText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function downloadPdf() {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(14);
    doc.text("COMPROBANTE DE VENTA", 14, 20);
    doc.setFontSize(10);
    doc.text(`Venta: ${currentSale.saleNumber}`, 14, 30);
    doc.text(`Fecha: ${dateText} ${timeText}`, 14, 36);
    doc.text(`Cliente: ${currentSale.customer.name}`, 14, 42);
    if (currentSale.customer.phone) doc.text(`Teléfono: ${currentSale.customer.phone}`, 14, 48);
    autoTable(doc, {
      startY: 56,
      head: [["Producto", "Cant", "Precio", "Total"]],
      body: currentSale.items.map((item) => [
        item.product.name,
        String(item.quantity),
        currency.format(item.unitPrice),
        currency.format(item.quantity * item.unitPrice),
      ]),
      styles: { fontSize: 9 },
    });
    const finalY =
      (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 56;
    doc.setFontSize(12);
    doc.text(`Total: ${currency.format(currentSale.total)}`, pageWidth - 14, finalY + 12, {
      align: "right",
    });
    if (currentSale.pendingBalance > 0) {
      doc.setFontSize(10);
      doc.text(
        `Saldo pendiente: ${currency.format(currentSale.pendingBalance)}`,
        pageWidth - 14,
        finalY + 18,
        { align: "right" },
      );
    }
    doc.save(`comprobante-${currentSale.saleNumber}.pdf`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Venta registrada</DialogTitle>
          <DialogDescription>
            Comparte el comprobante de la venta{" "}
            <span className="font-medium">{sale.saleNumber}</span> por WhatsApp.
          </DialogDescription>
        </DialogHeader>
        <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs">
          {receiptText}
        </pre>
        <DialogFooter className="gap-2 sm:justify-start">
          <Button variant="outline" onClick={downloadPdf}>
            <Download /> Descargar PDF
          </Button>
          <Button onClick={openWhatsApp}>
            <MessageCircle /> WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}