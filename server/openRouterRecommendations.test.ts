import { afterEach, describe, expect, it, vi } from "vitest";
import { ENV } from "./_core/env";
import {
  generateNarrativeRecommendation,
  OPENROUTER_RECOMMENDATION_MODEL,
} from "./openRouterRecommendations";

const input = {
  classification: "Layak" as const,
  totalScore: 70,
  sustainableFinanceScore: 40,
  shariaScore: 17,
  legalScore: 13,
  scoreBreakdown: {
    sustainableFinance: { financial_health: 25, debt_capacity: 20, cash_flow: 15, collateral: 15 },
    sharia: { business_compliance: 40, transaction_compliance: 30, documentation: 20 },
    legal: { business_legality: 30, document_completeness: 35, regulatory_compliance: 25 },
  },
  strengths: "Kapasitas pembayaran baik.",
  riskFactors: "Dokumentasi perlu ditinjau.",
  fallbackRecommendation: "Lakukan verifikasi lanjutan.",
};

const originalKey = ENV.openRouterApiKey;
const originalBaseUrl = ENV.openRouterBaseUrl;

afterEach(() => {
  ENV.openRouterApiKey = originalKey;
  ENV.openRouterBaseUrl = originalBaseUrl;
});

describe("OpenRouter recommendations", () => {
  it("uses the exact requested model without sending customer PII", async () => {
    ENV.openRouterApiKey = "test-key";
    ENV.openRouterBaseUrl = "https://openrouter.test/api/v1";
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.model).toBe(OPENROUTER_RECOMMENDATION_MODEL);
      expect(JSON.stringify(body)).not.toContain("customerName");
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ recommendation: "Tinjau sesuai kebijakan BPRS." }) } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const result = await generateNarrativeRecommendation(input, { fetch: fetchMock });

    expect(result).toMatchObject({
      status: "generated",
      model: "openai/gpt-5.6-luna",
      recommendation: "Tinjau sesuai kebijakan BPRS.",
    });
  });

  it("uses deterministic fallback when OpenRouter is unavailable", async () => {
    ENV.openRouterApiKey = "";
    const result = await generateNarrativeRecommendation(input);
    expect(result.status).toBe("rule_fallback");
    expect(result.recommendation).toBe(input.fallbackRecommendation);
  });
});
