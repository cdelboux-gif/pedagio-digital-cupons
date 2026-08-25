import { createHash, randomBytes } from "node:crypto";
import {
  and,
  count,
  desc,
  eq,
  gt,
  gte,
  like,
  lt,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  couponUses,
  coupons,
  entities,
  integrationEventValues,
  partnerIntegrations,
  partnerStores,
  loginInvites,
  type InsertUser,
  partners,
  type PartnerStore,
  type LoginInvite,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { storagePut } from "./storage";

let _db: ReturnType<typeof drizzle> | null = null;

/** Test-only database seam; production code never calls this setter. */
export function setDbForTests(database: unknown) { _db = database as ReturnType<typeof drizzle>; }
export function clearDbForTests() { _db = null; }

export class DatabaseUnavailableError extends Error {
  constructor() {
    super("Banco de dados indisponível");
    this.name = "DatabaseUnavailableError";
  }
}

export class CouponUseRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CouponUseRuleError";
  }
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new DatabaseUnavailableError();
  return db;
}

export function resolveUserRole({
  incomingRole,
  existingRole,
  isOwner,
}: {
  incomingRole?: "user" | "admin" | null;
  existingRole?: "user" | "admin" | null;
  isOwner: boolean;
}) {
  return incomingRole ?? existingRole ?? (isOwner ? "admin" : "user");
}

export function resolveUserAccessLevel({
  incomingAccessLevel,
  existingAccessLevel,
  role,
  isOwner,
}: {
  incomingAccessLevel?: "admin" | "manager" | "operator" | "viewer" | null;
  existingAccessLevel?: "admin" | "manager" | "operator" | "viewer" | null;
  role?: "user" | "admin" | null;
  isOwner: boolean;
}) {
  if (role === "admin" || isOwner) return "admin" as const;
  return incomingAccessLevel ?? existingAccessLevel ?? "viewer";
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await requireDb();
  const existing = await db
    .select({ role: users.role, accessLevel: users.accessLevel })
    .from(users)
    .where(eq(users.openId, user.openId))
    .limit(1);
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  textFields.forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });

  values.role = resolveUserRole({
    incomingRole: user.role,
    existingRole: existing[0]?.role,
    isOwner: user.openId === ENV.ownerOpenId,
  });
  values.accessLevel = resolveUserAccessLevel({
    incomingAccessLevel: user.accessLevel,
    existingAccessLevel: existing[0]?.accessLevel,
    role: values.role,
    isOwner: user.openId === ENV.ownerOpenId,
  });
  updateSet.role = values.role;
  updateSet.accessLevel = values.accessLevel;
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await requireDb();
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

type PartnerInput = {
  displayName: string;
  legalName?: string | null;
  taxId?: string | null;
  category?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressNeighborhood?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressPostalCode?: string | null;
  addressCountry?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  relationshipStatus: "prospect" | "active" | "inactive" | "blocked";
  notes?: string | null;
  entityId?: number | null;
};

type CouponInput = {
  partnerId: number;
  storeId?: number | null;
  code: string;
  title: string;
  benefit: string;
  terms?: string | null;
  status: "draft" | "active" | "paused" | "ended";
  startsAt: Date;
  endsAt: Date;
  usageLimit: number;
};

export async function listPartners(filters: {
  search?: string;
  status?: "prospect" | "active" | "inactive" | "blocked";
}) {
  const db = await requireDb();
  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(partners.relationshipStatus, filters.status));
  if (filters.search?.trim()) {
    conditions.push(
      or(
        like(partners.displayName, `%${filters.search.trim()}%`),
        like(partners.legalName, `%${filters.search.trim()}%`),
        like(partners.email, `%${filters.search.trim()}%`),
        like(partners.addressStreet, `%${filters.search.trim()}%`),
        like(partners.addressCity, `%${filters.search.trim()}%`),
      )!,
    );
  }

  return db
    .select()
    .from(partners)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(partners.updatedAt));
}

export async function getPartnerById(id: number) {
  const db = await requireDb();
  const result = await db.select().from(partners).where(eq(partners.id, id)).limit(1);
  return result[0];
}

