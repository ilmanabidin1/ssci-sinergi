import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export const MAX_LOGO_SIZE = 2 * 1024 * 1024;
export const LOGO_CONTENT_TYPES = ["image/png", "image/jpeg", "image/svg+xml"] as const;
export type LogoContentType = (typeof LOGO_CONTENT_TYPES)[number];

export class LogoUploadError extends Error {}

export function decodeLogo(data: string, contentType: LogoContentType): Buffer {
  const value = data.replace(/^data:[^;]+;base64,/, "");
  if (!value || !/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 === 1) {
    throw new LogoUploadError("Data logo bukan base64 yang valid");
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.length === 0 || bytes.length > MAX_LOGO_SIZE) {
    throw new LogoUploadError("Logo harus berukuran maksimal 2 MB");
  }

  if (contentType === "image/png") {
    const isPng =
      bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (!isPng) throw new LogoUploadError("File bukan PNG yang valid");
  } else if (contentType === "image/jpeg") {
    const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (!isJpeg) throw new LogoUploadError("File bukan JPG yang valid");
  }

  return bytes;
}

function extensionForContentType(contentType: LogoContentType): string {
  return { "image/png": "png", "image/jpeg": "jpg", "image/svg+xml": "svg" }[contentType];
}

export async function storeLogo(bytes: Buffer, contentType: LogoContentType): Promise<string> {
  const directory = process.env.UPLOAD_DIR || "/data/uploads";
  await mkdir(directory, { recursive: true });
  const storedName = `${randomUUID()}.${extensionForContentType(contentType)}`;
  await writeFile(join(directory, storedName), bytes, { flag: "wx" });
  return storedName;
}
