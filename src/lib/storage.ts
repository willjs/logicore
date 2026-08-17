import { promises as fs } from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "storage");

export function storagePath(relPath: string) {
  return path.join(ROOT, relPath);
}

export async function writeStored(relPath: string, bytes: Buffer) {
  const filePath = storagePath(relPath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, bytes);
}

export async function readStored(relPath: string): Promise<Buffer | null> {
  return fs.readFile(storagePath(relPath)).catch(() => null);
}

export async function deleteStored(relPath: string): Promise<void> {
  await fs.unlink(storagePath(relPath)).catch(() => {});
}
