import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./passwordAuth";

describe("password authentication", () => {
  it("hashes passwords with a random salt and verifies safely", async () => {
    const firstHash = await hashPassword("strong-pilot-password");
    const secondHash = await hashPassword("strong-pilot-password");

    expect(firstHash).not.toBe(secondHash);
    expect(await verifyPassword("strong-pilot-password", firstHash)).toBe(true);
    expect(await verifyPassword("wrong-password", firstHash)).toBe(false);
  });
});
