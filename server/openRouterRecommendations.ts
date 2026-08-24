import {
  SSCI_RECOMMENDATION_PROMPT_VERSION,
  type SSCIClassification,
} from "@shared/ssciMethodology";
import { z } from "zod";
import { ENV } from "./_core/env";
import type { ScoreBreakdown } from "./scoring";

export const OPENROUTER_RECOMMENDATION_MODEL = "openai/gpt-5.6-luna";

type NarrativeInput = {
  classification: SSCIClassification;
  totalScore: number;
  sustainableFinanceScore: number;
  shariaScore: number;
  legalScore: number;
  scoreBreakdown: ScoreBreakdown;
  strengths: string;
  riskFactors: string;
  fallbackRecommendation: string;
};

const narrativeSchema = z.object({
  recommendation: z.string().trim().min(1).max(3000),
});

const responseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({ content: z.string() }),
    })
  ).min(1),
});

export type NarrativeResult = {
  recommendation: string;
  status: "generated" | "rule_fallback";
  model: string | null;
  promptVersion: string;
};

export async function generateNarrativeRecommendation(
  input: NarrativeInput,
  options: { fetch?: typeof fetch; timeoutMs?: number } = {}
): Promise<NarrativeResult> {
  if (!ENV.openRouterApiKey) {
    return fallback(input);
  }

  const fetchImpl = options.fetch ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000);

  try {
    const response = await fetchImpl(`${ENV.openRouterBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.openRouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ssci-sinergi-production.up.railway.app",
        "X-Title": "SSCI Sinergi",
      },
      body: JSON.stringify({
        model: OPENROUTER_RECOMMENDATION_MODEL,
        temperature: 0.2,
        max_tokens: 700,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Anda membantu analis BPRS menyusun narasi rekomendasi SSCI dalam Bahasa Indonesia. Skor, klasifikasi, risiko, dan kekuatan sudah final serta tidak boleh diubah. Jangan menyatakan keputusan persetujuan final. Kembalikan JSON dengan satu properti recommendation.",
          },
          {
            role: "user",
            content: JSON.stringify(input),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`OpenRouter request failed with status ${response.status}`);
    }

    const parsedResponse = responseSchema.parse(await response.json());
    const parsedNarrative = narrativeSchema.parse(
      JSON.parse(parsedResponse.choices[0]!.message.content)
    );

    return {
      recommendation: parsedNarrative.recommendation,
      status: "generated",
      model: OPENROUTER_RECOMMENDATION_MODEL,
      promptVersion: SSCI_RECOMMENDATION_PROMPT_VERSION,
    };
  } catch (error) {
    console.warn(
      "[OpenRouter] Narrative unavailable; using deterministic fallback:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return fallback(input);
  } finally {
    clearTimeout(timeout);
  }
}

function fallback(input: NarrativeInput): NarrativeResult {
  return {
    recommendation: input.fallbackRecommendation,
    status: "rule_fallback",
    model: null,
    promptVersion: SSCI_RECOMMENDATION_PROMPT_VERSION,
  };
}