export function publicPartner<T extends { logoKey?: unknown }>(partner: T) {
  const { logoKey: _logoKey, ...safePartner } = partner;
  return safePartner;
}

export async function createPartner(input: PartnerInput) {
  const db = await requireDb();
  const result = await db.insert(partners).values(input);
  return getPartnerById(Number(result[0].insertId));
}

export async function updatePartner(id: number, input: PartnerInput) {
  const db = await requireDb();
  await db.update(partners).set(input).where(eq(partners.id, id));
  return getPartnerById(id);
}

type EntityInput = {
  name: string;
  code: string;
  status: "active" | "inactive";
  notes?: string | null;
};

type StoreInput = {
  partnerId: number;
  name: string;
  code: string;
  status: "active" | "inactive";
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressNeighborhood?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressPostalCode?: string | null;
  addressCountry?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type ImageUploadInput = {
  fileName: string;
  dataUrl: string;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const imageMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

export function decodeImageUpload(input: ImageUploadInput) {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(input.dataUrl);
  if (!match || !imageMimeTypes.has(match[1])) throw new Error("Formato de imagem não suportado");
  const data = Buffer.from(match[2], "base64");
  if (!data.length || data.length > MAX_IMAGE_BYTES) throw new Error("A imagem deve ter no máximo 5 MB");
  const isPng = match[1] === "image/png" && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isJpeg = match[1] === "image/jpeg" && data.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  const isWebp = match[1] === "image/webp" && data.subarray(0, 4).toString() === "RIFF" && data.subarray(8, 12).toString() === "WEBP";
  if (!isPng && !isJpeg && !isWebp) throw new Error("O conteúdo da imagem não corresponde ao formato informado");
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100) || "imagem";
  return { data, mimeType: match[1], safeName };
}

export async function uploadPartnerLogo(id: number, input: ImageUploadInput) {
  const db = await requireDb();
  const { data, mimeType, safeName } = decodeImageUpload(input);
  const upload = await storagePut(`partners/${id}/logo/${safeName}`, data, mimeType);
  await db.update(partners).set({ logoKey: upload.key, logoUrl: upload.url }).where(eq(partners.id, id));
  return getPartnerById(id);
}

export async function uploadCouponItemImage(id: number, input: ImageUploadInput) {
  const db = await requireDb();
  const { data, mimeType, safeName } = decodeImageUpload(input);
  const upload = await storagePut(`coupons/${id}/item/${safeName}`, data, mimeType);
  await db.update(coupons).set({ itemImageKey: upload.key, itemImageUrl: upload.url }).where(eq(coupons.id, id));
  return getCouponById(id);
}

export async function listEntities() {
  const db = await requireDb();
  return db.select().from(entities).orderBy(desc(entities.updatedAt));
}

export async function createEntity(input: EntityInput) {
  const db = await requireDb();
  const result = await db.insert(entities).values(input);
  const rows = await db.select().from(entities).where(eq(entities.id, Number(result[0].insertId))).limit(1);
  return rows[0];
}

export async function listPartnerStores(partnerId?: number) {
  const db = await requireDb();
  return db.select({ store: partnerStores, partnerName: partners.displayName }).from(partnerStores).innerJoin(partners, eq(partners.id, partnerStores.partnerId)).where(partnerId ? eq(partnerStores.partnerId, partnerId) : undefined).orderBy(desc(partnerStores.updatedAt));
}

export async function getPartnerStoreById(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(partnerStores).where(eq(partnerStores.id, id)).limit(1);
  return rows[0];
}

export async function createPartnerStore(input: StoreInput) {
  const db = await requireDb();
  const result = await db.insert(partnerStores).values(input);
  return getPartnerStoreById(Number(result[0].insertId));
}

export async function updatePartnerStore(id: number, input: StoreInput) {
  const db = await requireDb();
  await db.update(partnerStores).set(input).where(eq(partnerStores.id, id));
  return getPartnerStoreById(id);
}

export type LoginInviteInput = Pick<LoginInvite, "email" | "accessLevel" | "entityId" | "partnerId" | "storeId"> & { expiresAt: Date; invitedByUserId: number };

export function normalizeLoginEmail(email: string) {
  return email.trim().toLowerCase();
}

export function createLoginInviteToken() {
  return `pd_inv_${randomBytes(32).toString("base64url")}`;
}

export function hashLoginInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function publicLoginInvite(row: LoginInvite) {
  const { tokenHash: _tokenHash, ...safeInvite } = row;
  return safeInvite;
}

export function isLoginInviteUsable(row: Pick<LoginInvite, "status" | "expiresAt">, now = new Date()) {
  return row.status === "pending" && row.expiresAt > now;
}

export function getLoginInviteAccessPatch(invite: Pick<LoginInvite, "accessLevel" | "entityId" | "partnerId" | "storeId">) {
  return { accessLevel: invite.accessLevel, entityId: invite.entityId, partnerId: invite.partnerId, storeId: invite.storeId, role: invite.accessLevel === "admin" ? "admin" as const : undefined };
}

export function buildAcceptedLoginInvitePatch(row: Pick<LoginInvite, "status" | "expiresAt">, userId: number, now = new Date()) {
  if (!isLoginInviteUsable(row, now)) return null;
  return { status: "accepted" as const, acceptedUserId: userId, acceptedAt: now };
}

export async function createLoginInvite(input: LoginInviteInput) {
  const db = await requireDb();
  const token = createLoginInviteToken();
  const email = normalizeLoginEmail(input.email);
  await db.update(loginInvites).set({ status: "revoked", revokedAt: new Date() }).where(and(eq(loginInvites.email, email), eq(loginInvites.status, "pending")));
  const result = await db.insert(loginInvites).values({ ...input, email, tokenHash: hashLoginInviteToken(token), status: "pending" });
  const rows = await db.select().from(loginInvites).where(eq(loginInvites.id, Number(result[0].insertId))).limit(1);
  return rows[0] ? { invite: publicLoginInvite(rows[0]), token } : null;
}

export async function getLoginInviteById(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(loginInvites).where(eq(loginInvites.id, id)).limit(1);
  return rows[0];
}

export async function getPendingLoginInvite(email: string, token: string) {
  const db = await requireDb();
  const now = new Date();
  const rows = await db.select().from(loginInvites).where(and(eq(loginInvites.email, normalizeLoginEmail(email)), eq(loginInvites.tokenHash, hashLoginInviteToken(token)), eq(loginInvites.status, "pending"), gt(loginInvites.expiresAt, now))).limit(1);
  return rows[0] ?? null;
}

export async function listLoginInvites() {
  const db = await requireDb();
  const rows = await db.select().from(loginInvites).orderBy(desc(loginInvites.createdAt));
  const now = new Date();
  const expired = rows.filter(row => row.status === "pending" && row.expiresAt <= now).map(row => row.id);
  if (expired.length) {
    await db.update(loginInvites).set({ status: "expired" }).where(sql`${loginInvites.id} in (${sql.join(expired.map(id => sql`${id}`), sql`, `)})`);
  }
  return rows.map(row => expired.includes(row.id) ? publicLoginInvite({ ...row, status: "expired" }) : publicLoginInvite(row));
}

export async function resendLoginInvite(id: number, invitedByUserId: number) {
  const current = await getLoginInviteById(id);
  if (!current) return null;
  return createLoginInvite({ email: current.email, accessLevel: current.accessLevel, entityId: current.entityId, partnerId: current.partnerId, storeId: current.storeId, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), invitedByUserId });
}

