import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  updateUserPassword: vi.fn(),
  setUserActive: vi.fn(),
  updateTwoFactor: vi.fn(),
  recordAuditEvent: vi.fn(),
}));

import { ENV } from "./_core/env";
import * as db from "./db";
import { applyPilotAdminRecovery, verifyPassword } from "./passwordAuth";

const user = { id: 1, organizationId: 1, active: 0, twoFactorEnabled: 1 };
const original = { ...ENV };

afterEach(() => {
  Object.assign(ENV, original);
  vi.clearAllMocks();
});

describe("pilot admin recovery", () => {
  it("does nothing unless a reset variable is set", async () => {
    await applyPilotAdminRecovery(user);
    expect(db.updateUserPassword).not.toHaveBeenCalled();
    expect(db.updateTwoFactor).not.toHaveBeenCalled();
  });

  it("resets the password to PILOT_ADMIN_PASSWORD, reactivates and audits", async () => {
    Object.assign(ENV, { resetPilotAdminPassword: true, pilotAdminPassword: "Rahasia-Baru-2026" });
    await applyPilotAdminRecovery(user);
    const hash = vi.mocked(db.updateUserPassword).mock.calls[0]![1];
    expect(await verifyPassword("Rahasia-Baru-2026", hash)).toBe(true);
    expect(db.setUserActive).toHaveBeenCalledWith(1, 1, true);
    expect(db.updateTwoFactor).not.toHaveBeenCalled();
    expect(vi.mocked(db.recordAuditEvent).mock.calls[0]![0]).toMatchObject({ action: "PILOT_ADMIN_RECOVERED", metadata: { reset: "password" } });
  });

  it("resets 2FA only when RESET_PILOT_ADMIN_2FA is set", async () => {
    Object.assign(ENV, { resetPilotAdminTwoFactor: true });
    await applyPilotAdminRecovery(user);
    expect(db.updateUserPassword).not.toHaveBeenCalled();
    expect(db.updateTwoFactor).toHaveBeenCalledWith(1, { twoFactorSecret: null, twoFactorEnabled: false, twoFactorLastStep: null });
  });
});
