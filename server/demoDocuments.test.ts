import { describe, expect, it } from "vitest";
import { inflateSync } from "node:zlib";
import { makeSampleDocumentPdf, makeSampleSurveyPng } from "./demoDocuments";
import { decodeSurveyImage } from "./surveyAnalysis";
import { decodeDocumentData } from "./documentUpload";

describe("berkas contoh", () => {
  it("membuat PDF yang lolos pemeriksaan unggahan dokumen", async () => {
    const pdf = await makeSampleDocumentPdf("KTP", true);
    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(() => decodeDocumentData(`data:application/pdf;base64,${pdf.toString("base64")}`)).not.toThrow();
  });

  it("membuat PNG 640x400 yang valid dan lolos pemeriksaan foto survei", () => {
    const png = makeSampleSurveyPng();
    expect(png.readUInt32BE(16)).toBe(640);
    expect(png.readUInt32BE(20)).toBe(400);
    const idatLength = png.readUInt32BE(33);
    expect(png.subarray(37, 41).toString("ascii")).toBe("IDAT");
    expect(inflateSync(png.subarray(41, 41 + idatLength)).length).toBe(400 * (1 + 640 * 3));
    expect(() => decodeSurveyImage(png.toString("base64"), "image/png")).not.toThrow();
  });
});
