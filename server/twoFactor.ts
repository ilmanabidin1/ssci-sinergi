import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import QRCode from "qrcode";
import { ENV } from "./_core/env";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;
const ISSUER = "SSCI BPRS";

export function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of Array.from(bytes)) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/, "").replace(/\s/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of Array.from(clean)) {
    const index = BASE32.indexOf(char);
    if (index === -1) throw new Error("Invalid base32 secret");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function totpAt(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** DIGITS;
  return String(code).padStart(DIGITS, "0");
}

export function currentStep(now = Date.now()): number {
  return Math.floor(now / 1000 / STEP_SECONDS);
}

/**
 * Returns the matched time step (to block replay of the same code), or null.
 * Accepts one step of clock drift either way.
 */
export function verifyTotp(secret: string, code: string, options: { now?: number; lastUsedStep?: number | null } = {}): number | null {
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return null;
  const step = currentStep(options.now);
  for (const candidate of [step - 1, step, step + 1]) {
    if (options.lastUsedStep !== null && options.lastUsedStep !== undefined && candidate <= options.lastUsedStep) continue;
    const expected = Buffer.from(totpAt(secret, candidate));
    const given = Buffer.from(normalized);
    if (expected.length === given.length && timingSafeEqual(expected, given)) return candidate;
  }
  return null;
}

function encryptionKey(): Buffer {
  return createHash("sha256").update(`${ENV.cookieSecret}:ssci-totp`).digest();
}

export function encryptSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptSecret(payload: string): string {
  const [version, iv, tag, data] = payload.split(":");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Unsupported secret format");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}

export async function buildEnrollment(secret: string, accountLabel: string) {
  const label = encodeURIComponent(`${ISSUER}:${accountLabel}`);
  const otpauthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 220, color: { dark: "#14213d", light: "#ffffff" } });
  return { otpauthUrl, qrDataUrl, secret };
}

// Simple in-memory limiter for failed sign-in attempts (per email + IP).
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; firstAt: number }>();

export function isLoginLocked(key: string, now = Date.now()): boolean {
  const entry = failures.get(key);
  if (!entry) return false;
  if (now - entry.firstAt > WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

export function recordLoginFailure(key: string, now = Date.now()) {
  const entry = failures.get(key);
  if (!entry || now - entry.firstAt > WINDOW_MS) failures.set(key, { count: 1, firstAt: now });
  else entry.count += 1;
}

export function clearLoginFailures(key: string) {
  failures.delete(key);
}
