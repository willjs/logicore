import { Workbook } from "exceljs";

import { withApi } from "@/lib/api";
import { dateStamp } from "@/lib/inventory-io";

export const GET = withApi(
  async () => {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet("Productos");
    sheet.columns = [
      { header: "Producto", key: "product", width: 32 },
      { header: "Marca", key: "brand", width: 18 },
      { header: "Categoría", key: "category", width: 18 },
      { header: "Serial", key: "serial", width: 20 },
      { header: "Valor Unitario", key: "price", width: 14 },
      { header: "Cantidad", key: "quantity", width: 10 },
      { header: "Bodega", key: "warehouse", width: 20 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: "middle" };
    headerRow.height = 20;

    sheet.addRow({
      product: "Ejemplo: Cemento Gris 50kg",
      brand: "Hormigón",
      category: "Materiales",
      serial: "CEM-001",
      price: 25000,
      quantity: 100,
      warehouse: "Bodega Principal",
    });

    sheet.getColumn("price").numFmt = '"$"#,##0.00';
    sheet.getColumn("quantity").numFmt = "0";
    sheet.autoFilter = { from: "A1", to: "G1" };

    const buffer = await workbook.xlsx.writeBuffer();
    const stamp = dateStamp(new Date());
    const filename = `plantilla_inventario_${stamp}.xlsx`;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  },
  { permissions: ["import.run"] },
);
