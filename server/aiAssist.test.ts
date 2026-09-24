import { afterEach, describe, expect, it, vi } from "vitest";
import { ENV } from "./_core/env";
import {
  checkApplicationConsistency,
  checkShariaConformity,
  compareWithDeclared,
  extractSupportingDocument,
  generateCommitteeBrief,
  OPENROUTER_ASSIST_MODEL,
  ruleConsistencyIssues,
  type ApplicationSnapshot,
} from "./aiAssist";

const app: ApplicationSnapshot = {
  customerName: "Nurhayati Anggraini",
  customerId: "367421021989820451",
  businessName: "Bengkel Motor Sejahtera",
  businessType: "Kuliner",
  businessAge: 36,
  address: "Jl. Pahlawan No. 43, Kec. Batununggal, Kota Palembang, DI Yogyakarta",
  monthlyRevenue: 16_000_000,
  monthlyExpenses: 11_400_000,
  existingDebt: 1_000_000,
  collateralValue: 51_500_000,
  requestedAmount: 36_500_000,
  financingTenor: 24,
  marginRate: 0,
  financingAkad: "murabahah",
  loanPurpose: "Modal kerja untuk pengembangan usaha",
  businessShariaCompliant: "yes",
  legalDocuments: [{ type: "KTP", status: "verified" }, { type: "NIB", status: "missing" }],
};

const originalKey = ENV.openRouterApiKey;
const originalBaseUrl = ENV.openRouterBaseUrl;

afterEach(() => {
  ENV.openRouterApiKey = originalKey;
  ENV.openRouterBaseUrl = originalBaseUrl;
});

function mockProvider(content: unknown, inspect?: (body: any) => void) {
  ENV.openRouterApiKey = "test-key";
  ENV.openRouterBaseUrl = "https://openrouter.test/api/v1";
  return vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    inspect?.(body);
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), { status: 200 });
  });
}

describe("rule-based consistency", () => {
  it("flags NIK length, zero murabahah margin and missing documents", () => {
    const issues = ruleConsistencyIssues(app);
    const messages = issues.map(i => i.message).join(" ");
    expect(messages).toContain("NIK tidak terdiri dari 16 digit");
    expect(messages).toContain("margin tercatat 0%");
    expect(messages).toContain("NIB");
    expect(issues.every(i => i.source === "aturan")).toBe(true);
  });

  it("flags installment above repayment capacity", () => {
    const issues = ruleConsistencyIssues({ ...app, requestedAmount: 200_000_000, financingTenor: 12 });
    expect(issues.some(i => i.field === "Kapasitas bayar" && i.severity === "tinggi")).toBe(true);
  });
});

describe("checkApplicationConsistency", () => {
  it("falls back to rule findings when AI is not configured", async () => {
    ENV.openRouterApiKey = "";
    const result = await checkApplicationConsistency(app);
    expect(result.aiStatus).toBe("unavailable");
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("merges AI findings without sending customer name or NIK", async () => {
    const fetchMock = mockProvider(
      { issues: [{ severity: "sedang", field: "Jenis usaha", message: "Nama usaha bengkel tetapi jenis usaha kuliner." }], summary: "Ada ketidaksesuaian jenis usaha." },
      body => {
        expect(body.model).toBe(OPENROUTER_ASSIST_MODEL);
        const text = JSON.stringify(body);
        expect(text).not.toContain("Nurhayati");
        expect(text).not.toContain("367421021989820451");
      },
    );
    const result = await checkApplicationConsistency(app, { fetch: fetchMock as typeof fetch });
    expect(result.aiStatus).toBe("generated");
    expect(result.issues.some(i => i.source === "ai" && i.field === "Jenis usaha")).toBe(true);
  });
});

describe("checkShariaConformity", () => {
  it("grounds the prompt in the murabahah fatwa text", async () => {
    const fetchMock = mockProvider(
      { verdict: "perlu_klarifikasi", summary: "Tujuan modal kerja perlu dikaitkan dengan barang.", findings: [{ point: "Objek murabahah harus barang.", reference: "Fatwa 04/2000 Ketentuan Pertama" }], clarifications: ["Barang apa yang akan dibeli?"] },
      body => {
        const userMessage = String(body.messages[1].content);
        expect(userMessage).toContain("KUTIPAN FATWA DSN-MUI");
        expect(userMessage).toContain("Fatwa DSN-MUI No. 04/2000");
      },
    );
    const result = await checkShariaConformity(app, { fetch: fetchMock as typeof fetch });
    expect(result.verdict).toBe("perlu_klarifikasi");
    expect(result.sources.length).toBeGreaterThan(0);
  });

  it("throws when AI is not configured", async () => {
    ENV.openRouterApiKey = "";
    await expect(checkShariaConformity(app)).rejects.toThrow();
  });
});

describe("generateCommitteeBrief", () => {
  it("returns pros, cons and questions", async () => {
    const fetchMock = mockProvider({ headline: "Pengajuan layak ditinjau dengan catatan DSR.", pros: ["Skor 81,5"], cons: ["DSR 54,8%"], questions: ["Apakah ada sumber pendapatan lain?"] });
    const result = await generateCommitteeBrief({
      application: app,
      assessment: { totalScore: 81.5, classification: "Sangat Layak", sustainableFinanceScore: 44, shariaScore: 17.5, legalScore: 20, strengths: "Arus kas kuat", riskFactors: null },
      policy: { dsrRatio: 54.8, isDsrCompliant: false, approvalAuthority: "Direksi", appraisal: "Taksasi Internal BPRS" },
    }, { fetch: fetchMock as typeof fetch });
    expect(result.cons).toContain("DSR 54,8%");
    expect(result.model).toBe(OPENROUTER_ASSIST_MODEL);
  });
});

describe("supporting documents", () => {
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(16)]).toString("base64");

  it("compares extracted values with declared data", () => {
    const mismatches = compareWithDeclared(
      { holderName: "Budi Santoso", businessName: null, documentNumber: null, monthlyIncome: 8_000_000, monthlyExpenses: null, existingInstallment: 2_000_000, periodCovered: null, confidence: 0.9, warnings: [] },
      { customerName: "Nurhayati Anggraini", monthlyRevenue: 16_000_000, existingDebt: 1_000_000 },
    );
    expect(mismatches).toHaveLength(3);
  });

  it("rejects content that is not a real image", async () => {
    await expect(extractSupportingDocument({ documentType: "slip_gaji", imageBase64: "aGVsbG8=", contentType: "image/png" })).rejects.toThrow("Isi file");
  });

  it("extracts values and reports mismatches", async () => {
    const fetchMock = mockProvider({ holderName: "Nurhayati Anggraini", businessName: null, documentNumber: null, monthlyIncome: 9_000_000, monthlyExpenses: null, existingInstallment: null, periodCovered: "Agustus 2026", confidence: 0.8, warnings: [] });
    const result = await extractSupportingDocument(
      { documentType: "slip_gaji", imageBase64: png, contentType: "image/png", declared: { customerName: "Nurhayati Anggraini", monthlyRevenue: 16_000_000 } },
      { fetch: fetchMock as typeof fetch },
    );
    expect(result.monthlyIncome).toBe(9_000_000);
    expect(result.mismatches).toHaveLength(1);
  });
});
