import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { withApi } from "@/lib/api";
import { buildStockRows, dateStamp, formatMoney } from "@/lib/inventory-io";
import { listStockByCompany } from "@/lib/services/inventory.service";

export const GET = withApi(
  async ({ session }) => {
    const stock = await listStockByCompany(session.company.id);
    const rows = buildStockRows(stock);

    let totalQuantity = 0;
    let totalValue = 0;
    const body = rows.map((row) => {
      totalQuantity += row.quantity;
      totalValue += row.total;
      return [
        row.product,
        row.brand,
        row.category,
        row.serial,
        formatMoney(row.price),
        row.warehouse,
        String(row.quantity),
        formatMoney(row.total),
      ];
    });

    const doc = new jsPDF({ unit: "mm", format: "a4" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(session.company.name, 14, 14);

    doc.setFontSize(11);
    doc.text("Reporte de Inventario", 14, 21);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `Generado el ${new Date().toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" })}`,
      14,
      27,
    );

    autoTable(doc, {
      startY: 33,
      head: [
        ["Producto", "Marca", "Categoría", "Serial", "Valor Unitario", "Bodega", "Cantidad", "Valor Total"],
      ],
      body,
      foot: [
        ["", "", "", "", "TOTAL", "", String(totalQuantity), formatMoney(totalValue)],
      ],
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [24, 55, 90], fontSize: 7 },
      footStyles: { fillColor: [235, 235, 235], textColor: [20, 20, 20], fontSize: 8, fontStyle: "bold" },
      columnStyles: {
        4: { halign: "right" },
        6: { halign: "right" },
        7: { halign: "right" },
      },
      margin: { left: 14, right: 14 },
    });

    const buffer = Buffer.from(doc.output("arraybuffer"));
    const stamp = dateStamp(new Date());
    const filename = `reporte_inventario_${stamp}.pdf`;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  },
  { permissions: ["export.run"] },
);
