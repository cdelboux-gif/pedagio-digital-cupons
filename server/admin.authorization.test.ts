import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(role: "admin" | "user" | null): TrpcContext {
  return {
    user: role
      ? {
          id: 1,
          openId: `${role}-user`,
          email: `${role}@pedagiodigital.com.br`,
          name: "Equipe Pedágio Digital",
          loginMethod: "manus",
          role,
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
  it("blocks an authenticated non-admin user before any partner operation", async () => {
    const caller = appRouter.createCaller(createContext("user"));

    await expect(caller.admin.partners.list()).rejects.toMatchObject<Partial<TRPCError>>({
      code: "FORBIDDEN",
    });
  });

  it("blocks anonymous requests before operational data can be read", async () => {
    const caller = appRouter.createCaller(createContext(null));

    await expect(caller.admin.dashboard()).rejects.toMatchObject<Partial<TRPCError>>({
      code: "FORBIDDEN",
    });
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
