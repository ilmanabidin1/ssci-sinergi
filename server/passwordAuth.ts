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
  // 1. Akun bawaan demo pemisahan fungsi (Four-Eyes Principle / KPB BPRS)
  const defaultDemoUsers: Array<{
    email: string;
    name: string;
    password: string;
    role: "maker" | "checker" | "admin";
    position: string;
  }> = [
    {
      email: "analis@bprs.id",
      name: "Ahmad Fauzi (Account Officer / Analis)",
      password: "password123",
      role: "maker",
      position: "Account Officer Pembiayaan",
    },
    {
      email: "komite@bprs.id",
      name: "Drs. H. Mulyadi (Komite Pembiayaan)",
      password: "password123",
      role: "checker",
      position: "Kepala Cabang / Pemutus",
    },
    {
      email: "admin@bprs.id",
      name: "Administrator BPRS",
      password: "password123",
      role: "admin",
      position: "Admin Sistem BPRS",
    },
  ];

  for (const demo of defaultDemoUsers) {
    const existing = await db.getUserByEmail(demo.email);
    if (!existing) {
      await db.createTeamUser({
        organizationId: 1,
        name: demo.name,
        email: demo.email,
        position: demo.position,
        passwordHash: await hashPassword(demo.password),
        role: demo.role,
      });
      console.log(`[Auth] Seeded BPRS demo user: ${demo.email} (${demo.role})`);
    }
  }

  // 2. Pilot Admin dari Environment jika dikonfigurasi
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
