import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { ENV } from "./_core/env";
import * as db from "./db";

const scrypt = promisify(scryptCallback);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, encodedHash: string) {
  const [algorithm, salt, hash] = encodedHash.split(":");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  const storedKey = Buffer.from(hash, "hex");
  const derivedKey = (await scrypt(password, salt, storedKey.length)) as Buffer;
  return storedKey.length === derivedKey.length && timingSafeEqual(storedKey, derivedKey);
}

export async function ensurePilotAdmin() {
  if (!ENV.pilotAdminEmail || !ENV.pilotAdminPassword) return;
  const email = ENV.pilotAdminEmail.trim().toLowerCase();
  const existing = await db.getUserByEmail(email);
  if (existing) return;

  await db.createPilotAdmin({
    email,
    name: "Administrator SSCI",
    passwordHash: await hashPassword(ENV.pilotAdminPassword),
  });
  console.log("[Auth] Pilot administrator provisioned");
}
