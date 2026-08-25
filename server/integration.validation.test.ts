import { describe, expect, it } from "vitest";
import { createIntegrationSecret, hashIntegrationSecret, publicIntegration } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { TRPCError } from "@trpc/server";
import { integrationInput } from "./routers/admin";

describe("admin.integrations input", () => {
  const base = {
    partnerId: 1,
    name: "Plataforma parceiro",
    endpointUrl: "https://partner.example.com/webhooks/coupons",
    allowedEvents: ["coupon.created", "coupon.redeemed"],
    status: "active" as const,
  };

  it("accepts HTTPS endpoints and the supported coupon events", () => {
    const parsed = integrationInput.safeParse(base);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.allowedEvents).toEqual(base.allowedEvents);
  });

  it("rejects non-HTTPS endpoints", () => {
    expect(integrationInput.safeParse({ ...base, endpointUrl: "http://partner.example.com/hook" }).success).toBe(false);
  });

  it("rejects an integration without an authorized event", () => {
    expect(integrationInput.safeParse({ ...base, allowedEvents: [] }).success).toBe(false);
  });
});

describe("integration secret", () => {
  it("generates unique secrets and stores only a one-way hash", () => {
    const first = createIntegrationSecret();
    const second = createIntegrationSecret();
    expect(first).toMatch(/^pd_wh_[A-Za-z0-9_-]{40,}$/);
    expect(second).not.toBe(first);
    expect(hashIntegrationSecret(first)).toHaveLength(64);
    expect(hashIntegrationSecret(first)).not.toBe(first);
  });
});

function contextFor(role: "admin" | "user"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: `${role}-integration-test`,
      email: `${role}@example.com`,
      name: "Integration test",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("admin.integrations authorization and response safety", () => {
  it("blocks non-admin users before listing integrations", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.admin.integrations.list()).rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
  });

  it("does not expose secretHash or the full secret in public integration data", () => {
    const secret = createIntegrationSecret();
    const sanitized = publicIntegration({
      id: 7,
      partnerId: 2,
      name: "Webhook de testes",
      endpointUrl: "https://partner.example.com/webhook",
      allowedEvents: '["coupon.created"]',
      secretHash: hashIntegrationSecret(secret),
      secretLastFour: secret.slice(-4),
      status: "active",
      createdByUserId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(sanitized).not.toHaveProperty("secretHash");
    expect(sanitized).not.toHaveProperty("secret");
    expect(sanitized.secretLastFour).toBe(secret.slice(-4));
  });
});
