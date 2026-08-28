import { describe, expect, it } from "vitest";
import type { Application, Assessment, Organization } from "../drizzle/schema";
import { generatePdfReport } from "./pdfReport";

function extractPdfText(buffer: Buffer): string {
  const raw = buffer.toString("latin1");
  const matches = raw.match(/<([0-9a-fA-F\s]+)>/g) ?? [];
  return matches
    .map(token => token.slice(1, -1).replace(/\s/g, ""))
    .map(hex => Buffer.from(hex, "hex").toString("latin1"))
    .join("");
}

const now = new Date("2026-01-15T08:00:00Z");

const application = {
  id: 42,
  organizationId: 1,
  customerName: "Nasabah Contoh",
  customerId: "3201-0101-0800-0001",
  businessName: "Toko Berkah (TM)",
  businessType: "Perdagangan",
  businessAge: 36,
  address: "Jl. Merdeka No. 17, Bandung",
  phone: "081234567890",
  email: "nasabah@example.com",
  monthlyRevenue: "50000000",
  monthlyExpenses: "30000000",
  existingDebt: "5000000",
  collateralValue: "100000000",
  requestedAmount: "25000000",
  financingTenor: 12,
  marginRate: "12",
  loanPurpose: "Modal kerja pembelian stok",
  legalDocuments: [
    { type: "KTP", status: "complete" },
    { type: "NPWP", status: "complete" },
    { type: "NIB", status: "complete" },
  ],
  businessShariaCompliant: "yes",
  shariaComplianceNotes: null,
  environmentalPractices: null,
  socialImpact: null,
  governanceQuality: "good",
  status: "assessed",
  submittedBy: 1,
  checkedBy: null,
  checkedAt: null,
  decisionNotes: null,
  createdAt: now,
  updatedAt: now,
} satisfies Application;

const assessment = {
  id: 99,
  organizationId: 1,
  applicationId: 42,
  sustainableFinanceScore: "42.50",
  shariaScore: "21.00",
  legalScore: "16.50",
  totalScore: "80.00",
  classification: "Sangat Layak",
  scoreBreakdown: {
    sustainableFinance: { financial_health: 25, debt_capacity: 20, cash_flow: 15, collateral: 15 },
    sharia: { business_compliance: 40, transaction_compliance: 30, documentation: 20 },
    legal: { business_legality: 30, document_completeness: 35, regulatory_compliance: 25 },
  },
  recommendations: "Pembiayaan direkomendasikan dengan pengawasan ringan.",
  riskFactors: "Volatilitas pendapatan bulanan perlu dimonitor.",
  strengths: "Agunan mencukupi dan kepatuhan syariah penuh.",
  modelVersion: "ssci-rules-1.1.0",
  confidence: "88",
  recommendationStatus: "generated",
  recommendationModel: "openai/gpt-5.6-luna",
  recommendationPromptVersion: "ssci-narrative-1.0.0",
  assessedBy: 2,
  assessedAt: now,
  notes: null,
} satisfies Assessment;

const organization = {
  id: 1,
  name: "BPRS Sinergi Sejahtera",
  legalName: "PT BPRS Sinergi Sejahtera",
  slug: "sinergi-sejahtera",
  registrationStatus: "active",
  address: "Jl. Asia Afrika No. 100, Bandung",
  phone: "022-1234567",
  email: "kontak@sinergi-bprs.id",
  logoUrl: null,
  primaryColor: "#2458d6",
  createdAt: now,
  updatedAt: now,
} satisfies Organization;

describe("generatePdfReport", () => {
  it("returns a Buffer that begins with the PDF signature", async () => {
    const buffer = await generatePdfReport({ application, assessment, organization });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  it("embeds the verification string and Indonesian content", async () => {
    const buffer = await generatePdfReport({ application, assessment, organization });
    const text = extractPdfText(buffer);

    expect(text).toContain("LAPORAN PENILAIAN KELAYAKAN PEMBIAYAAN SYARIAH");
    expect(text).toContain("BPRS Sinergi Sejahtera");
    expect(text).toContain("Nasabah Contoh");
    expect(text).toContain("Sangat Layak");
    expect(text).toContain("SSCI:99:ssci-rules-1.1.0:42");
    expect(text).toContain("Laporan operasional pendukung analisis");
  });

  it("works without an organization", async () => {
    const buffer = await generatePdfReport({ application, assessment });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
});
