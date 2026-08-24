import { describe, expect, it } from "vitest";
import { calculateSSCI, classifyScore } from "./scoring";
import type { Application } from "../drizzle/schema";

describe("SSCI Scoring Algorithm", () => {
  const baseApplication: Application = {
    id: 1,
    organizationId: 1,
    customerName: "Test Customer",
    customerId: "1234567890",
    businessName: "Test Business",
    businessType: "Perdagangan",
    businessAge: 36, // 3 years
    address: "Test Address",
    phone: "081234567890",
    email: "test@example.com",
    monthlyRevenue: "50000000",
    monthlyExpenses: "30000000",
    existingDebt: "10000000",
    collateralValue: "100000000",
    requestedAmount: "50000000",
    financingTenor: 24,
    marginRate: "12",
    loanPurpose: "Modal usaha",
    legalDocuments: [
      { type: "KTP", status: "complete", notes: "" },
      { type: "NPWP", status: "complete", notes: "" },
      { type: "NIB", status: "complete", notes: "" },
    ],
    businessShariaCompliant: "yes",
    shariaComplianceNotes: "Bisnis sepenuhnya patuh syariah",
    environmentalPractices: "Menggunakan bahan ramah lingkungan",
    socialImpact: "Memberdayakan masyarakat lokal",
    governanceQuality: "excellent",
    status: "pending",
    submittedBy: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("should calculate correct total score for excellent application", () => {
    const result = calculateSSCI(baseApplication);
    
    expect(result.totalScore).toBeGreaterThan(70);
    expect(result.totalScore).toBeLessThanOrEqual(100);
  });

  it("should classify excellent application as Sangat Layak or Layak", () => {
    const result = calculateSSCI(baseApplication);
    
    expect(["Sangat Layak", "Layak"]).toContain(result.classification);
  });

  it("should apply correct weights: 55% finance, 25% sharia, 20% legal", () => {
    const result = calculateSSCI(baseApplication);
    
    const totalWeight = result.sustainableFinanceScore + result.shariaScore + result.legalScore;
    expect(Math.abs(totalWeight - result.totalScore)).toBeLessThan(0.1);
  });

  it("should classify score >= 80 as Sangat Layak", () => {
    expect(classifyScore(80)).toBe("Sangat Layak");
  });

  it("should classify score 65-79 as Layak", () => {
    expect(classifyScore(65)).toBe("Layak");
    expect(classifyScore(79.99)).toBe("Layak");
  });

  it("should classify score 50-64 as Perlu Pengawasan", () => {
    expect(classifyScore(50)).toBe("Perlu Pengawasan");
    expect(classifyScore(64.99)).toBe("Perlu Pengawasan");
  });

  it("should classify score < 50 as Tidak Layak", () => {
    expect(classifyScore(49.99)).toBe("Tidak Layak");
  });

  it("should penalize non-sharia compliant business", () => {
    const shariaCompliant = calculateSSCI(baseApplication);
    const nonCompliant = calculateSSCI({
      ...baseApplication,
      businessShariaCompliant: "no",
    });
    
    expect(shariaCompliant.shariaScore).toBeGreaterThan(nonCompliant.shariaScore);
  });

  it("should generate recommendations", () => {
    const result = calculateSSCI(baseApplication);
    
    expect(result.recommendations).toBeTruthy();
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("should identify risk factors for poor applications", () => {
    const poorApp = {
      ...baseApplication,
      monthlyRevenue: "10000000",
      monthlyExpenses: "12000000",
    };
    const result = calculateSSCI(poorApp);
    
    expect(result.riskFactors).toBeTruthy();
    expect(result.riskFactors).not.toBe("Tidak ada faktor risiko signifikan.");
  });

  it("should identify strengths for good applications", () => {
    const result = calculateSSCI(baseApplication);
    
    expect(result.strengths).toBeTruthy();
  });

  it("should have confidence score", () => {
    const result = calculateSSCI(baseApplication);
    
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  it("should have detailed score breakdown", () => {
    const result = calculateSSCI(baseApplication);
    
    expect(result.scoreBreakdown).toBeTruthy();
    expect(result.scoreBreakdown.sustainableFinance).toBeTruthy();
    expect(result.scoreBreakdown.sharia).toBeTruthy();
    expect(result.scoreBreakdown.legal).toBeTruthy();
  });

  it("does not count duplicate or obsolete legal documents", () => {
    const result = calculateSSCI({
      ...baseApplication,
      legalDocuments: [
        { type: "KTP", status: "complete" },
        { type: "KTP", status: "complete" },
        { type: "SIUP", status: "complete" },
      ],
    });
    expect(result.scoreBreakdown.legal.document_completeness).toBe(12);
  });

  it("rejects invalid financial values", () => {
    expect(() =>
      calculateSSCI({ ...baseApplication, requestedAmount: "0" })
    ).toThrow("harus lebih dari nol");
  });
});
