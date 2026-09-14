import { describe, expect, it } from "vitest";
import { assignExperimentArm, buildEntitlementIdempotencyKey, entitlementExpiresAt } from "./campaign-experiment";

describe("campaign experiment", () => {
  it("keeps assignment deterministic for the same campaign and subject", () => {
    const first = assignExperimentArm(10, "cpf:123", 20);
    const second = assignExperimentArm(10, "cpf:123", 20);
    expect(second).toBe(first);
  });

  it("supports zero and full holdout boundaries", () => {
    expect(assignExperimentArm(1, "user-a", 0)).toBe("exposed");
    expect(assignExperimentArm(1, "user-a", 100)).toBe("control");
  });

  it("creates an entitlement expiry window", () => {
    const issuedAt = new Date("2026-09-14T12:00:00.000Z");
    expect(entitlementExpiresAt(issuedAt, 30).toISOString()).toBe("2026-09-14T12:30:00.000Z");
  });

  it("creates a stable idempotency key without exposing the subject reference", () => {
    const key = buildEntitlementIdempotencyKey(5, 99, "cpf:123.456.789-00");
    expect(key).toMatch(/^entitlement:5:99:[a-f0-9]{24}$/);
    expect(key).not.toContain("123.456.789-00");
  });
});
