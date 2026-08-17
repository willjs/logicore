export interface StockExportItem {
  quantity: number;
  product: {
    id: number;
    name: string;
    serial: string | null;
    salePrice: unknown;
    brand: { name: string } | null;
    category: { name: string } | null;
  };
  warehouse: { id: number; name: string };
}

export interface StockExportRow {
  product: string;
  brand: string;
  category: string;
  serial: string;
  price: number;
  warehouse: string;
  quantity: number;
  total: number;
}

export function buildStockRows(stock: StockExportItem[]): StockExportRow[] {
  return stock.map((row) => {
    const price = Number(row.product.salePrice ?? 0);
    return {
      product: row.product.name,
      brand: row.product.brand?.name ?? "",
      category: row.product.category?.name ?? "",
      serial: row.product.serial ?? "",
      price,
      warehouse: row.warehouse.name,
      quantity: row.quantity,
      total: price * row.quantity,
    };
  });
}

export const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 2,
  }).format(value);

export function dateStamp(date: Date) {
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Importación: alias de columnas y parser CSV
// ---------------------------------------------------------------------------

export const IMPORT_FIELD_ALIASES: Record<string, string[]> = {
  product: ["producto", "product", "nombre", "nombre producto", "nombreproducto", "articulo", "descripcion"],
  brand: ["marca", "brand"],
  category: ["categoria", "category"],
  serial: ["serial", "referencia", "sku", "codigo", "codigo producto", "referencia interna"],
  price: ["valor unitario", "valorunitario", "precio", "valor", "price", "precio unitario", "precio venta"],
  quantity: ["cantidad", "cant", "quantity", "unidades", "stock", "qty"],
  warehouse: ["bodega", "warehouse", "almacen", "ubicacion", "location", "deposito"],
};

export function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function mapHeaders(headers: string[]): Record<string, number> {
  const columnIndex: Record<string, number> = {};
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    if (!normalized) return;
    for (const [field, aliases] of Object.entries(IMPORT_FIELD_ALIASES)) {
      if (aliases.includes(normalized) && columnIndex[field] === undefined) {
        columnIndex[field] = index;
        break;
      }
    }
  });
  return columnIndex;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  }

  return rows;
}
