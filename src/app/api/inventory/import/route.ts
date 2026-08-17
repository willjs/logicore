import { Workbook } from "exceljs";

import { withApi, ApiError, ok } from "@/lib/api";
import { mapHeaders, parseCsv } from "@/lib/inventory-io";
import { importProductsAndStock, type InventoryImportRow } from "@/lib/services/inventory.service";

const MAX_SIZE = 5 * 1024 * 1024;

function toNumber(raw: string): number | null {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/[$€]/g, "").replace(/\s+/g, "");
  if (!s) return null;
  let normalized = s;
  if (s.includes(",") && s.includes(".")) {
    normalized = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    normalized = s.replace(",", ".");
  } else {
    normalized = s.replace(/\./g, "");
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function buildRows(grid: string[][]): InventoryImportRow[] {
  if (grid.length === 0) {
    throw new ApiError("El archivo está vacío", 400, "EMPTY_FILE");
  }
  const headers = grid[0].map((cell) => cell.trim());
  const columnIndex = mapHeaders(headers);
  const required = ["product", "quantity"];
  for (const field of required) {
    if (columnIndex[field] === undefined) {
      throw new ApiError(
        `Falta la columna "${field === "product" ? "Producto" : "Cantidad"}" en el archivo`,
        400,
        "INVALID_HEADERS",
      );
    }
  }

  const rows: InventoryImportRow[] = [];
  for (let i = 1; i < grid.length; i++) {
    const cells = grid[i];
    const get = (field: string) =>
      columnIndex[field] !== undefined && columnIndex[field] < cells.length
        ? cells[columnIndex[field]].trim()
        : "";

    const productName = get("product");
    const quantityRaw = get("quantity");
    if (!productName && !quantityRaw) continue;

    const quantity = toNumber(quantityRaw);
    const price = toNumber(get("price"));

    rows.push({
      rowNumber: i + 1,
      productName,
      brandName: get("brand") || null,
      categoryName: get("category") || null,
      serial: get("serial") || null,
      salePrice: price,
      quantity: quantity ?? NaN,
      warehouseName: get("warehouse") || null,
    });
  }

  if (rows.length === 0) {
    throw new ApiError("El archivo no contiene filas de datos", 400, "EMPTY_FILE");
  }

  return rows;
}

async function readGrid(buffer: Buffer, filename: string): Promise<string[][]> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv")) {
    return parseCsv(buffer.toString("utf8"));
  }
  if (lower.endsWith(".xlsx")) {
    const workbook = new Workbook();
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new ApiError("El archivo no contiene hojas", 400, "EMPTY_FILE");
    }
    const grid: string[][] = [];
    sheet.eachRow((row) => {
      const values = (row.values as unknown[]).slice(1);
      grid.push(values.map((value) => (value == null ? "" : String(value))));
    });
    return grid;
  }
  throw new ApiError("Formato no permitido. Sube un archivo .xlsx o .csv", 400, "INVALID_FORMAT");
}

export const POST = withApi(
  async ({ req, session }) => {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ApiError("Selecciona un archivo Excel", 400, "FILE_REQUIRED");
    }
    if (file.size > MAX_SIZE) {
      throw new ApiError("El archivo no puede superar 5 MB", 400, "FILE_TOO_LARGE");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const grid = await readGrid(buffer, file.name);
    const rows = buildRows(grid);

    const result = await importProductsAndStock(session.company.id, session.user.id, rows);
    return ok(result);
  },
  { permissions: ["import.run"] },
);
