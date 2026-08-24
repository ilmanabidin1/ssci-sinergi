import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;
export const DOCUMENT_TYPES = ["KTP", "NPWP", "NIB"] as const;
export const CONTENT_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export type DocumentContentType = (typeof CONTENT_TYPES)[number];

export function sanitizeOriginalName(name: string) {
  return name.replace(/[\\/\0\x00-\x1f\x7f]/g, "_").trim() || "document";
}

export function decodeDocumentData(data: string): Buffer {
  const value = data.replace(/^data:[^;]+;base64,/, "");
  if (!value || !/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 === 1) throw new Error("Invalid base64 data");
  const bytes = Buffer.from(value, "base64");
  if (bytes.length === 0 || bytes.length > MAX_DOCUMENT_SIZE) throw new Error("Document exceeds 5MB or is empty");
  return bytes;
}

export function extensionForContentType(contentType: DocumentContentType) {
  return { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" }[contentType];
}

export async function storeDocument(bytes: Buffer, contentType: DocumentContentType) {
  const directory = process.env.UPLOAD_DIR || "/data/uploads";
  await mkdir(directory, { recursive: true });
  const storedName = `${randomUUID()}.${extensionForContentType(contentType)}`;
  await writeFile(join(directory, storedName), bytes, { flag: "wx" });
  return storedName;
}
