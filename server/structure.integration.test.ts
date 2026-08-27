import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    listEntities: vi.fn(),
    createEntity: vi.fn(),
    listPartnerStores: vi.fn(),
    createPartnerStore: vi.fn(),
    getPartnerById: vi.fn(),
    getPartnerStoreById: vi.fn(),
    listCoupons: vi.fn(),
    listCouponUses: vi.fn(),
    createCoupon: vi.fn(),
    getCouponById: vi.fn(),
    registerCouponUse: vi.fn(),
    createPartner: vi.fn(),
    uploadPartnerLogo: vi.fn(),
    uploadCouponItemImage: vi.fn(),
    updatePartner: vi.fn(),
    deletePartner: vi.fn(),
    deletePartnerStore: vi.fn(),
    deleteCoupon: vi.fn(),
    isPartnerInScope: vi.fn(),
    isStoreInScope: vi.fn(),
    isAccessTargetInScope: vi.fn(),
    isLoginInviteInScope: vi.fn(),
    listAccessUsers: vi.fn(),
    listLoginInvites: vi.fn(),
    updateUserAccess: vi.fn(),
    resendLoginInvite: vi.fn(),
    revokeLoginInvite: vi.fn(),
    activateLoginInvite: vi.fn(),
    appendAuditLog: vi.fn(),
  };
});

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const listEntities = vi.mocked(db.listEntities);
const createEntity = vi.mocked(db.createEntity);
const listPartnerStores = vi.mocked(db.listPartnerStores);
const createPartnerStore = vi.mocked(db.createPartnerStore);
const getPartnerById = vi.mocked(db.getPartnerById);
const getPartnerStoreById = vi.mocked(db.getPartnerStoreById);
const listCoupons = vi.mocked(db.listCoupons);
const listCouponUses = vi.mocked(db.listCouponUses);
const createCoupon = vi.mocked(db.createCoupon);
const getCouponById = vi.mocked(db.getCouponById);
const registerCouponUse = vi.mocked(db.registerCouponUse);
const createPartner = vi.mocked(db.createPartner);
const uploadPartnerLogo = vi.mocked(db.uploadPartnerLogo);
const uploadCouponItemImage = vi.mocked(db.uploadCouponItemImage);
const updatePartner = vi.mocked(db.updatePartner);
const deletePartner = vi.mocked(db.deletePartner);
const deletePartnerStore = vi.mocked(db.deletePartnerStore);
const deleteCoupon = vi.mocked(db.deleteCoupon);
const isPartnerInScope = vi.mocked(db.isPartnerInScope);
const isStoreInScope = vi.mocked(db.isStoreInScope);
const isAccessTargetInScope = vi.mocked(db.isAccessTargetInScope);
const isLoginInviteInScope = vi.mocked(db.isLoginInviteInScope);
const listAccessUsers = vi.mocked(db.listAccessUsers);
const listLoginInvites = vi.mocked(db.listLoginInvites);
const updateUserAccess = vi.mocked(db.updateUserAccess);
const resendLoginInvite = vi.mocked(db.resendLoginInvite);
const revokeLoginInvite = vi.mocked(db.revokeLoginInvite);
const activateLoginInvite = vi.mocked(db.activateLoginInvite);
const appendAuditLog = vi.mocked(db.appendAuditLog);

