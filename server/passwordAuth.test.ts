import { describe, expect, it } from "vitest";
import { hashPassword, shouldSeedDemoUsers, verifyPassword } from "./passwordAuth";

describe("password authentication", () => {
  it("hashes passwords with a random salt and verifies safely", async () => {
    const firstHash = await hashPassword("strong-pilot-password");
    const secondHash = await hashPassword("strong-pilot-password");

    expect(firstHash).not.toBe(secondHash);
    expect(await verifyPassword("strong-pilot-password", firstHash)).toBe(true);
    expect(await verifyPassword("wrong-password", firstHash)).toBe(false);
  });
});

describe("akun demo", () => {
  it("tidak dibuat kecuali SEED_DEMO_USERS=true", () => {
    expect(shouldSeedDemoUsers({})).toBe(false);
    expect(shouldSeedDemoUsers({ SEED_DEMO_USERS: "" })).toBe(false);
    expect(shouldSeedDemoUsers({ SEED_DEMO_USERS: "false" })).toBe(false);
    expect(shouldSeedDemoUsers({ SEED_DEMO_USERS: "1" })).toBe(false);
    expect(shouldSeedDemoUsers({ SEED_DEMO_USERS: "true" })).toBe(true);
    expect(shouldSeedDemoUsers({ SEED_DEMO_USERS: " TRUE " })).toBe(true);
  });
});
