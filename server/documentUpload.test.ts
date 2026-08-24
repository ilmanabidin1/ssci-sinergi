import { describe, expect, it } from "vitest";
import { decodeDocumentData, extensionForContentType, sanitizeOriginalName } from "./documentUpload";

describe("document upload validation", () => {
  it("decodes base64 and rejects malformed input", () => {
    expect(decodeDocumentData(Buffer.from("file").toString("base64"))).toEqual(Buffer.from("file"));
    expect(() => decodeDocumentData("not base64!")).toThrow();
  });

  it("uses server-controlled extensions and strips path/control characters", () => {
    expect(extensionForContentType("image/jpeg")).toBe("jpg");
    expect(sanitizeOriginalName("..\\secret\nname.pdf")).toBe(".._secret_name.pdf");
  });
});
