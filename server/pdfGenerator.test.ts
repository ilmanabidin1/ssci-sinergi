import { describe, expect, it } from "vitest";
import type { Application, Assessment } from "../drizzle/schema";
import { escapeHtml, generateAssessmentPDF } from "./pdfGenerator";

describe("assessment report", () => {
  it("escapes untrusted HTML", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
  });

  it("does not render customer or AI scripts", () => {
    const now = new Date();
    const application = {
      id: 1,
      organizationId: 1,
      customerName: "<script>customer()</script>",
      customerId: "123",
      businessName: "Usaha",
      businessType: "Dagang",
      businessAge: 24,
      address: "Alamat",
      phone: "0812",
      email: null,
      monthlyRevenue: "10000000",
      monthlyExpenses: "5000000",
      existingDebt: "500000",
      collateralValue: "20000000",
      requestedAmount: "10000000",
      financingTenor: 12,
      marginRate: "10",
      loanPurpose: "Modal",
      legalDocuments: [],
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
      id: 1,
      organizationId: 1,
      applicationId: 1,
      sustainableFinanceScore: "40",
      shariaScore: "20",
      legalScore: "15",
      totalScore: "75",
      classification: "Layak",
      scoreBreakdown: {
        sustainableFinance: { financial_health: 25, debt_capacity: 20, cash_flow: 15, collateral: 15 },
        sharia: { business_compliance: 40, transaction_compliance: 30, documentation: 20 },
        legal: { business_legality: 30, document_completeness: 35, regulatory_compliance: 25 },
      },
      recommendations: "<script>ai()</script>",
      riskFactors: "Risiko",
      strengths: "Kekuatan",
      modelVersion: "ssci-rules-1.1.0",
      confidence: "85",
      recommendationStatus: "generated",
      recommendationModel: "openai/gpt-5.6-luna",
      recommendationPromptVersion: "ssci-narrative-1.0.0",
      assessedBy: 2,
      assessedAt: now,
      notes: null,
    } satisfies Assessment;

    const html = generateAssessmentPDF({ application, assessment });
    expect(html).not.toContain("<script>customer()");
    expect(html).not.toContain("<script>ai()");
    expect(html).toContain("&lt;script&gt;customer()&lt;/script&gt;");
    expect(html).toContain("openai/gpt-5.6-luna");
  });
});
