import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, getCouponById: vi.fn(), registerCouponUse: vi.fn() };
});

import * as db from "./db";
import { appRouter } from "./routers";

const getCouponById = vi.mocked(db.getCouponById);
const registerCouponUse = vi.mocked(db.registerCouponUse);

function adminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@pedagiodigital.com.br",
      name: "Equipe Pedágio Digital",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

function coupon(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    partnerId: 1,
    code: "ROTA10",
    title: "Benefício teste",
    benefit: "10% de desconto",
    terms: null,
    status: "active",
    startsAt: new Date("2026-08-01T00:00:00.000Z"),
    endsAt: new Date("2026-09-01T23:59:59.000Z"),
    usageLimit: 10,
    usageCount: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Awaited<ReturnType<typeof db.getCouponById>>;
}

describe("admin.uses.register business rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerCouponUse.mockResolvedValue(99);
  });

  it("rejects an inactive coupon", async () => {
    getCouponById.mockResolvedValue(coupon({ status: "paused" }));
    const caller = appRouter.createCaller(adminContext());

    await expect(caller.admin.uses.register({ couponId: 1, reference: "PED-001", usedAt: new Date("2026-08-15") })).rejects.toMatchObject<Partial<TRPCError>>({ code: "BAD_REQUEST" });
    expect(registerCouponUse).not.toHaveBeenCalled();
  });

  it("rejects a use outside the coupon validity window", async () => {
    getCouponById.mockResolvedValue(coupon());
    const caller = appRouter.createCaller(adminContext());

    await expect(caller.admin.uses.register({ couponId: 1, reference: "PED-002", usedAt: new Date("2026-09-02") })).rejects.toMatchObject<Partial<TRPCError>>({ code: "BAD_REQUEST" });
    expect(registerCouponUse).not.toHaveBeenCalled();
  });

  it("rejects a use when the configured limit has been reached", async () => {
    getCouponById.mockResolvedValue(coupon({ usageLimit: 2, usageCount: 2 }));
    const caller = appRouter.createCaller(adminContext());

    await expect(caller.admin.uses.register({ couponId: 1, reference: "PED-003", usedAt: new Date("2026-08-15") })).rejects.toMatchObject<Partial<TRPCError>>({ code: "BAD_REQUEST" });
    expect(registerCouponUse).not.toHaveBeenCalled();
  });

  it("reports duplicate usage references as an operational conflict", async () => {
    getCouponById.mockResolvedValue(coupon());
    registerCouponUse.mockRejectedValue({ code: "ER_DUP_ENTRY" });
    const caller = appRouter.createCaller(adminContext());

    await expect(caller.admin.uses.register({ couponId: 1, reference: "PED-004", usedAt: new Date("2026-08-15") })).rejects.toMatchObject<Partial<TRPCError>>({ code: "CONFLICT" });
  });
});

