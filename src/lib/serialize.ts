import { Prisma } from "@/generated/prisma/client";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  if (typeof value === "object") {
    const obj = value as { toNumber?: () => number; toString?: () => string };
    if (typeof obj.toNumber === "function") return obj.toNumber();
    if (typeof obj.toString === "function" && obj.toString !== Object.prototype.toString) {
      return Number(obj.toString()) || 0;
    }
  }
  return Number(value) || 0;
}

function isDecimal(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as { toNumber?: unknown; toString?: unknown; d?: unknown; e?: unknown; s?: unknown };
  if (typeof obj.toNumber === "function") return true;
  if (typeof obj.toString === "function" && obj.toString !== Object.prototype.toString) return true;
  return "d" in obj && "e" in obj && "s" in obj && Array.isArray(obj.d);
}

export function serialize<T>(value: T): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => serialize(item));
  if (isDecimal(value)) return toNumber(value);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = serialize(item);
    }
    return out;
  }
  return value;
}

export function serializeMany<T>(values: T[]): unknown {
  return values.map((value) => serialize(value));
}

export { Prisma };
