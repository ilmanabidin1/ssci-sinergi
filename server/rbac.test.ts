import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContextWithRole(role: "maker" | "checker" | "admin"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: `user-${role}`,
    email: `${role}@example.com`,
    name: `Sample ${role}`,
    loginMethod: "password",
    role,
    organizationId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as AuthenticatedUser;

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function callerFor(role: "maker" | "checker" | "admin") {
  return appRouter.createCaller(createContextWithRole(role));
}

describe("rbac server-side enforcement", () => {
  it("rejects decision (approve/reject) for maker", async () => {
    await expect(
      callerFor("maker").applications.decide({
        applicationId: 1,
        decision: "approved",
        notes: "ok",
      })
    ).rejects.toThrowError(TRPCError);
  });

  it("rejects assessment delete for maker", async () => {
    await expect(
      callerFor("maker").assessments.delete({ applicationId: 1 })
    ).rejects.toThrowError(TRPCError);
  });

  it("rejects hard delete for maker and checker", async () => {
    for (const role of ["maker", "checker"] as const) {
      await expect(
        callerFor(role).assessments.hardDelete({ applicationId: 1 })
      ).rejects.toThrowError(TRPCError);
    }
  });

  it("rejects team user creation for maker and checker", async () => {
    for (const role of ["maker", "checker"] as const) {
      await expect(
        callerFor(role).organization.createUser({
          name: "Someone",
          email: "someone@example.com",
          password: "secret123",
          role: "maker",
        })
      ).rejects.toThrowError(TRPCError);
    }
  });
});