export async function activateLoginInvite(id: number, userId: number) {
  const db = await requireDb();
  const inviteRows = await db.select().from(loginInvites).where(eq(loginInvites.id, id)).limit(1);
  const userRows = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  const invite = inviteRows[0];
  const user = userRows[0];
  if (!invite || !user?.email || normalizeLoginEmail(user.email) !== normalizeLoginEmail(invite.email)) return null;
  const patch = buildAcceptedLoginInvitePatch(invite, userId);
  if (!patch) return null;
  await db.update(loginInvites).set(patch).where(and(eq(loginInvites.id, id), eq(loginInvites.status, "pending")));
  const rows = await db.select().from(loginInvites).where(eq(loginInvites.id, id)).limit(1);
  return rows[0] ? publicLoginInvite(rows[0]) : null;
}

export async function acceptLoginInvite(email: string, token: string, userId: number) {
  const db = await requireDb();
  const now = new Date();
  const emailNormalized = normalizeLoginEmail(email);
  const result = await db.update(loginInvites).set({ status: "accepted", acceptedUserId: userId, acceptedAt: now }).where(and(eq(loginInvites.email, emailNormalized), eq(loginInvites.tokenHash, hashLoginInviteToken(token)), eq(loginInvites.status, "pending"), gt(loginInvites.expiresAt, now)));
  if (!result[0]?.affectedRows) return null;
  const rows = await db.select().from(loginInvites).where(and(eq(loginInvites.email, emailNormalized), eq(loginInvites.acceptedUserId, userId))).orderBy(desc(loginInvites.acceptedAt)).limit(1);
  return rows[0] ? publicLoginInvite(rows[0]) : null;
}

