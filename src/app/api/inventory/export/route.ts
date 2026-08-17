import { Workbook } from "exceljs";

import { withApi } from "@/lib/api";
import { buildStockRows, dateStamp } from "@/lib/inventory-io";
import { listStockByCompany } from "@/lib/services/inventory.service";

export const GET = withApi(
  async ({ session }) => {
    const stock = await listStockByCompany(session.company.id);
    const rows = buildStockRows(stock);

    const workbook = new Workbook();
    const sheet = workbook.addWorksheet("Inventario");
    sheet.columns = [
      { header: "Producto", key: "product", width: 32 },
      { header: "Marca", key: "brand", width: 18 },
      { header: "Categoría", key: "category", width: 18 },
      { header: "Serial", key: "serial", width: 20 },
      { header: "Valor Unitario", key: "price", width: 14 },
      { header: "Bodega", key: "warehouse", width: 20 },
      { header: "Cantidad", key: "quantity", width: 10 },
      { header: "Valor Total", key: "total", width: 14 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: "middle" };
    headerRow.height = 20;

    let totalQuantity = 0;
    let totalValue = 0;
    rows.forEach((row) => {
      totalQuantity += row.quantity;
      totalValue += row.total;
      sheet.addRow({
        product: row.product,
        brand: row.brand,
        category: row.category,
        serial: row.serial,
        price: row.price,
        warehouse: row.warehouse,
        quantity: row.quantity,
        total: row.total,
      });
    });

    const totalRow = sheet.addRow({
      product: "TOTAL",
      price: null,
      quantity: totalQuantity,
      total: totalValue,
    });
    totalRow.font = { bold: true };
    totalRow.getCell("quantity").numFmt = "0";
    totalRow.getCell("total").numFmt = '"$"#,##0.00';

    sheet.getColumn("price").numFmt = '"$"#,##0.00';
    sheet.getColumn("total").numFmt = '"$"#,##0.00';
    sheet.getColumn("quantity").numFmt = "0";
    sheet.autoFilter = { from: "A1", to: "H1" };

    const buffer = await workbook.xlsx.writeBuffer();
    const stamp = dateStamp(new Date());
    const filename = `inventario_${stamp}.xlsx`;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  },
  { permissions: ["export.run"] },
);
