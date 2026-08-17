import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { withApi, ok } from "@/lib/api";
import { buildReport } from "@/lib/services/report.service";
import { formatMoney } from "@/lib/inventory-io";

const BLUE = [24, 55, 90] as [number, number, number];
const LIGHT_GRAY = [235, 235, 235] as [number, number, number];
const DARK = [30, 30, 30] as [number, number, number];
const WHITE = [255, 255, 255] as [number, number, number];

const STATUS_LABELS: Record<string, string> = {
  PAGADO: "Pagado",
  ABONO: "Abono",
  PENDIENTE: "Pendiente",
};

function formatDate(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("es-CO", { dateStyle: "short" });
}

export const GET = withApi(
  async ({ req, session }) => {
    const rawFrom = req.nextUrl.searchParams.get("from");
    const rawTo = req.nextUrl.searchParams.get("to");
    const from = rawFrom ? new Date(`${rawFrom}T00:00:00`) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = rawTo ? new Date(`${rawTo}T23:59:59.999`) : new Date();

    const report = await buildReport(session.company.id, from, to);

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 10;

    // --- Logo + Header ---
    if (session.company.logo) {
      try {
        let imgData = "";
        if (session.company.logo.startsWith("data:")) {
          imgData = session.company.logo;
        } else {
          const imgRes = await fetch(session.company.logo);
          const buf = await imgRes.arrayBuffer();
          const b64 = Buffer.from(buf).toString("base64");
          const ext = session.company.logo.split(".").pop()?.toLowerCase() ?? "png";
          imgData = `data:image/${ext};base64,${b64}`;
        }
        doc.addImage(imgData, "PNG", 14, y, 20, 20);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(...BLUE);
        doc.text(session.company.name, 38, y + 9);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...DARK);
        doc.text("Reporte de Ventas", 38, y + 15);
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(
          `${formatDate(from)} — ${formatDate(to)}`,
          38,
          y + 20,
        );
        doc.text(
          `Generado el ${new Date().toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" })}`,
          38,
          y + 25,
        );
        y += 30;
      } catch {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(...BLUE);
        doc.text(session.company.name, 14, y + 10);
        y += 15;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...DARK);
        doc.text("Reporte de Ventas", 14, y + 5);
        y += 8;
      }
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...BLUE);
      doc.text(session.company.name, 14, y + 10);
      y += 15;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...DARK);
      doc.text("Reporte de Ventas", 14, y + 5);
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `Período: ${formatDate(from)} — ${formatDate(to)}`,
        14,
        y + 10,
      );
      doc.text(
        `Generado el ${new Date().toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" })}`,
        14,
        y + 15,
      );
      y += 22;
    }

    // --- Separator line ---
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.5);
    doc.line(14, y, pageWidth - 14, y);
    y += 6;

    // --- Summary ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BLUE);
    doc.text("Resumen del período", 14, y);
    y += 6;

    const { summary } = report;
    autoTable(doc, {
      startY: y,
      body: [
        ["Ventas del período", String(summary.salesCount)],
        ["Ingresos totales", formatMoney(summary.totalSales)],
        ["Cobrado", formatMoney(summary.totalPaid)],
        ["Cartera pendiente", formatMoney(summary.carteraTotal)],
      ],
      styles: { fontSize: 9, cellPadding: 2, textColor: DARK },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 55 }, 1: { halign: "right" } },
      margin: { left: 14, right: 14 },
      theme: "plain",
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

    // --- Sales by status + method ---
    if (report.byStatus.length > 0 || report.byMethod.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...BLUE);
      doc.text("Desglose por estado y método de pago", 14, y);
      y += 6;

      const desgloseBody: string[][] = [];
      for (const s of report.byStatus) {
        desgloseBody.push([
          STATUS_LABELS[s.status] ?? s.status,
          String(s.count),
          formatMoney(s.total),
        ]);
      }
      for (const m of report.byMethod) {
        desgloseBody.push([
          m.method === "EFECTIVO" ? "Efectivo" : "Transferencia",
          String(m.count),
          formatMoney(m.amount),
        ]);
      }

      autoTable(doc, {
        startY: y,
        head: [["Categoría", "N.º", "Monto"]],
        body: desgloseBody,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [...BLUE], textColor: [...WHITE], fontSize: 8 },
        margin: { left: 14, right: 14 },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
    }

    // --- Top products ---
    if (report.topProducts.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...BLUE);
      doc.text("Productos más vendidos", 14, y);
      y += 6;

      autoTable(doc, {
        startY: y,
        head: [["Producto", "Unidades", "Ingresos"]],
        body: report.topProducts.map((p) => [
          p.name,
          String(p.units),
          formatMoney(p.revenue),
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [...BLUE], textColor: [...WHITE], fontSize: 8 },
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
    }

    // --- Top customers ---
    if (report.topCustomers.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...BLUE);
      doc.text("Mejores clientes", 14, y);
      y += 6;

      autoTable(doc, {
        startY: y,
        head: [["Cliente", "Ventas", "Ingresos"]],
        body: report.topCustomers.map((c) => [
          c.name,
          String(c.count),
          formatMoney(c.revenue),
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [...BLUE], textColor: [...WHITE], fontSize: 8 },
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
    }

    // --- Daily sales ---
    if (report.daily.length > 0) {
      const remainingSpace = doc.internal.pageSize.getHeight() - y - 14;
      if (remainingSpace < 30) {
        doc.addPage();
        y = 14;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...BLUE);
      doc.text("Ventas por día", 14, y);
      y += 6;

      autoTable(doc, {
        startY: y,
        head: [["Fecha", "N.º ventas", "Total"]],
        body: report.daily.map((d) => [
          formatDate(d.day),
          String(d.count),
          formatMoney(d.total),
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [...BLUE], textColor: [...WHITE], fontSize: 8 },
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
    }

    // --- Cartera ---
    if (report.cartera.length > 0) {
      const remainingSpace = doc.internal.pageSize.getHeight() - y - 14;
      if (remainingSpace < 30) {
        doc.addPage();
        y = 14;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...BLUE);
      doc.text("Cuentas por cobrar", 14, y);
      y += 6;

      autoTable(doc, {
        startY: y,
        head: [["Factura", "Cliente", "Fecha", "Total", "Abonado", "Saldo", "Estado"]],
        body: report.cartera.map((c) => [
          c.saleNumber,
          c.customerName,
          formatDate(c.saleDate),
          formatMoney(c.total),
          formatMoney(c.paid),
          formatMoney(c.balance),
          STATUS_LABELS[c.status] ?? c.status,
        ]),
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [...BLUE], textColor: [...WHITE], fontSize: 7 },
        columnStyles: {
          3: { halign: "right" },
          4: { halign: "right" },
          5: { halign: "right", fontStyle: "bold" },
        },
        margin: { left: 14, right: 14 },
      });
    }

    // --- Footer on every page ---
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `${session.company.name} — Página ${i} de ${totalPages}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 6,
        { align: "center" },
      );
    }

    const buffer = Buffer.from(doc.output("arraybuffer"));
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `reporte_ventas_${stamp}.pdf`;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  },
  { permissions: ["reports.view"] },
);
