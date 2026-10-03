import { describe, expect, it } from "vitest";
import { buildCustomerExplanation } from "@shared/customerExplanation";

const weak = {
  sustainableFinance: { financial_health: 10, debt_capacity: 5, cash_flow: 5, collateral: 0 },
  sharia: { business_compliance: 40, transaction_compliance: 30, documentation: 15 },
  legal: { business_legality: 20, document_completeness: 12, regulatory_compliance: 20 },
};
const strong = {
  sustainableFinance: { financial_health: 30, debt_capacity: 25, cash_flow: 25, collateral: 20 },
  sharia: { business_compliance: 40, transaction_compliance: 30, documentation: 25 },
  legal: { business_legality: 40, document_completeness: 35, regulatory_compliance: 25 },
};

describe("buildCustomerExplanation", () => {
  it("is hidden until a decision is made", () => {
    expect(buildCustomerExplanation({ status: "pending", breakdown: strong })).toBeNull();
    expect(buildCustomerExplanation({ status: "assessed", breakdown: strong })).toBeNull();
    expect(buildCustomerExplanation({ status: "approved", breakdown: null })).toBeNull();
  });

  it("gives concrete improvement steps for a rejected application", () => {
    const result = buildCustomerExplanation({
      status: "rejected",
      breakdown: weak,
      legalDocuments: [{ type: "KTP", status: "verified" }, { type: "NPWP", status: "missing" }],
    })!;
    expect(result.factors.find(f => f.aspect === "Kemampuan membayar angsuran baru")?.level).toBe("perlu diperbaiki");
    expect(result.improvements.join(" ")).toContain("tenor yang lebih panjang");
    expect(result.improvements.join(" ")).toContain("Lengkapi dokumen: NPWP");
  });

  it("shows no improvement list for approved applications and never exposes scores", () => {
    const result = buildCustomerExplanation({ status: "approved", breakdown: strong })!;
    expect(result.improvements).toEqual([]);
    expect(result.factors.every(f => f.level === "baik")).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/\d+(\.\d+)?\s*(poin|\/\s*\d)/);
  });
});
