import { z } from "zod";
import { ENV } from "./_core/env";

export const OPENROUTER_KTP_OCR_MODEL = "openai/gpt-5.6-luna";
export const KTP_OCR_TIMEOUT_MS = 20_000;
export const KTP_OCR_MAX_BYTES = 5 * 1024 * 1024;

export const ktpOcrInputSchema = z.object({
  imageBase64: z.string().min(1),
  contentType: z.enum(["image/jpeg", "image/png"]),
});

const ktpOcrResponseSchema = z.object({
  customerName: z.string().nullable(),
  customerId: z.string().nullable(),
  address: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()),
}).strict();

const openRouterResponseSchema = z.object({
  choices: z.array(z.object({
    message: z.object({ content: z.string() }),
  })).min(1),
});

export type KtpOcrResult = z.infer<typeof ktpOcrResponseSchema> & {
  model: typeof OPENROUTER_KTP_OCR_MODEL;
};

export class KtpOcrInputError extends Error {}
export class KtpOcrProviderError extends Error {}

function decodeImage(imageBase64: string, contentType: "image/jpeg" | "image/png"): Buffer {
  const maxBase64Length = Math.ceil(KTP_OCR_MAX_BYTES / 3) * 4;
  if (imageBase64.length > maxBase64Length || imageBase64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(imageBase64)) {
    throw new KtpOcrInputError("Invalid image base64");
  }

  const bytes = Buffer.from(imageBase64, "base64");
  if (bytes.length === 0 || bytes.length > KTP_OCR_MAX_BYTES) {
    throw new KtpOcrInputError("Image must be no larger than 5 MB");
  }

  const isJpeg = contentType === "image/jpeg" && bytes.length >= 3 &&
    bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = contentType === "image/png" && bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (!isJpeg && !isPng) {
    throw new KtpOcrInputError("Image content does not match content type");
  }
  return bytes;
}

function normalizeText(value: string | null): string | null {
  if (value === null) return null;
  const normalized = value.trim();
  return normalized || null;
}

function normalizeResult(value: z.infer<typeof ktpOcrResponseSchema>): KtpOcrResult {
  const customerId = normalizeText(value.customerId);
  if (customerId !== null && !/^\d{16}$/.test(customerId)) {
    throw new KtpOcrProviderError("OCR returned an invalid customer ID");
  }
  return {
    customerName: normalizeText(value.customerName),
    customerId,
    address: normalizeText(value.address),
    confidence: value.confidence,
    warnings: value.warnings.map(warning => warning.trim()).filter(Boolean),
    model: OPENROUTER_KTP_OCR_MODEL,
  };
}

export async function extractKtpOcr(
  input: z.infer<typeof ktpOcrInputSchema>,
  options: { fetch?: typeof fetch; timeoutMs?: number } = {}
): Promise<KtpOcrResult> {
  const bytes = decodeImage(input.imageBase64, input.contentType);
  if (!ENV.openRouterApiKey) throw new KtpOcrProviderError("OCR provider unavailable");

  const fetchImpl = options.fetch ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? KTP_OCR_TIMEOUT_MS);

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
        model: OPENROUTER_KTP_OCR_MODEL,
        temperature: 0,
        max_tokens: 500,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "ktp_ocr_result",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                customerName: { type: ["string", "null"] },
                customerId: { type: ["string", "null"] },
                address: { type: ["string", "null"] },
                confidence: { type: "number", minimum: 0, maximum: 1 },
                warnings: { type: "array", items: { type: "string" } },
              },
              required: ["customerName", "customerId", "address", "confidence", "warnings"],
            },
          },
        },
        messages: [
          {
            role: "system",
            content: "Ekstrak data KTP Indonesia dari gambar. Hasil ini hanya saran yang belum terverifikasi dan wajib diperiksa oleh petugas; jangan menganggapnya sebagai identitas atau keputusan final. Kembalikan JSON ketat dengan tepat lima field: customerName (string atau null), customerId (NIK string 16 digit atau null), address (string atau null), confidence (number 0 sampai 1), dan warnings (array string). Jika tidak terbaca, gunakan null dan tambahkan peringatan.",
          },
          {
            role: "user",
            content: [{ type: "text", text: "Baca KTP ini dan kembalikan lima field JSON yang diminta." }, {
              type: "image_url",
              image_url: { url: `data:${input.contentType};base64,${input.imageBase64}` },
            }],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) throw new KtpOcrProviderError("OCR provider request failed");
    const providerResponse = openRouterResponseSchema.parse(await response.json());
    const extracted = ktpOcrResponseSchema.parse(JSON.parse(providerResponse.choices[0]!.message.content));
    return normalizeResult(extracted);
  } catch (error) {
    if (error instanceof KtpOcrProviderError) throw error;
    throw new KtpOcrProviderError("OCR provider response was invalid");
  } finally {
    clearTimeout(timeout);
  }
}