export async function revokeLoginInvite(id: number) {
  const db = await requireDb();
  await db.update(loginInvites).set({ status: "revoked", revokedAt: new Date() }).where(and(eq(loginInvites.id, id), eq(loginInvites.status, "pending")));
  const rows = await db.select().from(loginInvites).where(eq(loginInvites.id, id)).limit(1);
  return rows[0] ? publicLoginInvite(rows[0]) : null;
}

export async function listAccessUsers() {
  const db = await requireDb();
  return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, accessLevel: users.accessLevel, entityId: users.entityId, partnerId: users.partnerId, storeId: users.storeId, updatedAt: users.updatedAt }).from(users).orderBy(desc(users.updatedAt));
}

export async function updateUserAccess(id: number, input: { accessLevel: "admin" | "manager" | "operator" | "viewer"; entityId?: number | null; partnerId?: number | null; storeId?: number | null }) {
  const db = await requireDb();
  await db.update(users).set(input).where(eq(users.id, id));
  const rows = await listAccessUsers();
  return rows.find(user => user.id === id);
}

type PartnerIntegrationInput = {
  partnerId: number;
  name: string;
  endpointUrl: string;
  allowedEvents: (typeof integrationEventValues)[number][];
  status: "active" | "paused";
  createdByUserId: number;
};

export function createIntegrationSecret() {
  return `pd_wh_${randomBytes(32).toString("base64url")}`;
}

