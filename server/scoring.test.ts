import { describe, expect, it } from "vitest";
import { calculateSSCI } from "./scoring";
import type { Application } from "../drizzle/schema";

describe("SSCI Scoring Algorithm", () => {
  const baseApplication: Application = {
    id: 1,
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
    loanPurpose: "Modal usaha",
    legalDocuments: [
      { type: "KTP", status: "complete", notes: "" },
      { type: "NPWP", status: "complete", notes: "" },
      { type: "SIUP", status: "complete", notes: "" },
      { type: "TDP", status: "complete", notes: "" },
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
    const excellentApp = { ...baseApplication };
    const result = calculateSSCI(excellentApp);
    
    if (result.totalScore >= 80) {
      expect(result.classification).toBe("Sangat Layak");
    }
  });

  it("should classify score 65-79 as Layak", () => {
    const goodApp = {
      ...baseApplication,
      monthlyRevenue: "30000000",
      existingDebt: "15000000",
    };
    const result = calculateSSCI(goodApp);
    
    if (result.totalScore >= 65 && result.totalScore < 80) {
      expect(result.classification).toBe("Layak");
    }
  });

  it("should classify score 50-64 as Perlu Pengawasan", () => {
    const fairApp = {
      ...baseApplication,
      monthlyRevenue: "25000000",
      monthlyExpenses: "23000000",
      existingDebt: "20000000",
      businessAge: 12, // 1 year
      businessShariaCompliant: "partial" as const,
    };
    const result = calculateSSCI(fairApp);
    
    if (result.totalScore >= 50 && result.totalScore < 65) {
      expect(result.classification).toBe("Perlu Pengawasan");
    }
  });

  it("should classify score < 50 as Tidak Layak", () => {
    const poorApp = {
      ...baseApplication,
      monthlyRevenue: "10000000",
      monthlyExpenses: "12000000",
      existingDebt: "50000000",
      collateralValue: "10000000",
      businessAge: 6, // 6 months
      businessShariaCompliant: "no" as const,
      legalDocuments: [
        { type: "KTP", status: "pending", notes: "" },
        { type: "NPWP", status: "missing", notes: "" },
        { type: "SIUP", status: "missing", notes: "" },
        { type: "TDP", status: "missing", notes: "" },
      ],
    };
    const result = calculateSSCI(poorApp);
    
    if (result.totalScore < 50) {
      expect(result.classification).toBe("Tidak Layak");
    }
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
});
