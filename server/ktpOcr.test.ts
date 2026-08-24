import { afterEach, describe, expect, it, vi } from "vitest";
import { ENV } from "./_core/env";
import {
  extractKtpOcr,
  KTP_OCR_MAX_BYTES,
  KTP_OCR_TIMEOUT_MS,
  OPENROUTER_KTP_OCR_MODEL,
  KtpOcrInputError,
  KtpOcrProviderError,
} from "./ktpOcr";

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString("base64");
const originalKey = ENV.openRouterApiKey;
const originalBaseUrl = ENV.openRouterBaseUrl;

afterEach(() => {
  ENV.openRouterApiKey = originalKey;
  ENV.openRouterBaseUrl = originalBaseUrl;
});

describe("KTP OCR", () => {
  it("sends the exact model and multimodal data URL, then normalizes fields", async () => {
    ENV.openRouterApiKey = "server-key";
    ENV.openRouterBaseUrl = "https://openrouter.test/api/v1";
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({ Authorization: "Bearer server-key" });
      const body = JSON.parse(String(init?.body));
      expect(body.model).toBe(OPENROUTER_KTP_OCR_MODEL);
      expect(body.messages[1].content[1].image_url.url).toBe(`data:image/png;base64,${png}`);
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
        customerName: "  Siti Aminah ", customerId: "1234567890123456", address: " Jalan Merdeka ", confidence: 0.9, warnings: ["  Periksa ulang ", ""]
      }) } }] }), { status: 200 });
    });

    await expect(extractKtpOcr({ imageBase64: png, contentType: "image/png" }, { fetch: fetchMock }))
      .resolves.toEqual({ customerName: "Siti Aminah", customerId: "1234567890123456", address: "Jalan Merdeka", confidence: 0.9, warnings: ["Periksa ulang"], model: OPENROUTER_KTP_OCR_MODEL });
  });

  it("rejects malformed, oversized, and non-image input before calling the provider", async () => {
    const fetchMock = vi.fn();
    await expect(extractKtpOcr({ imageBase64: "bad!", contentType: "image/png" }, { fetch: fetchMock })).rejects.toBeInstanceOf(KtpOcrInputError);
    await expect(extractKtpOcr({ imageBase64: Buffer.concat([Buffer.from([1]), Buffer.alloc(KTP_OCR_MAX_BYTES)]).toString("base64"), contentType: "image/png" }, { fetch: fetchMock })).rejects.toBeInstanceOf(KtpOcrInputError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not expose provider failures and uses the explicit timeout", async () => {
    ENV.openRouterApiKey = "server-key";
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      throw new Error("provider secret response body");
    });
    await expect(extractKtpOcr({ imageBase64: png, contentType: "image/png" }, { fetch: fetchMock, timeoutMs: KTP_OCR_TIMEOUT_MS }))
      .rejects.toEqual(expect.any(KtpOcrProviderError));
  });
});
