import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { isSuperAdmin, needsTwoFactorSetup } from "./_core/trpc";
import { appRouter } from "./routers";

type User = NonNullable<TrpcContext["user"]>;

function caller(role: "maker" | "checker" | "admin", twoFactorEnabled: number) {
  const user = {
    id: 9, openId: `u-${role}`, email: `${role}@bprs.test`, name: role, loginMethod: "password", role,
    organizationId: 1, active: 1, twoFactorEnabled, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  } as unknown as User;
  return appRouter.createCaller({ user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] });
}

async function errorMessage(promise: Promise<unknown>) {
  try {
    await promise;
    return "";
  } catch (error) {
    return error instanceof TRPCError ? error.message : String(error);
  }
}

describe("mandatory two-factor for admin and checker", () => {
  it("flags only admin and checker without 2FA", () => {
    expect(needsTwoFactorSetup({ role: "admin", twoFactorEnabled: 0 })).toBe(true);
    expect(needsTwoFactorSetup({ role: "checker", twoFactorEnabled: 0 })).toBe(true);
    expect(needsTwoFactorSetup({ role: "checker", twoFactorEnabled: 1 })).toBe(false);
    expect(needsTwoFactorSetup({ role: "maker", twoFactorEnabled: 0 })).toBe(false);
  });

  it("blocks business endpoints until 2FA is set up", async () => {
    expect(await errorMessage(caller("checker", 0).applications.decide({ applicationId: 1, decision: "rejected", notes: "x" }))).toContain("TWO_FACTOR_REQUIRED");
    expect(await errorMessage(caller("admin", 0).organization.listUsers())).toContain("TWO_FACTOR_REQUIRED");
    expect(await errorMessage(caller("checker", 0).applications.queue())).toContain("TWO_FACTOR_REQUIRED");
  });

  it("still lets them reach the 2FA setup and their own profile", async () => {
    const me = await caller("admin", 0).auth.me();
    expect(me?.needsTwoFactorSetup).toBe(true);
    expect(await errorMessage(caller("admin", 0).auth.enableTwoFactor({ code: "123456" }))).not.toContain("TWO_FACTOR_REQUIRED");
  });

  it("does not block makers", async () => {
    expect(await errorMessage(caller("maker", 0).applications.queue())).not.toContain("TWO_FACTOR_REQUIRED");
  });

  it("does not treat a BPRS admin as SuperAdmin", () => {
    expect(isSuperAdmin({ email: "admin@bprs.test" })).toBe(false);
  });
});
