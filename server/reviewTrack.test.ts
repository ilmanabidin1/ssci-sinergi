import { describe, expect, it } from "vitest";
import { determineReviewTrack, estimateFromDailySales, evaluateExitGate } from "@shared/reviewTrack";

describe("review track", () => {
  it("puts small non-related-party financing on the short track", () => {
    expect(determineReviewTrack({ requestedAmount: "25000000", isRelatedParty: "no" })).toBe("ringkas");
    expect(determineReviewTrack({ requestedAmount: 25_000_001 })).toBe("lengkap");
    expect(determineReviewTrack({ requestedAmount: 5_000_000, isRelatedParty: "yes" })).toBe("lengkap");
  });

  it("requires only a verified KTP on the short track", () => {
    const gate = evaluateExitGate({ track: "ringkas", documents: [{ documentType: "KTP", status: "verified" }], surveyPhotoCount: 0, openCustomerRequests: 0 });
    expect(gate.passed).toBe(true);
  });

  it("requires all documents, a survey photo and no open requests on the full track", () => {
    const docs = ["KTP", "NPWP", "NIB"].map(documentType => ({ documentType, status: "verified" }));
    expect(evaluateExitGate({ track: "lengkap", documents: docs, surveyPhotoCount: 1, openCustomerRequests: 0 }).passed).toBe(true);
    expect(evaluateExitGate({ track: "lengkap", documents: docs, surveyPhotoCount: 0, openCustomerRequests: 0 }).passed).toBe(false);
    expect(evaluateExitGate({ track: "lengkap", documents: docs, surveyPhotoCount: 1, openCustomerRequests: 1 }).passed).toBe(false);
    const unverified = docs.map(d => d.documentType === "NIB" ? { ...d, status: "uploaded" } : d);
    const gate = evaluateExitGate({ track: "lengkap", documents: unverified, surveyPhotoCount: 1, openCustomerRequests: 0 });
    expect(gate.items.filter(i => !i.ok).map(i => i.label)).toEqual(["Dokumen NIB diunggah dan diverifikasi checker"]);
  });

  it("estimates monthly figures from daily sales", () => {
    const result = estimateFromDailySales({ dailySales: 800_000, openDaysPerMonth: 26, costOfGoodsPct: 60, fixedMonthlyCosts: 1_500_000 });
    expect(result.monthlyRevenue).toBe(20_800_000);
    expect(result.monthlyExpenses).toBe(12_480_000 + 1_500_000);
    expect(result.note).toContain("26 hari");
  });
});
