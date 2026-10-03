import { describe, expect, it } from "vitest";
import { demoBusiness, demoCustomer, DEMO_BUSINESSES } from "@shared/demoData";
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
  it("always produces a valid, internally consistent application", () => {
    for (let i = 0; i < 500; i++) {
      const customer = demoCustomer();
      const business = demoBusiness();
      expect(customer.customerId).toMatch(/^\d{16}$/);
      const profile = DEMO_BUSINESSES.find(p => business.businessName.startsWith(p.name));
      expect(profile?.type).toBe(business.businessType);
      const issues = ruleConsistencyIssues({
        ...customer,
        ...business,
        businessAge: Number(business.businessAge),
        monthlyRevenue: Number(business.monthlyRevenue),
        monthlyExpenses: Number(business.monthlyExpenses),
        existingDebt: Number(business.existingDebt),
        collateralValue: Number(business.collateralValue),
        requestedAmount: Number(business.requestedAmount),
        financingTenor: Number(business.financingTenor),
        marginRate: Number(business.marginRate),
        financingAkad: "murabahah",
        businessShariaCompliant: "yes",
        legalDocuments: [{ type: "KTP", status: "verified" }, { type: "NPWP", status: "verified" }, { type: "NIB", status: "verified" }],
      });
      expect(issues).toEqual([]);
    }
  });

  it("encodes gender in the NIK birth day", () => {
    for (let i = 0; i < 200; i++) {
      const customer = demoCustomer();
      const day = Number(customer.customerId.slice(6, 8));
      expect(day >= 1 && day <= 28 || day >= 41 && day <= 68).toBe(true);
    }
  });
});
