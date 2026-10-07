import { describe, expect, it } from "vitest";
import { computeCompleteness, nextAction, stageFor, syncLegalDocuments } from "@shared/workflow";

const base = {
  status: "pending",
  track: "lengkap" as const,
  hasAssessment: false,
  documents: [] as Array<{ documentType: string; status: string }>,
  surveyPhotoCount: 0,
  openCustomerRequests: 0,
  blockingDataIssues: 0,
  bprsMissingCriteria: [] as string[],
};

describe("computeCompleteness", () => {
  it("keeps a new application in the 'lengkapi' stage until required documents are uploaded", () => {
    const result = computeCompleteness(base);
    expect(result.stage).toBe("lengkapi");
    expect(result.readyToAssess).toBe(false);
    expect(result.missing[0]!.hint).toBe("Belum ada: KTP, NPWP, NIB");
  });

  it("moves to 'nilai' once documents are uploaded, even before checker verification", () => {
    const docs = ["KTP", "NPWP", "NIB"].map(documentType => ({ documentType, status: "uploaded" }));
    const result = computeCompleteness({ ...base, documents: docs });
    expect(result.stage).toBe("nilai");
    expect(result.items.find(i => i.key === "verifikasi")!.done).toBe(false);
  });

  it("only needs KTP and no survey photo on the fast track", () => {
    const result = computeCompleteness({
      ...base,
      track: "ringkas",
      status: "assessed",
      hasAssessment: true,
      documents: [{ documentType: "KTP", status: "verified" }],
    });
    expect(result.items.some(i => i.key === "survei")).toBe(false);
    expect(result.percent).toBe(100);
  });

  it("treats a rejected upload as not uploaded", () => {
    const result = computeCompleteness({ ...base, track: "ringkas", documents: [{ documentType: "ktp", status: "rejected" }] });
    expect(result.items.find(i => i.key === "dokumen_unggah")!.done).toBe(false);
  });
});

describe("nextAction", () => {
  it("tells a checker exactly what blocks the decision, ignoring the optional BPRS workbook", () => {
    const completeness = computeCompleteness({
      ...base,
      status: "assessed",
      hasAssessment: true,
      documents: ["KTP", "NPWP", "NIB"].map(documentType => ({ documentType, status: "verified" })),
      surveyPhotoCount: 0,
      bprsMissingCriteria: ["Reputasi"],
    });
    const action = nextAction({ stage: completeness.stage, status: "assessed", role: "checker", isOwnWork: false, completeness });
    expect(action.title).toBe("Lengkapi syarat sebelum memutuskan");
    expect(action.detail).toContain("foto survei");
    expect(action.detail).not.toContain("kriteria");
  });

  it("asks the maker to assess once documents are in", () => {
    const completeness = computeCompleteness({ ...base, track: "ringkas", documents: [{ documentType: "KTP", status: "uploaded" }] });
    expect(nextAction({ stage: completeness.stage, status: "pending", role: "maker", isOwnWork: true, completeness }).title).toBe("Jalankan penilaian SSCI");
  });

  it("maps final statuses to the finished stage", () => {
    expect(stageFor("approved", false)).toBe("selesai");
    expect(stageFor("cancelled", true)).toBe("selesai");
  });
});

describe("syncLegalDocuments", () => {
  it("derives legal document status from uploads and checker verification", () => {
    const synced = syncLegalDocuments(
      [
        { type: "KTP", status: "pending" },
        { type: "NPWP", status: "verified" },
        { type: "NIB", status: "missing", notes: "menyusul" },
      ],
      [
        { documentType: "KTP", status: "verified" },
        { documentType: "NIB", status: "uploaded" },
      ],
    );
    expect(synced).toEqual([
      { type: "KTP", status: "verified" },
      // Tanpa berkas, dokumen tidak bisa berstatus terverifikasi.
      { type: "NPWP", status: "complete" },
      { type: "NIB", status: "complete", notes: "menyusul" },
    ]);
  });
});
