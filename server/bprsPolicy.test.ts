import { describe, expect, it } from "vitest";
import { evaluateBprsPolicy, BPRS_POLICY_CONSTANTS } from "../shared/bprsPolicy";

describe("evaluateBprsPolicy", () => {
  it("evaluates small loan (<= 10M) with Kabag Marketing authority and internal appraisal", () => {
    const result = evaluateBprsPolicy({
      requestedAmount: 10_000_000,
      collateralValue: 15_000_000,
      monthlyRevenue: 10_000_000,
      monthlyExpenses: 5_000_000,
      existingDebt: 500_000,
      tenorMonths: 12,
      marginRate: 12,
    });

    expect(result.approvalAuthority.roleTitle).toBe("Kepala Bagian Marketing");
    expect(result.appraisalRequirement.type).toBe("INTERNAL");
    expect(result.needsComplianceOpinion).toBe(false);
    expect(result.needsLegalOpinion).toBe(false);
    expect(result.isDsrCompliant).toBe(true);
  });

  it("evaluates medium loan (<= 25M) with Kepala Kantor Cabang authority", () => {
    const result = evaluateBprsPolicy({
      requestedAmount: 20_000_000,
      collateralValue: 30_000_000,
      monthlyRevenue: 15_000_000,
      monthlyExpenses: 8_000_000,
      existingDebt: 0,
      tenorMonths: 24,
      marginRate: 12,
    });

    expect(result.approvalAuthority.roleTitle).toBe("Kepala Kantor Cabang");
    expect(result.appraisalRequirement.type).toBe("INTERNAL");
    expect(result.needsComplianceOpinion).toBe(false);
    expect(result.needsLegalOpinion).toBe(false);
  });

  it("evaluates large loan (> 25M, >= 100M, >= 250M, >= 500M) triggering opinions and KJPP", () => {
    const result = evaluateBprsPolicy({
      requestedAmount: 600_000_000,
      collateralValue: 900_000_000,
      monthlyRevenue: 80_000_000,
      monthlyExpenses: 30_000_000,
      existingDebt: 5_000_000,
      tenorMonths: 36,
      marginRate: 10,
    });

    expect(result.approvalAuthority.roleTitle).toContain("Direksi");
    expect(result.appraisalRequirement.type).toBe("KJPP_EKSTERNAL");
    expect(result.needsComplianceOpinion).toBe(true);
    expect(result.needsLegalOpinion).toBe(true);
  });

  it("flags non-compliant DSR (> 40%)", () => {
    const result = evaluateBprsPolicy({
      requestedAmount: 50_000_000,
      collateralValue: 80_000_000,
      monthlyRevenue: 10_000_000,
      monthlyExpenses: 7_000_000, // netIncome = 3jt. Batas 40% = 1.2jt
      existingDebt: 1_000_000,
      tenorMonths: 12,
      marginRate: 12, // angsuran ~ 4.6jt => total commitment 5.6jt >> 1.2jt
    });

    expect(result.isDsrCompliant).toBe(false);
    expect(result.dsrRatio).toBeGreaterThan(BPRS_POLICY_CONSTANTS.MAX_DSR_RATIO);
  });

  it("supports guru_sertifikasi segment with 80% DSR allowance", () => {
    const result = evaluateBprsPolicy({
      requestedAmount: 30_000_000,
      collateralValue: 40_000_000,
      monthlyRevenue: 5_000_000, // Tunjangan sertifikasi 5jt
      monthlyExpenses: 1_000_000, // Net 4jt. 80% = 3.2jt
      existingDebt: 0,
      tenorMonths: 12,
      marginRate: 10,
      segment: "guru_sertifikasi",
    });

    expect(result.appliedMaxDsr).toBe(80);
    expect(result.isDsrCompliant).toBe(true);
  });

  it("escalates approval authority to Direktur Bisnis and Dewan Komisaris when isRelatedParty is true", () => {
    const result = evaluateBprsPolicy({
      requestedAmount: 15_000_000, // Walau nominal kecil (level Kacab), jika Pihak Terkait wajib ke Direksi & Komisaris
      collateralValue: 20_000_000,
      monthlyRevenue: 10_000_000,
      monthlyExpenses: 5_000_000,
      existingDebt: 0,
      tenorMonths: 12,
      marginRate: 10,
      isRelatedParty: true,
      relatedPartyRelation: "Anak Kandung Direksi",
    });

    expect(result.isRelatedParty).toBe(true);
    expect(result.approvalAuthority.roleTitle).toContain("Dewan Komisaris");
    expect(result.relatedPartyNote).toContain("BMPD Pihak Terkait");
  });
});
