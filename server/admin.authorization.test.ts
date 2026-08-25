import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(role: "admin" | "user" | null, accessLevel: "admin" | "manager" | "operator" | "viewer" = role === "admin" ? "admin" : "viewer"): TrpcContext {
  return {
    user: role
      ? {
          id: 1,
          openId: `${role}-user`,
          email: `${role}@pedagiodigital.com.br`,
          name: "Equipe Pedágio Digital",
          loginMethod: "manus",
          role,
          accessLevel,
          entityId: null,
          partnerId: null,
          storeId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        }
      : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("admin router authorization", () => {
  it("blocks an authenticated consulta user before management mutations", async () => {
    const caller = appRouter.createCaller(createContext("user", "viewer"));

    await expect(caller.admin.integrations.create({
      partnerId: 1,
      name: "Consulta bloqueada",
      endpointUrl: "https://example.com/webhook",
      allowedEvents: ["coupon.created"],
      status: "active",
    })).rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
  });

  it("blocks anonymous requests before operational data can be read", async () => {
    const caller = appRouter.createCaller(createContext(null));

    await expect(caller.admin.dashboard()).rejects.toMatchObject<Partial<TRPCError>>({
      code: "UNAUTHORIZED",
    });
  });

  it("blocks consulta users from simulating toll passage before database access", async () => {
    const caller = appRouter.createCaller(createContext("user", "viewer"));
    await expect(caller.admin.intelligence.simulatePassage({ userReference: "user-1", tollPlazaId: 1, occurredAt: new Date(), accuracyMeters: 80, consentPersonalization: true, source: "backoffice_simulator" })).rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
  });

  it("blocks a consulta user before management mutations", async () => {
    const caller = appRouter.createCaller(createContext("user", "viewer"));

    await expect(caller.admin.entities.create({ name: "Operação", code: "OPERACAO", status: "active" })).rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
  });

  it("rejects coupon payloads whose validity ends before it starts", async () => {
    const caller = appRouter.createCaller(createContext("admin"));

    await expect(
      caller.admin.coupons.create({
        partnerId: 1,
        code: "ROTA10",
        title: "Benefício teste",
        benefit: "10% de desconto",
        status: "draft",
        startsAt: new Date("2026-08-30T00:00:00.000Z"),
        endsAt: new Date("2026-08-29T00:00:00.000Z"),
        usageLimit: 10,
      }),
    ).rejects.toMatchObject<Partial<TRPCError>>({ code: "BAD_REQUEST" });
  });

  it("rejects a usage payload without a positive coupon identifier", async () => {
    const caller = appRouter.createCaller(createContext("admin"));

    await expect(
      caller.admin.uses.register({
        couponId: 0,
        reference: "PED-2026-0001",
        usedAt: new Date(),
      }),
    ).rejects.toMatchObject<Partial<TRPCError>>({ code: "BAD_REQUEST" });
  });
});
