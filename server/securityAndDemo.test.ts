import { describe, expect, it } from "vitest";
import { buildDemoScenario } from "@shared/demoData";
import { bprsProfileSchema, checksForTemplate, scoreForTemplate, templateFor } from "@shared/bprsTemplate";
import { isSameActor, maskNik } from "@shared/privacy";
import { ruleConsistencyIssues } from "./aiAssist";
import {
  base32Decode,
  base32Encode,
  clearLoginFailures,
  decryptSecret,
  encryptSecret,
  generateTotpSecret,
  isLoginLocked,
  recordLoginFailure,
  totpAt,
  verifyTotp,
} from "./twoFactor";

describe("TOTP", () => {
  const rfcSecret = base32Encode(Buffer.from("12345678901234567890"));

  it("matches the RFC 6238 SHA1 test vectors (last 6 digits)", () => {
    expect(rfcSecret).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
    expect(totpAt(rfcSecret, Math.floor(59 / 30))).toBe("287082");
    expect(totpAt(rfcSecret, Math.floor(1111111109 / 30))).toBe("081804");
    expect(totpAt(rfcSecret, Math.floor(1234567890 / 30))).toBe("005924");
  });

  it("round-trips base32", () => {
    const bytes = Buffer.from([0, 1, 2, 250, 255, 128, 77]);
    expect(base32Decode(base32Encode(bytes)).equals(bytes)).toBe(true);
  });

  it("accepts the current code with one step of drift and rejects replay", () => {
    const secret = generateTotpSecret();
    const now = 1_790_000_000_000;
    const step = Math.floor(now / 30_000);
    expect(verifyTotp(secret, totpAt(secret, step), { now })).toBe(step);
    expect(verifyTotp(secret, totpAt(secret, step - 1), { now })).toBe(step - 1);
    expect(verifyTotp(secret, totpAt(secret, step - 3), { now })).toBeNull();
    expect(verifyTotp(secret, totpAt(secret, step), { now, lastUsedStep: step })).toBeNull();
    expect(verifyTotp(secret, "abc123", { now })).toBeNull();
  });

  it("encrypts secrets at rest", () => {
    const secret = generateTotpSecret();
    const stored = encryptSecret(secret);
    expect(stored).not.toContain(secret);
    expect(decryptSecret(stored)).toBe(secret);
    const tampered = stored.slice(0, -2) + (stored.endsWith("A") ? "BB" : "AA");
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("locks sign-in after five failures", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(isLoginLocked(key)).toBe(false);
      recordLoginFailure(key);
    }
    expect(isLoginLocked(key)).toBe(true);
    clearLoginFailures(key);
    expect(isLoginLocked(key)).toBe(false);
  });
});

describe("privacy and maker-checker", () => {
  it("masks NIK keeping the first and last four digits", () => {
    expect(maskNik("3273014509900123")).toBe("3273********0123");
    expect(maskNik("")).toBe("");
    expect(maskNik("123456")).toBe("****56");
  });

  it("detects when the checker is the submitter or assessor", () => {
    expect(isSameActor(5, 5, 7)).toBe(true);
    expect(isSameActor(5, 3, 5)).toBe(true);
    expect(isSameActor(5, 3, 7)).toBe(false);
    expect(isSameActor(5, null, undefined)).toBe(false);
  });
});

describe("demo data", () => {
  // Generator acak dengan seed tetap agar hasil tes dapat diulang.
  const seeded = (seed: number) => () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const today = new Date(2026, 9, 8);
  const scenarios = [
    ...Array.from({ length: 300 }, (_, i) => buildDemoScenario({ segment: "umkm", rng: seeded(i + 1), today })),
    ...Array.from({ length: 150 }, (_, i) => buildDemoScenario({ segment: "karyawan_swasta", rng: seeded(1000 + i), today })),
    ...Array.from({ length: 150 }, (_, i) => buildDemoScenario({ segment: "guru_sertifikasi", rng: seeded(5000 + i), today })),
  ];
  const toApp = (s: (typeof scenarios)[number]) => ({
    businessAge: Number(s.business.businessAge),
    monthlyRevenue: Number(s.finance.monthlyRevenue),
    monthlyExpenses: Number(s.finance.monthlyExpenses),
    existingDebt: Number(s.finance.existingDebt),
    collateralValue: Number(s.finance.collateralValue),
    requestedAmount: Number(s.finance.requestedAmount),
    financingTenor: Number(s.finance.financingTenor),
    marginRate: Number(s.finance.marginRate),
    financingAkad: "murabahah",
  });

  it("passes every SSCI data-consistency rule and stays within the 40% DSR policy", () => {
    for (const s of scenarios) {
      const app = toApp(s);
      const issues = ruleConsistencyIssues({
        ...s.customer, ...s.business, ...app,
        businessType: s.business.businessType,
        loanPurpose: s.finance.loanPurpose,
        businessShariaCompliant: "yes",
        legalDocuments: [{ type: "KTP", status: "complete" }, { type: "NPWP", status: "complete" }, { type: "NIB", status: "complete" }],
      });
      expect(issues).toEqual([]);
      const net = app.monthlyRevenue - app.monthlyExpenses;
      const installment = (app.requestedAmount * (1 + app.marginRate / 100)) / app.financingTenor;
      expect((app.existingDebt + installment) / net).toBeLessThanOrEqual(0.4);
      // Margin flat 1,25 sampai 1,75% per bulan.
      expect(app.marginRate / app.financingTenor).toBeGreaterThanOrEqual(1.25);
      expect(app.marginRate / app.financingTenor).toBeLessThanOrEqual(1.75);
      expect(app.requestedAmount).toBeGreaterThanOrEqual(5_000_000);
    }
  });

  it("uses exact BPRS option strings and has no high-severity BPRS check", () => {
    for (const s of scenarios) {
      expect(bprsProfileSchema.safeParse(s.profile).success).toBe(true);
      const kind = templateFor(s.profile, s.incomeSourceType);
      const app = toApp(s);
      expect(checksForTemplate(kind, s.profile, app, today).filter(c => c.severity === "tinggi")).toEqual([]);
      expect(scoreForTemplate(kind, s.profile, app, today).status).toBe("Layak");
    }
  });

  it("keeps the NIK, birth date, gender and business age consistent", () => {
    for (const s of scenarios) {
      const nik = s.customer.customerId;
      expect(nik).toMatch(/^\d{16}$/);
      const [year, month, day] = s.profile.tanggalLahir!.split("-").map(Number);
      const nikDay = Number(nik.slice(6, 8));
      expect(nikDay > 40 ? "Wanita" : "Pria").toBe(s.profile.jenisKelamin);
      expect(nikDay > 40 ? nikDay - 40 : nikDay).toBe(day);
      expect(Number(nik.slice(8, 10))).toBe(month);
      expect(Number(nik.slice(10, 12))).toBe(year! % 100);
      const age = today.getFullYear() - year!;
      expect(Number(s.business.businessAge) / 12).toBeLessThanOrEqual(age - 20);
      expect(s.profile.statusPerkawinan === "Lajang" ? s.profile.tanggungan : "ok").not.toBe(" 1 - 2 Orang");
    }
  });
});
