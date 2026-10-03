import { describe, expect, it } from "vitest";
import type { Application } from "../drizzle/schema";
import { calculateSSCI } from "./scoring";
import { runSensitivity, SENSITIVITY_INPUTS } from "./sensitivity";

const application = {
  id: 1,
  organizationId: 1,
  customerName: "Test",
  customerId: "3273014509900123",
  businessName: "Toko Sembako Berkah",
  businessType: "Perdagangan",
  businessAge: 36,
  address: "Bandung",
  phone: "081234567890",
  email: "t@example.com",
  monthlyRevenue: "50000000",
  monthlyExpenses: "30000000",
  existingDebt: "10000000",
  collateralValue: "100000000",
  requestedAmount: "50000000",
  financingTenor: 24,
  marginRate: "12",
  loanPurpose: "Pembelian stok",
  legalDocuments: [
    { type: "KTP", status: "complete" },
    { type: "NPWP", status: "complete" },
    { type: "NIB", status: "complete" },
  ],
  businessShariaCompliant: "yes",
  status: "pending",
  submittedBy: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as Application;

describe("runSensitivity", () => {
  const result = runSensitivity(application);

  it("starts from the same score as calculateSSCI and covers every input", () => {
    expect(result.base.totalScore).toBe(calculateSSCI(application).totalScore);
    expect(result.inputs.map(i => i.key)).toEqual(SENSITIVITY_INPUTS.map(i => i.key));
    for (const input of result.inputs) expect(input.points).toHaveLength(4);
  });

  it("reports deltas consistent with re-scoring the shifted input", () => {
    const revenue = result.inputs.find(i => i.key === "monthlyRevenue")!;
    const minus20 = revenue.points.find(p => p.changePct === -20)!;
    const manual = calculateSSCI({ ...application, monthlyRevenue: String(50_000_000 * 0.8) });
    expect(minus20.totalScore).toBe(manual.totalScore);
    expect(minus20.delta).toBeCloseTo(manual.totalScore - result.base.totalScore, 2);
  });

  it("finds the classification flip point when one exists", () => {
    const revenue = result.inputs.find(i => i.key === "monthlyRevenue")!;
    if (revenue.flipAtPct.down !== null) {
      const shifted = calculateSSCI({ ...application, monthlyRevenue: String(50_000_000 * (1 + revenue.flipAtPct.down / 100)) });
      expect(shifted.classification).not.toBe(result.base.classification);
    }
  });

  it("evaluates six pillar weight scenarios that keep the total at 100", () => {
    expect(result.weights).toHaveLength(6);
    for (const scenario of result.weights) {
      const w = scenario.weights;
      expect(w.sustainableFinance + w.sharia + w.legal).toBe(100);
    }
  });
});
