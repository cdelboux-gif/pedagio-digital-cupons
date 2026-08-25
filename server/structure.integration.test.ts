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
    expect(listPartnerStores).toHaveBeenCalledWith(4);

    await caller.admin.stores.create({ partnerId: 4, name: "Unidade Centro", code: "centro", status: "active", addressCountry: "BR", latitude: null, longitude: null });
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
