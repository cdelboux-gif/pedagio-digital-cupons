import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { canAccess, visibleModules } from "../shared/permissions";
import { scopeAllows } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(accessLevel: "admin" | "manager" | "operator" | "viewer", scope = { entityId: null, partnerId: null, storeId: null }): TrpcContext {
  return { user: { id: 1, openId: "matrix", email: "matrix@example.com", name: "Matrix", loginMethod: "test", role: "user", accessLevel, ...scope, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("permission matrix", () => {
  it("isolates agent management by access level", () => {
    expect(canAccess("admin", "agents", "manage")).toBe(true);
    expect(canAccess("manager", "agents", "manage")).toBe(true);
    expect(canAccess("operator", "agents", "manage")).toBe(false);
    expect(canAccess("viewer", "agents", "read")).toBe(true);
  });

  it("defines CRUD boundaries by level", () => {
    expect(canAccess("admin", "access", "manage")).toBe(true);
    expect(canAccess("manager", "partners", "create")).toBe(true);
    expect(canAccess("manager", "coupons", "update")).toBe(true);
    expect(canAccess("manager", "coupons", "delete")).toBe(true);
    expect(canAccess("operator", "coupons", "create")).toBe(false);
    expect(canAccess("operator", "uses", "create")).toBe(true);
    expect(canAccess("viewer", "uses", "create")).toBe(false);
    expect(canAccess("manager", "integrations", "read")).toBe(false);
    expect(visibleModules("operator")).not.toContain("access");
    expect(visibleModules("admin")).toContain("access");
  });

  it("blocks modules and actions in the protected router", async () => {
    const manager = appRouter.createCaller(context("manager"));
    const viewer = appRouter.createCaller(context("viewer"));
    await expect(manager.admin.integrations.list()).rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
    await expect(viewer.admin.uses.register({ couponId: 1, reference: "USE-1", usedAt: new Date() })).rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
    await expect(viewer.admin.partners.remove({ id: 1 })).rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
    await expect(manager.admin.access.list()).rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
  });

  it("enforces entity > partner > store hierarchy", () => {
    const scoped = { role: "user" as const, accessLevel: "manager" as const, entityId: 10, partnerId: 20, storeId: 30 };
    expect(scopeAllows(scoped, { entityId: 10, partnerId: 20, storeId: 30 })).toBe(true);
    expect(scopeAllows(scoped, { entityId: 10, partnerId: 21, storeId: 30 })).toBe(false);
    expect(scopeAllows(scoped, { entityId: 10, partnerId: 20, storeId: 31 })).toBe(false);
    expect(scopeAllows(scoped, { entityId: 10, partnerId: 20, storeId: null }, true)).toBe(false);
    expect(scopeAllows({ ...scoped, role: "admin" }, { entityId: 999, partnerId: 999, storeId: 999 }, true)).toBe(true);
  });
});