function context(accessLevel: "admin" | "manager" | "operator" | "viewer" = "admin"): TrpcContext {
  return {
    user: { id: 7, openId: "structure-test", email: "admin@example.com", name: "Admin", loginMethod: "test", role: "user", accessLevel, entityId: null, partnerId: null, storeId: null, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

const partner = { id: 4, displayName: "Parceiro Teste" } as Awaited<ReturnType<typeof db.getPartnerById>>;
const store = { id: 12, partnerId: 4, name: "Unidade Centro", code: "CENTRO", status: "active" } as Awaited<ReturnType<typeof db.getPartnerStoreById>>;
const coupon = { id: 21, partnerId: 4, storeId: 12, code: "ITEM21", title: "Item teste", benefit: "Benefício", terms: null, status: "active", startsAt: new Date("2026-08-01"), endsAt: new Date("2026-09-01"), usageLimit: 0, usageCount: 0 } as Awaited<ReturnType<typeof db.getCouponById>>;
const png = "data:image/png;base64,iVBORw0KGgo=";

beforeEach(() => {
  vi.clearAllMocks();
  getPartnerById.mockResolvedValue(partner);
  getPartnerStoreById.mockResolvedValue(store);
  getCouponById.mockResolvedValue(coupon);
  createEntity.mockResolvedValue({ id: 1, name: "Operação", code: "OPERACAO", status: "active", notes: null, createdAt: new Date(), updatedAt: new Date() });
  createPartnerStore.mockResolvedValue(store);
  createPartner.mockResolvedValue({ ...partner, logoUrl: null });
  createCoupon.mockResolvedValue(coupon);
  uploadPartnerLogo.mockResolvedValue({ ...partner, logoKey: "private-logo-key", logoUrl: "https://storage.test/logo.png" });
  uploadCouponItemImage.mockResolvedValue({ ...coupon, itemImageKey: "private-item-key", itemImageUrl: "https://storage.test/item.png" });
  listEntities.mockResolvedValue([]);
  listPartnerStores.mockResolvedValue([]);
  listCoupons.mockResolvedValue([]);
  listCouponUses.mockResolvedValue([]);
  registerCouponUse.mockResolvedValue(99);
  updatePartner.mockResolvedValue(partner);
  deletePartner.mockResolvedValue(partner);
  deletePartnerStore.mockResolvedValue({ ...store, status: "inactive" });
  deleteCoupon.mockResolvedValue({ ...coupon, status: "ended" });
  isPartnerInScope.mockResolvedValue(true);
  isStoreInScope.mockResolvedValue(true);
  isAccessTargetInScope.mockResolvedValue(true);
  isLoginInviteInScope.mockResolvedValue(true);
  listAccessUsers.mockResolvedValue([]);
  listLoginInvites.mockResolvedValue([]);
  updateUserAccess.mockResolvedValue({ id: 9, name: "Gestor", email: "gestor@example.com", role: "user", accessLevel: "manager", entityId: 1, partnerId: 4, storeId: 12, updatedAt: new Date() });
  resendLoginInvite.mockResolvedValue({ invite: { id: 8, email: "gestor@example.com", status: "pending", accessLevel: "manager", entityId: 1, partnerId: 4, storeId: 12, expiresAt: new Date(Date.now() + 86400000), createdAt: new Date() }, token: "token" });
  revokeLoginInvite.mockResolvedValue({ id: 8, status: "revoked" });
  activateLoginInvite.mockResolvedValue({ id: 8, status: "accepted" });
  appendAuditLog.mockResolvedValue(undefined);
});

describe("admin structure procedures", () => {
  it("lists and creates entities through the protected router", async () => {
    listEntities.mockResolvedValue([{ id: 3, name: "Rede Sul", code: "REDE_SUL", status: "active", notes: null, createdAt: new Date(), updatedAt: new Date() }]);
    const caller = appRouter.createCaller(context());

    await expect(caller.admin.entities.list()).resolves.toHaveLength(1);
    await expect(caller.admin.entities.create({ name: "Operação", code: "operacao", status: "active" })).resolves.toMatchObject({ code: "OPERACAO" });
    expect(createEntity).toHaveBeenCalledWith({ name: "Operação", code: "OPERACAO", status: "active" });
  });

  it("lists stores with a partner filter and creates a store for an existing partner", async () => {
    const caller = appRouter.createCaller(context("manager"));
    await caller.admin.stores.list({ partnerId: 4 });
    expect(listPartnerStores).toHaveBeenCalledWith(4, expect.objectContaining({ accessLevel: "manager", partnerId: null, storeId: null }));

    await caller.admin.stores.create({ partnerId: 4, name: "Unidade Centro", code: "centro", status: "active", addressStreet: "Avenida Central", addressNumber: "100", addressNeighborhood: "Centro", addressCity: "São Paulo", addressState: "SP", addressPostalCode: "01000-000", addressCountry: "BR", latitude: -23.55052, longitude: -46.633308 });
    expect(createPartnerStore).toHaveBeenCalledWith(expect.objectContaining({ partnerId: 4, code: "CENTRO" }));
  });

  it("keeps coupon filters scoped by store and rejects cross-partner store links", async () => {
    const caller = appRouter.createCaller(context());
    await caller.admin.coupons.list({ storeId: 12 });
    expect(listCoupons).toHaveBeenCalledWith(expect.objectContaining({ storeId: 12 }));

    getPartnerStoreById.mockResolvedValue({ ...store, partnerId: 99 });
    await expect(caller.admin.coupons.create({ partnerId: 4, storeId: 12, code: "ITEM22", title: "Item teste", benefit: "Benefício", status: "draft", startsAt: new Date("2026-08-01"), endsAt: new Date("2026-09-01"), usageLimit: 0 })).rejects.toMatchObject<Partial<TRPCError>>({ code: "BAD_REQUEST" });
    expect(createCoupon).not.toHaveBeenCalled();
  });

  it("propagates store filters and persists a valid redemption store", async () => {
    const caller = appRouter.createCaller(context("operator"));
    await caller.admin.uses.list({ storeId: 12 });
    expect(db.listCouponUses).toHaveBeenCalledWith(expect.objectContaining({ storeId: 12 }));

    await caller.admin.uses.register({ couponId: 21, storeId: 12, reference: "USE-VALID", usedAt: new Date("2026-08-15") });
    expect(registerCouponUse).toHaveBeenCalledWith(expect.objectContaining({ couponId: 21, storeId: 12, registeredByUserId: 7 }));
  });

  it("rejects a store from another partner during a redemption", async () => {
    const caller = appRouter.createCaller(context("operator"));
    getPartnerStoreById.mockResolvedValue({ ...store, partnerId: 99 });

    await expect(caller.admin.uses.register({ couponId: 21, storeId: 12, reference: "USE-21", usedAt: new Date("2026-08-15") })).rejects.toMatchObject<Partial<TRPCError>>({ code: "BAD_REQUEST" });
    expect(registerCouponUse).not.toHaveBeenCalled();
  });

  it("enforces cross-scope guards on partner, store and access mutations", async () => {
    const scopedCaller = appRouter.createCaller({ ...context("manager"), user: { ...context("manager").user!, partnerId: 4 } });
    isPartnerInScope.mockResolvedValue(false);
    await expect(scopedCaller.admin.partners.update({ id: 4, data: { displayName: "Fora do escopo", relationshipStatus: "active" } })).rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
    isPartnerInScope.mockResolvedValue(true);
    isStoreInScope.mockResolvedValue(false);
    await expect(scopedCaller.admin.stores.remove({ id: 12 })).rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
    isAccessTargetInScope.mockResolvedValue(false);
    await expect(scopedCaller.admin.access.invites.create({ email: "out@example.com", accessLevel: "viewer", entityId: null, partnerId: 99, storeId: null, expiresInDays: 7, origin: "https://example.com" })).rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
  });

  it("performs successful logical deletes without erasing history", async () => {
    const manager = appRouter.createCaller(context("manager"));
    deletePartner.mockResolvedValue({ ...partner, relationshipStatus: "blocked" });
    await expect(manager.admin.partners.remove({ id: 4 })).resolves.toMatchObject({ relationshipStatus: "blocked" });
    await expect(manager.admin.stores.remove({ id: 12 })).resolves.toMatchObject({ status: "inactive" });
    await expect(manager.admin.coupons.remove({ id: 21 })).resolves.toMatchObject({ status: "ended" });
    expect(deletePartner).toHaveBeenCalledWith(4);
    expect(deletePartnerStore).toHaveBeenCalledWith(12);
    expect(deleteCoupon).toHaveBeenCalledWith(21);
  });

  it("covers access list/update and invite lifecycle with scope guards", async () => {
    const adminCaller = appRouter.createCaller(context("admin"));
    await expect(adminCaller.admin.access.list()).resolves.toEqual([]);
    await expect(adminCaller.admin.access.update({ id: 9, data: { accessLevel: "manager", entityId: 1, partnerId: 4, storeId: 12 } })).resolves.toMatchObject({ id: 9 });
    await expect(adminCaller.admin.access.invites.list()).resolves.toEqual([]);
    await expect(adminCaller.admin.access.invites.resend({ id: 8, origin: "https://example.com" })).resolves.toMatchObject({ inviteUrl: "https://example.com/convite?token=token" });
    await expect(adminCaller.admin.access.invites.revoke({ id: 8 })).resolves.toMatchObject({ status: "revoked" });
    await expect(adminCaller.admin.access.invites.activate({ id: 8, userId: 9 })).resolves.toMatchObject({ status: "accepted" });
    expect(updateUserAccess).toHaveBeenCalledWith(9, expect.objectContaining({ partnerId: 4, storeId: 12 }), expect.objectContaining({ accessLevel: "admin" }));

    isLoginInviteInScope.mockResolvedValue(false);
    await expect(adminCaller.admin.access.invites.revoke({ id: 8 })).rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
  });

  it("uploads partner and coupon images only through dedicated helpers", async () => {
    const caller = appRouter.createCaller(context());
    const savedPartner = await caller.admin.partners.create({ displayName: "Parceiro com logo", relationshipStatus: "prospect", logo: { fileName: "logo.png", dataUrl: png } });
    expect(uploadPartnerLogo).toHaveBeenCalledWith(partner.id, { fileName: "logo.png", dataUrl: png });
    expect(savedPartner).toMatchObject({ logoUrl: "https://storage.test/logo.png" });
    expect(savedPartner).not.toHaveProperty("logoKey");

    const savedCoupon = await caller.admin.coupons.create({ partnerId: 4, storeId: 12, code: "ITEM23", title: "Item com imagem", benefit: "Benefício", status: "draft", startsAt: new Date("2026-08-01"), endsAt: new Date("2026-09-01"), usageLimit: 0, itemImage: { fileName: "item.png", dataUrl: png } });
    expect(uploadCouponItemImage).toHaveBeenCalledWith(coupon.id, { fileName: "item.png", dataUrl: png });
    expect(savedCoupon).toMatchObject({ itemImageUrl: "https://storage.test/item.png" });
    expect(savedCoupon).not.toHaveProperty("itemImageKey");
  });
});
