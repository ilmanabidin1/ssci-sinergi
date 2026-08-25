import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ENV } from "./_core/env";

export const OPENROUTER_SURVEY_MODEL = "openai/gpt-5.6-luna";
export const SURVEY_TIMEOUT_MS = 30_000;
export const MAX_SURVEY_SIZE = 5 * 1024 * 1024;
export const SURVEY_CONTENT_TYPES = ["image/jpeg", "image/png"] as const;
export type SurveyContentType = (typeof SURVEY_CONTENT_TYPES)[number];

export class SurveyUploadError extends Error {}
export class SurveyProviderError extends Error {}

export function decodeSurveyImage(data: string, contentType: SurveyContentType): Buffer {
  const value = data.replace(/^data:[^;]+;base64,/, "");
  if (!value || !/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 === 1) {
    throw new SurveyUploadError("Data foto bukan base64 yang valid");
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.length === 0 || bytes.length > MAX_SURVEY_SIZE) {
    throw new SurveyUploadError("Foto survey harus berukuran maksimal 5 MB");
  }
  if (contentType === "image/jpeg") {
    const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (!isJpeg) throw new SurveyUploadError("File bukan JPG yang valid");
  } else {
    const isPng =
      bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (!isPng) throw new SurveyUploadError("File bukan PNG yang valid");
  }
  return bytes;
}

function extension(contentType: SurveyContentType): string {
  return { "image/jpeg": "jpg", "image/png": "png" }[contentType];
}

export async function storeSurveyImage(bytes: Buffer, contentType: SurveyContentType): Promise<string> {
  const directory = process.env.UPLOAD_DIR || "/data/uploads";
  await mkdir(directory, { recursive: true });
  const storedName = `survey-${randomUUID()}.${extension(contentType)}`;
  await writeFile(join(directory, storedName), bytes, { flag: "wx" });
  return storedName;
}

const surveyAnalysisSchema = z.object({
  activityLevel: z.string(),
  premisesCondition: z.string(),
  stockAdequacy: z.string(),
  equipmentCondition: z.string(),
  cleanliness: z.string(),
  observations: z.array(z.string()),
  overallAssessment: z.string(),
  confidence: z.number().min(0).max(1),
}).strict();

const openRouterResponseSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1),
});

export type SurveyAnalysisResult = z.infer<typeof surveyAnalysisSchema> & {
  model: typeof OPENROUTER_SURVEY_MODEL;
};

export async function analyzeSurveyImage(
  imageBase64: string,
  contentType: SurveyContentType,
  options: { fetch?: typeof fetch; timeoutMs?: number } = {}
): Promise<SurveyAnalysisResult> {
  if (!ENV.openRouterApiKey) throw new SurveyProviderError("Survey AI provider unavailable");

  const fetchImpl = options.fetch ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? SURVEY_TIMEOUT_MS);

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
        model: OPENROUTER_SURVEY_MODEL,
        temperature: 0.1,
        max_tokens: 900,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "survey_analysis",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                activityLevel: { type: "string" },
                premisesCondition: { type: "string" },
                stockAdequacy: { type: "string" },
                equipmentCondition: { type: "string" },
                cleanliness: { type: "string" },
                observations: { type: "array", items: { type: "string" } },
                overallAssessment: { type: "string" },
                confidence: { type: "number", minimum: 0, maximum: 1 },
              },
              required: [
                "activityLevel",
                "premisesCondition",
                "stockAdequacy",
                "equipmentCondition",
                "cleanliness",
                "observations",
                "overallAssessment",
                "confidence",
              ],
            },
          },
        },
        messages: [
          {
            role: "system",
            content:
              "Anda adalah analis lapangan syariah yang menilai kondisi usaha dari foto survey BPRS. Bersikaplah objektif, faktual, dan hindari spekulasi berlebihan. Jika tidak yakin, katakan demikian. Kembalikan JSON ketat dengan field: activityLevel (tingkat aktivitas usaha), premisesCondition (kondisi tempat), stockAdequacy (kecukupan stok/barang), equipmentCondition (kondisi peralatan), cleanliness (kebersihan), observations (array pengamatan singkat), overallAssessment (penilaian keseluruhan dalam 1-2 kalimat), confidence (0-1). Semua dalam Bahasa Indonesia. Hasil bersifat pendukung, bukan keputusan final.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analisis foto survey usaha ini dan kembalikan JSON sesuai format." },
              { type: "image_url", image_url: { url: `data:${contentType};base64,${imageBase64}` } },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) throw new SurveyProviderError("Survey AI request failed");
    const providerResponse = openRouterResponseSchema.parse(await response.json());
    const parsed = surveyAnalysisSchema.parse(JSON.parse(providerResponse.choices[0]!.message.content));
    return { ...parsed, model: OPENROUTER_SURVEY_MODEL };
  } catch (error) {
    if (error instanceof SurveyProviderError) throw error;
    throw new SurveyProviderError("Survey AI response was invalid");
  } finally {
    clearTimeout(timeout);
  }
}