export function hashIntegrationSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export function publicIntegration(row: typeof partnerIntegrations.$inferSelect) {
  return {
    id: row.id,
    partnerId: row.partnerId,
    name: row.name,
    endpointUrl: row.endpointUrl,
    allowedEvents: JSON.parse(row.allowedEvents) as string[],
    status: row.status,
    secretLastFour: row.secretLastFour,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listPartnerIntegrations() {
  const db = await requireDb();
  const rows = await db
    .select({ integration: partnerIntegrations, partnerName: partners.displayName })
    .from(partnerIntegrations)
    .innerJoin(partners, eq(partners.id, partnerIntegrations.partnerId))
    .orderBy(desc(partnerIntegrations.updatedAt));

  return rows.map(({ integration, partnerName }) => ({
    ...publicIntegration(integration),
    partnerName,
  }));
}

export async function createPartnerIntegration(input: PartnerIntegrationInput) {
  const db = await requireDb();
  const secret = createIntegrationSecret();
  const secretHash = hashIntegrationSecret(secret);
  const result = await db.insert(partnerIntegrations).values({
    partnerId: input.partnerId,
    name: input.name,
    endpointUrl: input.endpointUrl,
    allowedEvents: JSON.stringify(input.allowedEvents),
    secretHash,
    secretLastFour: secret.slice(-4),
    status: input.status,
    createdByUserId: input.createdByUserId,
  });
  const rows = await db
    .select({ integration: partnerIntegrations, partnerName: partners.displayName })
    .from(partnerIntegrations)
    .innerJoin(partners, eq(partners.id, partnerIntegrations.partnerId))
    .where(eq(partnerIntegrations.id, Number(result[0].insertId)))
    .limit(1);
  const created = rows[0];
  if (!created) throw new DatabaseUnavailableError();
  return { integration: { ...publicIntegration(created.integration), partnerName: created.partnerName }, secret };
}

export async function listCoupons(filters: {
  search?: string;
  partnerId?: number;
  storeId?: number;
  status?: "draft" | "active" | "paused" | "ended";
  validity?: "current" | "upcoming" | "expired";
}) {
  const db = await requireDb();
  const now = new Date();
  const conditions: SQL[] = [];
  if (filters.partnerId) conditions.push(eq(coupons.partnerId, filters.partnerId));
  if (filters.storeId) conditions.push(eq(coupons.storeId, filters.storeId));
  if (filters.status) conditions.push(eq(coupons.status, filters.status));
  if (filters.search?.trim()) {
    conditions.push(
      or(
        like(coupons.code, `%${filters.search.trim()}%`),
        like(coupons.title, `%${filters.search.trim()}%`),
        like(partners.displayName, `%${filters.search.trim()}%`),
      )!,
    );
  }
  if (filters.validity === "current") {
    conditions.push(lte(coupons.startsAt, now), gte(coupons.endsAt, now));
  }
  if (filters.validity === "upcoming") conditions.push(gt(coupons.startsAt, now));
  if (filters.validity === "expired") conditions.push(lt(coupons.endsAt, now));

  return db
    .select({
      id: coupons.id,
      partnerId: coupons.partnerId,
      partnerName: partners.displayName,
      storeId: coupons.storeId,
      storeName: partnerStores.name,
      code: coupons.code,
      title: coupons.title,
      benefit: coupons.benefit,
      terms: coupons.terms,
      status: coupons.status,
      startsAt: coupons.startsAt,
      endsAt: coupons.endsAt,
      usageLimit: coupons.usageLimit,
      usageCount: coupons.usageCount,
      itemImageUrl: coupons.itemImageUrl,
      remainingUses: sql<number>`case when ${coupons.usageLimit} = 0 then null else greatest(${coupons.usageLimit} - ${coupons.usageCount}, 0) end`,
      updatedAt: coupons.updatedAt,
    })
    .from(coupons)
    .innerJoin(partners, eq(partners.id, coupons.partnerId))
    .leftJoin(partnerStores, eq(partnerStores.id, coupons.storeId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(coupons.updatedAt));
}

export async function getCouponById(id: number) {
  const db = await requireDb();
  const result = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
  return result[0];
}

export function publicCoupon<T extends { itemImageKey?: unknown }>(coupon: T) {
  const { itemImageKey: _itemImageKey, ...safeCoupon } = coupon;
  return safeCoupon;
}

export async function createCoupon(input: CouponInput) {
  const db = await requireDb();
  const result = await db.insert(coupons).values(input);
  return getCouponById(Number(result[0].insertId));
}

export async function updateCoupon(id: number, input: CouponInput) {
  const db = await requireDb();
  await db.update(coupons).set(input).where(eq(coupons.id, id));
  return getCouponById(id);
}

export async function updateCouponStatus(
  id: number,
  status: "draft" | "active" | "paused" | "ended",
) {
  const db = await requireDb();
  await db.update(coupons).set({ status }).where(eq(coupons.id, id));
  return getCouponById(id);
}

export async function listCouponUses(filters: {
  couponId?: number;
  partnerId?: number;
  storeId?: number;
  search?: string;
  startsAt?: Date;
  endsAt?: Date;
}) {
  const db = await requireDb();
  const conditions: SQL[] = [];
  if (filters.couponId) conditions.push(eq(couponUses.couponId, filters.couponId));
  if (filters.partnerId) conditions.push(eq(couponUses.partnerId, filters.partnerId));
  if (filters.storeId) conditions.push(eq(couponUses.storeId, filters.storeId));
  if (filters.startsAt) conditions.push(gte(couponUses.usedAt, filters.startsAt));
  if (filters.endsAt) conditions.push(lte(couponUses.usedAt, filters.endsAt));
  if (filters.search?.trim()) {
    conditions.push(
      or(
        like(couponUses.reference, `%${filters.search.trim()}%`),
        like(couponUses.customerReference, `%${filters.search.trim()}%`),
        like(coupons.code, `%${filters.search.trim()}%`),
        like(partners.displayName, `%${filters.search.trim()}%`),
      )!,
    );
  }

  return db
    .select({
      id: couponUses.id,
      reference: couponUses.reference,
      customerReference: couponUses.customerReference,
      notes: couponUses.notes,
      usedAt: couponUses.usedAt,
      createdAt: couponUses.createdAt,
      couponId: coupons.id,
      couponCode: coupons.code,
      couponTitle: coupons.title,
      partnerId: partners.id,
      partnerName: partners.displayName,
      storeId: couponUses.storeId,
      storeName: partnerStores.name,
    })
    .from(couponUses)
    .innerJoin(coupons, eq(coupons.id, couponUses.couponId))
    .innerJoin(partners, eq(partners.id, couponUses.partnerId))
    .leftJoin(partnerStores, eq(partnerStores.id, couponUses.storeId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(couponUses.usedAt));
}

function affectedRows(result: unknown) {
  const header = (Array.isArray(result) ? result[0] : result) as { affectedRows?: number };
  return Number(header?.affectedRows ?? 0);
}

export async function registerCouponUse(input: {
  couponId: number;
  storeId?: number | null;
  reference: string;
  customerReference?: string | null;
  notes?: string | null;
  usedAt: Date;
  registeredByUserId: number;
}) {
  const db = await requireDb();

  return db.transaction(async tx => {
    const result = await tx
      .update(coupons)
      .set({ usageCount: sql`${coupons.usageCount} + 1` })
      .where(
        and(
          eq(coupons.id, input.couponId),
          eq(coupons.status, "active"),
          lte(coupons.startsAt, input.usedAt),
          gte(coupons.endsAt, input.usedAt),
          or(eq(coupons.usageLimit, 0), lt(coupons.usageCount, coupons.usageLimit)),
        ),
      );

    if (affectedRows(result) !== 1) {
      throw new CouponUseRuleError("Cupom indisponível para utilização neste momento");
    }

    const coupon = await tx.select().from(coupons).where(eq(coupons.id, input.couponId)).limit(1);
    const activeCoupon = coupon[0];
    if (!activeCoupon) throw new CouponUseRuleError("Cupom não encontrado");

    const inserted = await tx.insert(couponUses).values({
      couponId: activeCoupon.id,
      partnerId: activeCoupon.partnerId,
      storeId: input.storeId ?? activeCoupon.storeId ?? null,
      reference: input.reference,
      customerReference: input.customerReference,
      notes: input.notes,
      usedAt: input.usedAt,
      registeredByUserId: input.registeredByUserId,
    });
    return Number(inserted[0].insertId);
  });
}

export async function getDashboardSummary() {
  const db = await requireDb();
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const [partnerTotal, activeCouponTotal, expiringCouponTotal, useTotal, recentUses] = await Promise.all([
    db.select({ value: count() }).from(partners),
    db.select({ value: count() }).from(coupons).where(eq(coupons.status, "active")),
    db
      .select({ value: count() })
      .from(coupons)
      .where(and(eq(coupons.status, "active"), gte(coupons.endsAt, now), lte(coupons.endsAt, nextWeek))),
    db.select({ value: count() }).from(couponUses),
    listCouponUses({}),
  ]);

  return {
    partners: partnerTotal[0]?.value ?? 0,
    activeCoupons: activeCouponTotal[0]?.value ?? 0,
    expiringCoupons: expiringCouponTotal[0]?.value ?? 0,
    registeredUses: useTotal[0]?.value ?? 0,
    recentUses: recentUses.slice(0, 5),
  };
}
