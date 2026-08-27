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
  isNull,
  sql,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { drizzle } from "drizzle-orm/mysql2";
import {
  couponUses,
  coupons,
  couponRules,
  couponParticipatingStores,
  entities,
  integrationEventValues,
  partnerIntegrations,
  partnerStores,
  loginInvites,
  auditLogs,
  emailSenders,
  emailTemplates,
  emailRules,
  emailOutbox,
  notificationTemplates,
  notificationRules,
  notificationPreferences,
  notificationOutbox,
  tollPlazas,
  recommendationCampaigns,
  tollPassageEvents,
  recommendationDeliveries,
  recommendationInteractions,
  type TollPlaza,
  type RecommendationCampaign,
  type TollPassageEvent,
  type RecommendationDelivery,
  type RecommendationInteraction,
  type InsertUser,
  partners,
  type PartnerStore,
  type LoginInvite,
  type AuditLog,
  type EmailSender,
  type EmailTemplate,
  type EmailRule,
  type EmailOutbox,
  type NotificationTemplate,
  type NotificationRule,
  type NotificationOutbox,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { storagePut } from "./storage";
import type { AccessLevel } from "../shared/permissions";
import { buildEmailIdempotencyKey, matchEmailConditions, normalizeEmailAddress, renderEmail, renderEmailText, sanitizeEmailHtml, type EmailCondition, type EmailEventName, type EmailVariables } from "./email";
import { buildNotificationIdempotencyKey, notificationV1Schema, type NotificationV1 } from "../shared/notification-contract";
import { evaluateCouponRules, type CouponRuleDefinition } from "./coupon-rules";

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

export type AccessScope = { role: "user" | "admin"; accessLevel: AccessLevel; entityId: number | null; partnerId: number | null; storeId: number | null };

export function isGlobalScope(scope: AccessScope) {
  return scope.role === "admin" || (!scope.entityId && !scope.partnerId && !scope.storeId);
}

export function scopeAllows(scope: AccessScope, target: { entityId?: number | null; partnerId?: number | null; storeId?: number | null }, mutation = false) {
  if (scope.role === "admin") return true;
  if (scope.entityId && target.entityId !== scope.entityId) return false;
  if (scope.partnerId && target.partnerId !== scope.partnerId) return false;
  if (scope.storeId && target.storeId !== scope.storeId) return false;
  if (mutation && scope.storeId && !target.storeId) return false;
  return true;
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

export type CouponRuleInput = {
  discountType: "percentage" | "fixed";
  discountValue: number;
  minimumPurchaseAmount: number;
  maxRedemptionsPerCustomer: number;
  maxRedemptionsPerVehicle: number;
  maxRedemptionsPerPlate: number;
  allowedWeekdays: number[];
  allowedStartTime?: string | null;
  allowedEndTime?: string | null;
  timezone: string;
  audience?: { requiredSegments?: string[]; excludedSegments?: string[] } | null;
  radiusMeters: number;
  latitude?: number | null;
  longitude?: number | null;
  financialLimit?: number | null;
  financialUsed?: number;
  maxRedemptions: number;
  newCustomerOnly: boolean;
  validationMode: "code" | "qr" | "automatic";
  stackingPolicy: "stackable" | "non_stackable";
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
  rules?: CouponRuleInput;
  participatingStoreIds?: number[];
};

export async function listPartners(filters: {
  search?: string;
  status?: "prospect" | "active" | "inactive" | "blocked";
  scope?: AccessScope;
}) {
  const db = await requireDb();
  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(partners.relationshipStatus, filters.status));
  if (filters.scope && !isGlobalScope(filters.scope)) {
    if (filters.scope.entityId) conditions.push(eq(partners.entityId, filters.scope.entityId));
    if (filters.scope.partnerId) conditions.push(eq(partners.id, filters.scope.partnerId));
  }
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

export async function isPartnerInScope(id: number, scope: AccessScope, mutation = false) {
  if (isGlobalScope(scope)) return true;
  const partner = await getPartnerById(id);
  return !!partner && scopeAllows(scope, { entityId: partner.entityId, partnerId: partner.id }, mutation);
}

export async function isStoreInScope(id: number, scope: AccessScope, mutation = false) {
  if (isGlobalScope(scope)) return true;
  const store = await getPartnerStoreById(id);
  if (!store) return false;
  const partner = await getPartnerById(store.partnerId);
  return !!partner && scopeAllows(scope, { entityId: partner.entityId, partnerId: partner.id, storeId: store.id }, mutation);
}

export async function isCouponInScope(id: number, scope: AccessScope, mutation = false) {
  if (isGlobalScope(scope)) return true;
  const coupon = await getCouponById(id);
  if (!coupon) return false;
  const partner = await getPartnerById(coupon.partnerId);
  return !!partner && scopeAllows(scope, { entityId: partner?.entityId, partnerId: coupon.partnerId, storeId: coupon.storeId }, mutation);
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

export async function deletePartner(id: number) {
  const db = await requireDb();
  await db.update(partners).set({ relationshipStatus: "blocked" }).where(eq(partners.id, id));
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

export async function listEntities(scope?: AccessScope) {
  const db = await requireDb();
  return db.select().from(entities).where(scope && !isGlobalScope(scope) && scope.entityId ? eq(entities.id, scope.entityId) : undefined).orderBy(desc(entities.updatedAt));
}

export async function createEntity(input: EntityInput) {
  const db = await requireDb();
  const result = await db.insert(entities).values(input);
  const rows = await db.select().from(entities).where(eq(entities.id, Number(result[0].insertId))).limit(1);
  return rows[0];
}

export async function deleteEntity(id: number) {
  const db = await requireDb();
  await db.update(entities).set({ status: "inactive" }).where(eq(entities.id, id));
  const rows = await db.select().from(entities).where(eq(entities.id, id)).limit(1);
  return rows[0];
}

export async function listPartnerStores(partnerId?: number, scope?: AccessScope) {
  const db = await requireDb();
  const conditions: SQL[] = [];
  if (partnerId) conditions.push(eq(partnerStores.partnerId, partnerId));
  if (scope && !isGlobalScope(scope)) {
    if (scope.entityId) conditions.push(eq(partners.entityId, scope.entityId));
    if (scope.partnerId) conditions.push(eq(partnerStores.partnerId, scope.partnerId));
    if (scope.storeId) conditions.push(eq(partnerStores.id, scope.storeId));
  }
  return db.select({ store: partnerStores, partnerName: partners.displayName }).from(partnerStores).innerJoin(partners, eq(partners.id, partnerStores.partnerId)).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(partnerStores.updatedAt));
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

export async function deletePartnerStore(id: number) {
  const db = await requireDb();
  await db.update(partnerStores).set({ status: "inactive" }).where(eq(partnerStores.id, id));
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

export async function listLoginInvites(scope?: AccessScope) {
  const db = await requireDb();
  const conditions: SQL[] = [];
  if (scope && !isGlobalScope(scope)) {
    if (scope.entityId) conditions.push(eq(loginInvites.entityId, scope.entityId));
    if (scope.partnerId) conditions.push(eq(loginInvites.partnerId, scope.partnerId));
    if (scope.storeId) conditions.push(eq(loginInvites.storeId, scope.storeId));
  }
  const rows = await db.select().from(loginInvites).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(loginInvites.createdAt));
  const now = new Date();
  const expired = rows.filter(row => row.status === "pending" && row.expiresAt <= now).map(row => row.id);
  if (expired.length) {
    await db.update(loginInvites).set({ status: "expired" }).where(sql`${loginInvites.id} in (${sql.join(expired.map(id => sql`${id}`), sql`, `)})`);
  }
  return rows.map(row => expired.includes(row.id) ? publicLoginInvite({ ...row, status: "expired" }) : publicLoginInvite(row));
}

export async function isLoginInviteInScope(id: number, scope: AccessScope) {
  if (isGlobalScope(scope)) return true;
  const invite = await getLoginInviteById(id);
  if (!invite) return false;
  if (invite.storeId) return isStoreInScope(invite.storeId, scope);
  if (invite.partnerId) return isPartnerInScope(invite.partnerId, scope);
  return !scope.entityId || invite.entityId === scope.entityId;
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

const storePartner = alias(partners, "store_partner");

export async function listAccessUsers(scope?: AccessScope) {
  const db = await requireDb();
  const conditions: SQL[] = [];
  if (scope && !isGlobalScope(scope)) {
    if (scope.entityId) conditions.push(or(eq(users.entityId, scope.entityId), eq(partners.entityId, scope.entityId), eq(storePartner.entityId, scope.entityId))!);
    if (scope.partnerId) conditions.push(or(eq(users.partnerId, scope.partnerId), eq(partnerStores.partnerId, scope.partnerId))!);
    if (scope.storeId) conditions.push(eq(users.storeId, scope.storeId));
  }
  return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, accessLevel: users.accessLevel, entityId: users.entityId, partnerId: users.partnerId, storeId: users.storeId, updatedAt: users.updatedAt }).from(users).leftJoin(partners, eq(users.partnerId, partners.id)).leftJoin(partnerStores, eq(users.storeId, partnerStores.id)).leftJoin(storePartner, eq(partnerStores.partnerId, storePartner.id)).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(users.updatedAt));
}

export async function isAccessUserInScope(id: number, scope: AccessScope) {
  if (isGlobalScope(scope)) return true;
  const db = await requireDb();
  const rows = await db.select({ entityId: users.entityId, partnerId: users.partnerId, storeId: users.storeId, partnerEntityId: partners.entityId, storePartnerId: partnerStores.partnerId, storePartnerEntityId: storePartner.entityId }).from(users).leftJoin(partners, eq(users.partnerId, partners.id)).leftJoin(partnerStores, eq(users.storeId, partnerStores.id)).leftJoin(storePartner, eq(partnerStores.partnerId, storePartner.id)).where(eq(users.id, id)).limit(1);
  const row = rows[0];
  if (!row) return false;
  return scopeAllows(scope, { entityId: row.entityId ?? row.partnerEntityId ?? row.storePartnerEntityId, partnerId: row.partnerId ?? row.storePartnerId, storeId: row.storeId });
}

export async function isAccessTargetInScope(target: { entityId?: number | null; partnerId?: number | null; storeId?: number | null }, scope: AccessScope) {
  if (isGlobalScope(scope)) return true;
  if (target.storeId) return isStoreInScope(target.storeId, scope, true);
  if (target.partnerId) return isPartnerInScope(target.partnerId, scope, true);
  return !scope.entityId || target.entityId === scope.entityId;
}

export async function updateUserAccess(id: number, input: { accessLevel: "admin" | "manager" | "operator" | "viewer"; entityId?: number | null; partnerId?: number | null; storeId?: number | null }, scope?: AccessScope) {
  const db = await requireDb();
  if (scope && !(await isAccessUserInScope(id, scope))) return null;
  if (scope && !(await isAccessTargetInScope({ entityId: input.entityId ?? null, partnerId: input.partnerId ?? null, storeId: input.storeId ?? null }, scope))) return null;
  await db.update(users).set(input).where(eq(users.id, id));
  const rows = await listAccessUsers(scope);
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

export async function listPartnerIntegrations(scope?: AccessScope) {
  const db = await requireDb();
  const conditions: SQL[] = [];
  if (scope && !isGlobalScope(scope)) {
    if (scope.entityId) conditions.push(eq(partners.entityId, scope.entityId));
    if (scope.partnerId) conditions.push(eq(partnerIntegrations.partnerId, scope.partnerId));
  }
  const rows = await db
    .select({ integration: partnerIntegrations, partnerName: partners.displayName })
    .from(partnerIntegrations)
    .innerJoin(partners, eq(partners.id, partnerIntegrations.partnerId))
    .where(conditions.length ? and(...conditions) : undefined)
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
  scope?: AccessScope;
}) {
  const db = await requireDb();
  const now = new Date();
  const conditions: SQL[] = [];
  if (filters.partnerId) conditions.push(eq(coupons.partnerId, filters.partnerId));
  if (filters.storeId) conditions.push(eq(coupons.storeId, filters.storeId));
  if (filters.scope && !isGlobalScope(filters.scope)) {
    if (filters.scope.entityId) conditions.push(eq(partners.entityId, filters.scope.entityId));
    if (filters.scope.partnerId) conditions.push(eq(coupons.partnerId, filters.scope.partnerId));
    if (filters.scope.storeId) conditions.push(or(eq(coupons.storeId, filters.scope.storeId), isNull(coupons.storeId))!);
  }
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

async function persistCouponRule(tx: any, couponId: number, rules: CouponRuleInput) {
  await tx.insert(couponRules).values({
    couponId,
    discountType: rules.discountType,
    discountValue: rules.discountValue,
    minimumPurchaseAmount: rules.minimumPurchaseAmount,
    maxRedemptionsPerCustomer: rules.maxRedemptionsPerCustomer,
    maxRedemptionsPerVehicle: rules.maxRedemptionsPerVehicle,
    maxRedemptionsPerPlate: rules.maxRedemptionsPerPlate,
    allowedWeekdaysJson: JSON.stringify(rules.allowedWeekdays),
    allowedStartTime: rules.allowedStartTime ?? null,
    allowedEndTime: rules.allowedEndTime ?? null,
    timezone: rules.timezone,
    audienceJson: rules.audience ? JSON.stringify(rules.audience) : null,
    radiusMeters: rules.radiusMeters,
    latitude: rules.latitude ?? null,
    longitude: rules.longitude ?? null,
    financialLimit: rules.financialLimit ?? null,
    financialUsed: rules.financialUsed ?? 0,
    maxRedemptions: rules.maxRedemptions,
    newCustomerOnly: rules.newCustomerOnly ? 1 : 0,
    validationMode: rules.validationMode,
    stackingPolicy: rules.stackingPolicy,
  });
}

export async function createCoupon(input: CouponInput) {
  const db = await requireDb();
  const { rules, participatingStoreIds, ...couponData } = input;
  return db.transaction(async tx => {
    const result = await tx.insert(coupons).values(couponData);
    const couponId = Number(result[0].insertId);
    if (rules) await persistCouponRule(tx, couponId, rules);
    if (participatingStoreIds?.length) await tx.insert(couponParticipatingStores).values(participatingStoreIds.map(storeId => ({ couponId, storeId })));
    const created = await tx.select().from(coupons).where(eq(coupons.id, couponId)).limit(1);
    return created[0];
  });
}

export async function updateCoupon(id: number, input: CouponInput) {
  const db = await requireDb();
  const { rules, participatingStoreIds, ...couponData } = input;
  return db.transaction(async tx => {
    await tx.update(coupons).set(couponData).where(eq(coupons.id, id));
    if (rules) {
      await tx.delete(couponRules).where(eq(couponRules.couponId, id));
      await persistCouponRule(tx, id, rules);
    }
    if (participatingStoreIds) {
      await tx.delete(couponParticipatingStores).where(eq(couponParticipatingStores.couponId, id));
      if (participatingStoreIds.length) await tx.insert(couponParticipatingStores).values(participatingStoreIds.map(storeId => ({ couponId: id, storeId })));
    }
    const updated = await tx.select().from(coupons).where(eq(coupons.id, id)).limit(1);
    return updated[0];
  });
}

export async function getCouponRulesByCouponId(couponId: number) {
  const db = await requireDb();
  const result = await db.select().from(couponRules).where(eq(couponRules.couponId, couponId)).limit(1);
  return result[0] ?? null;
}

export async function listCouponParticipatingStoreIds(couponId: number) {
  const db = await requireDb();
  const rows = await db.select({ storeId: couponParticipatingStores.storeId }).from(couponParticipatingStores).where(eq(couponParticipatingStores.couponId, couponId));
  return rows.map(row => row.storeId);
}

export async function updateCouponStatus(
  id: number,
  status: "draft" | "active" | "paused" | "ended",
) {
  const db = await requireDb();
  await db.update(coupons).set({ status }).where(eq(coupons.id, id));
  return getCouponById(id);
}

export async function deleteCoupon(id: number) {
  return updateCouponStatus(id, "ended");
}

export async function listCouponUses(filters: {
  couponId?: number;
  partnerId?: number;
  storeId?: number;
  search?: string;
  startsAt?: Date;
  endsAt?: Date;
  scope?: AccessScope;
}) {
  const db = await requireDb();
  const conditions: SQL[] = [];
  if (filters.couponId) conditions.push(eq(couponUses.couponId, filters.couponId));
  if (filters.partnerId) conditions.push(eq(couponUses.partnerId, filters.partnerId));
  if (filters.storeId) conditions.push(eq(couponUses.storeId, filters.storeId));
  if (filters.scope && !isGlobalScope(filters.scope)) {
    if (filters.scope.entityId) conditions.push(eq(partners.entityId, filters.scope.entityId));
    if (filters.scope.partnerId) conditions.push(eq(couponUses.partnerId, filters.scope.partnerId));
    if (filters.scope.storeId) conditions.push(eq(couponUses.storeId, filters.scope.storeId));
  }
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
  vehicleReference?: string | null;
  plateReference?: string | null;
  purchaseAmount?: number | null;
  presentedCredential?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  usedAt: Date;
  registeredByUserId: number;
}) {
  const db = await requireDb();

  return db.transaction(async tx => {
    await tx.execute(sql`SELECT id FROM coupons WHERE id = ${input.couponId} FOR UPDATE`);
    const couponRows = await tx.select().from(coupons).where(eq(coupons.id, input.couponId)).limit(1);
    const activeCoupon = couponRows[0];
    if (!activeCoupon) throw new CouponUseRuleError("Cupom não encontrado");
    if (activeCoupon.status !== "active" || activeCoupon.startsAt > input.usedAt || activeCoupon.endsAt < input.usedAt || (activeCoupon.usageLimit > 0 && activeCoupon.usageCount >= activeCoupon.usageLimit)) throw new CouponUseRuleError("Cupom indisponível para utilização neste momento");

    const storedRule = await tx.select().from(couponRules).where(eq(couponRules.couponId, input.couponId)).limit(1);
    const storedStores = await tx.select({ storeId: couponParticipatingStores.storeId }).from(couponParticipatingStores).where(eq(couponParticipatingStores.couponId, input.couponId));
    let discountAmount: number | null = null;
    if (storedRule[0]) {
      const row = storedRule[0];
      const parseJson = <T>(value: string | null, fallback: T): T => { try { return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } };
      const countFor = async (column: typeof couponUses.customerReference | typeof couponUses.vehicleReference | typeof couponUses.plateReference, reference: string | null | undefined) => {
        if (!reference) return 0;
        const result = await tx.select({ total: count() }).from(couponUses).where(and(eq(couponUses.couponId, input.couponId), eq(column, reference)));
        return Number(result[0]?.total ?? 0);
      };
      const customerRedemptions = await countFor(couponUses.customerReference, input.customerReference);
      const vehicleRedemptions = await countFor(couponUses.vehicleReference, input.vehicleReference);
      const plateRedemptions = await countFor(couponUses.plateReference, input.plateReference);
      const rule: CouponRuleDefinition = {
        discountType: row.discountType,
        discountValue: Number(row.discountValue),
        minimumPurchaseAmount: Number(row.minimumPurchaseAmount),
        maxRedemptionsPerCustomer: row.maxRedemptionsPerCustomer,
        maxRedemptionsPerVehicle: row.maxRedemptionsPerVehicle,
        maxRedemptionsPerPlate: row.maxRedemptionsPerPlate,
        allowedWeekdays: parseJson<number[]>(row.allowedWeekdaysJson, []),
        allowedStartTime: row.allowedStartTime,
        allowedEndTime: row.allowedEndTime,
        timezone: row.timezone,
        audience: parseJson(row.audienceJson, null),
        radiusMeters: row.radiusMeters,
        latitude: row.latitude == null ? null : Number(row.latitude),
        longitude: row.longitude == null ? null : Number(row.longitude),
        financialLimit: row.financialLimit == null ? null : Number(row.financialLimit),
        financialUsed: Number(row.financialUsed),
        maxRedemptions: row.maxRedemptions,
        newCustomerOnly: Boolean(row.newCustomerOnly),
        validationMode: row.validationMode,
        stackingPolicy: row.stackingPolicy,
      };
      const decision = evaluateCouponRules(rule, {
        now: input.usedAt,
        purchaseAmount: input.purchaseAmount ?? 0,
        customerReference: input.customerReference,
        vehicleReference: input.vehicleReference,
        plateReference: input.plateReference,
        customerRedemptions,
        vehicleRedemptions,
        plateRedemptions,
        totalRedemptions: activeCoupon.usageCount,
        isNewCustomer: customerRedemptions === 0,
        storeId: input.storeId ?? activeCoupon.storeId,
        participatingStoreIds: storedStores.map(store => store.storeId),
        latitude: input.latitude,
        longitude: input.longitude,
        presentedCredential: input.presentedCredential,
      });
      if (!decision.eligible) throw new CouponUseRuleError(`Cupom inelegível: ${decision.reasons.join(", ")}`);
      discountAmount = decision.discountAmount;
      if (row.financialLimit !== null) {
        const budgetUpdate = await tx.update(couponRules).set({ financialUsed: sql`${couponRules.financialUsed} + ${discountAmount}` }).where(and(eq(couponRules.id, row.id), lte(sql`${couponRules.financialUsed} + ${discountAmount}`, row.financialLimit)));
        if (affectedRows(budgetUpdate) !== 1) throw new CouponUseRuleError("Limite financeiro da campanha atingido");
      }
    }

    const result = await tx.update(coupons).set({ usageCount: sql`${coupons.usageCount} + 1` }).where(and(eq(coupons.id, input.couponId), eq(coupons.status, "active"), or(eq(coupons.usageLimit, 0), lt(coupons.usageCount, coupons.usageLimit))));
    if (affectedRows(result) !== 1) throw new CouponUseRuleError("Limite de utilizações atingido durante o resgate");
    const inserted = await tx.insert(couponUses).values({ couponId: activeCoupon.id, partnerId: activeCoupon.partnerId, storeId: input.storeId ?? activeCoupon.storeId ?? null, reference: input.reference, customerReference: input.customerReference, vehicleReference: input.vehicleReference, plateReference: input.plateReference, purchaseAmount: input.purchaseAmount, discountAmount, notes: input.notes, usedAt: input.usedAt, registeredByUserId: input.registeredByUserId });
    return Number(inserted[0].insertId);
  });
}

export async function getDashboardSummary(scope?: AccessScope) {
  const db = await requireDb();
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const [scopedPartners, scopedCoupons, scopedUses] = await Promise.all([
    listPartners({ scope }),
    listCoupons({ status: "active", scope }),
    listCouponUses({ scope }),
  ]);
  const expiringCoupons = scopedCoupons.filter(coupon => coupon.endsAt >= now && coupon.endsAt <= nextWeek);
  const partnerTotal = scopedPartners.length;
  const activeCouponTotal = scopedCoupons.length;
  const expiringCouponTotal = expiringCoupons.length;
  const useTotal = scopedUses.length;
  const recentUses = scopedUses;

  return {
    partners: partnerTotal,
    activeCoupons: activeCouponTotal,
    expiringCoupons: expiringCouponTotal,
    registeredUses: useTotal,
    recentUses: recentUses.slice(0, 5),
  };
}


export type AuditLogInput = {
  actorUserId?: number | null;
  actorEmail?: string | null;
  action: "create" | "update" | "status_change" | "delete" | "revoke" | "activate" | "resend" | "simulate";
  resourceType: "access" | "login_invite" | "entity" | "partner" | "store" | "coupon" | "toll_plaza" | "integration" | "email_sender" | "email_template" | "email_rule" | "email_outbox" | "notification_template" | "notification_rule" | "notification_outbox";
  resourceId?: number | null;
  resourceLabel?: string | null;
  before?: unknown;
  after?: unknown;
  scope?: unknown;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

const auditSensitiveKeys = new Set(["tokenHash", "secretHash", "password", "apiKey", "authorization", "dataUrl"]);

export function redactAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactAuditValue);
  if (!value || typeof value !== "object") return value;
  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (auditSensitiveKeys.has(key)) continue;
    output[key] = redactAuditValue(nested);
  }
  return output;
}

function auditJson(value: unknown) {
  if (value == null) return null;
  return JSON.stringify(redactAuditValue(value));
}

export async function appendAuditLog(input: AuditLogInput) {
  const db = await requireDb();
  let actorUserId = input.actorUserId ?? null;
  if (actorUserId !== null) {
    const actor = await db.select({ id: users.id }).from(users).where(eq(users.id, actorUserId)).limit(1);
    actorUserId = actor[0]?.id ?? null;
  }
  await db.insert(auditLogs).values({
    actorUserId,
    actorEmail: input.actorEmail ?? null,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    resourceLabel: input.resourceLabel ?? null,
    beforeJson: auditJson(input.before),
    afterJson: auditJson(input.after),
    scopeJson: auditJson(input.scope),
    requestId: input.requestId ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
  });
}

export async function listAuditLogs(filters?: { resourceType?: AuditLogInput["resourceType"]; resourceId?: number; limit?: number }) {
  const db = await requireDb();
  const conditions: SQL[] = [];
  if (filters?.resourceType) conditions.push(eq(auditLogs.resourceType, filters.resourceType));
  if (filters?.resourceId) conditions.push(eq(auditLogs.resourceId, filters.resourceId));
  const rows = await db.select().from(auditLogs).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(auditLogs.createdAt)).limit(Math.min(filters?.limit ?? 100, 200));
  return rows;
}

type EmailSenderInput = Pick<EmailSender, "name" | "fromName" | "fromEmail" | "replyTo" | "status">;
export async function listEmailSenders() {
  const db = await requireDb();
  return db.select().from(emailSenders).orderBy(desc(emailSenders.updatedAt));
}
export async function createEmailSender(input: EmailSenderInput & { createdByUserId: number }) {
  const db = await requireDb();
  const result = await db.insert(emailSenders).values(input);
  const rows = await db.select().from(emailSenders).where(eq(emailSenders.id, Number(result[0].insertId))).limit(1);
  return rows[0];
}

export type EmailTemplateInput = Pick<EmailTemplate, "templateKey" | "name" | "status" | "version" | "senderId" | "subject" | "preheader" | "bodyHtml" | "bodyText"> & { allowedVariables: string[]; createdByUserId: number };
export async function listEmailTemplates() {
  const db = await requireDb();
  return db.select().from(emailTemplates).orderBy(desc(emailTemplates.updatedAt));
}
export async function getEmailTemplateById(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id)).limit(1);
  return rows[0];
}
export async function createEmailTemplate(input: EmailTemplateInput) {
  const db = await requireDb();
  const result = await db.insert(emailTemplates).values({ ...input, allowedVariablesJson: JSON.stringify(input.allowedVariables) });
  return getEmailTemplateById(Number(result[0].insertId));
}
export async function updateEmailTemplate(id: number, input: Omit<EmailTemplateInput, "createdByUserId">) {
  const db = await requireDb();
  await db.update(emailTemplates).set({ ...input, allowedVariablesJson: JSON.stringify(input.allowedVariables) }).where(eq(emailTemplates.id, id));
  return getEmailTemplateById(id);
}

export type EmailRuleInput = Pick<EmailRule, "templateId" | "name" | "eventName" | "enabled" | "cooldownSeconds"> & { conditions: EmailCondition[]; createdByUserId: number };
export async function listEmailRules() {
  const db = await requireDb();
  return db.select().from(emailRules).orderBy(desc(emailRules.updatedAt));
}
export async function createEmailRule(input: EmailRuleInput) {
  const db = await requireDb();
  const result = await db.insert(emailRules).values({ ...input, conditionsJson: JSON.stringify(input.conditions) });
  const rows = await db.select().from(emailRules).where(eq(emailRules.id, Number(result[0].insertId))).limit(1);
  return rows[0];
}
export async function updateEmailRule(id: number, input: Omit<EmailRuleInput, "createdByUserId">) {
  const db = await requireDb();
  await db.update(emailRules).set({ ...input, conditionsJson: JSON.stringify(input.conditions) }).where(eq(emailRules.id, id));
  const rows = await db.select().from(emailRules).where(eq(emailRules.id, id)).limit(1);
  return rows[0];
}

export type EmailOutboxInput = {
  eventName: EmailEventName;
  recipientEmail: string;
  recipientName?: string | null;
  variables: EmailVariables;
  templateId?: number | null;
  ruleId?: number | null;
  eventKey: string;
  createdByUserId?: number | null;
};

export async function enqueueEmailMessage(input: EmailOutboxInput) {
  const db = await requireDb();
  const recipientEmail = normalizeEmailAddress(input.recipientEmail);
  const template = input.templateId ? await getEmailTemplateById(input.templateId) : null;
  if (!template) throw new Error("Template de e-mail não encontrado");
  const allowedVariables = JSON.parse(template.allowedVariablesJson) as string[];
  const checked = { subject: template.subject, preheader: template.preheader, bodyHtml: template.bodyHtml, allowedVariables };
  const safeTemplate = { ...checked, bodyHtml: sanitizeEmailHtml(checked.bodyHtml) };
  const renderedSubject = renderEmailText(safeTemplate.subject, input.variables);
  const renderedHtml = renderEmail(safeTemplate.bodyHtml, input.variables);
  const renderedText = template.bodyText ? renderEmailText(template.bodyText, input.variables) : null;
  const idempotencyKey = buildEmailIdempotencyKey(input.eventName, recipientEmail, input.ruleId ?? null, input.eventKey);
  try {
    const result = await db.insert(emailOutbox).values({
      idempotencyKey,
      templateId: template.id,
      ruleId: input.ruleId ?? null,
      eventName: input.eventName,
      recipientEmail,
      recipientName: input.recipientName ?? null,
      variablesJson: JSON.stringify(input.variables),
      renderedSubject,
      renderedHtml,
      renderedText,
      status: "queued",
      attempts: 0,
      availableAt: new Date(),
      createdByUserId: input.createdByUserId ?? null,
    });
    const rows = await db.select().from(emailOutbox).where(eq(emailOutbox.id, Number(result[0].insertId))).limit(1);
    return { created: true, row: rows[0] };
  } catch (error) {
    if ((error as { code?: string }).code !== "ER_DUP_ENTRY") throw error;
    const rows = await db.select().from(emailOutbox).where(eq(emailOutbox.idempotencyKey, idempotencyKey)).limit(1);
    return { created: false, row: rows[0] };
  }
}

export async function enqueueEmailRules(input: { eventName: EmailEventName; recipientEmail: string; recipientName?: string | null; variables: EmailVariables; eventKey: string; createdByUserId?: number | null }) {
  const db = await requireDb();
  const rules = await db.select().from(emailRules).where(and(eq(emailRules.eventName, input.eventName), eq(emailRules.enabled, 1)));
  const queued: Array<{ created: boolean; row: EmailOutbox | undefined }> = [];
  for (const rule of rules) {
    const conditions = JSON.parse(rule.conditionsJson) as EmailCondition[];
    if (!matchEmailConditions(conditions, input.variables)) continue;
    queued.push(await enqueueEmailMessage({ ...input, templateId: rule.templateId, ruleId: rule.id }));
  }
  return queued;
}

export async function listEmailOutbox(filters?: { status?: EmailOutbox["status"]; limit?: number }) {
  const db = await requireDb();
  return db.select().from(emailOutbox).where(filters?.status ? eq(emailOutbox.status, filters.status) : undefined).orderBy(desc(emailOutbox.createdAt)).limit(Math.min(filters?.limit ?? 100, 200));
}
export async function simulateEmailOutbox(id: number) {
  const db = await requireDb();
  const now = new Date();
  await db.update(emailOutbox).set({ status: "simulated", attempts: sql`${emailOutbox.attempts} + 1`, processedAt: now, updatedAt: now }).where(and(eq(emailOutbox.id, id), or(eq(emailOutbox.status, "queued"), eq(emailOutbox.status, "failed"))));
  const rows = await db.select().from(emailOutbox).where(eq(emailOutbox.id, id)).limit(1);
  return rows[0];
}
export async function listTollPlazas() {
  const db = await requireDb();
  return db.select().from(tollPlazas).orderBy(tollPlazas.name);
}

export type TollPlazaInput = Pick<TollPlaza, "code" | "name" | "highway" | "direction" | "latitude" | "longitude" | "radiusMeters" | "status">;
export async function createTollPlaza(input: TollPlazaInput) {
  const db = await requireDb();
  const result = await db.insert(tollPlazas).values(input);
  const rows = await db.select().from(tollPlazas).where(eq(tollPlazas.id, Number(result[0].insertId))).limit(1);
  return rows[0];
}

export async function listRecommendationCampaigns() {
  const db = await requireDb();
  return db.select().from(recommendationCampaigns).orderBy(desc(recommendationCampaigns.updatedAt));
}

export async function listRecommendationCandidatesForToll(tollPlazaId: number) {
  const db = await requireDb();
  const rows = await db
    .select({ campaign: recommendationCampaigns, coupon: coupons })
    .from(recommendationCampaigns)
    .innerJoin(coupons, eq(coupons.id, recommendationCampaigns.couponId))
    .where(eq(recommendationCampaigns.tollPlazaId, tollPlazaId));
  return rows;
}

export type RecommendationCampaignInput = Pick<RecommendationCampaign, "partnerId" | "storeId" | "couponId" | "tollPlazaId" | "name" | "mode" | "sponsorshipLabel" | "startsAt" | "endsAt" | "budgetLimit" | "bidAmount" | "frequencyCap" | "status"> & { createdByUserId: number };
export async function createRecommendationCampaign(input: RecommendationCampaignInput) {
  const db = await requireDb();
  const result = await db.insert(recommendationCampaigns).values(input);
  const rows = await db.select().from(recommendationCampaigns).where(eq(recommendationCampaigns.id, Number(result[0].insertId))).limit(1);
  return rows[0];
}

export async function recordTollPassageEvent(input: Pick<TollPassageEvent, "idempotencyKey" | "userReference" | "tollPlazaId" | "occurredAt" | "accuracyMeters" | "consentPersonalization" | "source" | "payloadJson" | "isSimulation">) {
  const db = await requireDb();
  try {
    const result = await db.insert(tollPassageEvents).values(input);
    const rows = await db.select().from(tollPassageEvents).where(eq(tollPassageEvents.id, Number(result[0].insertId))).limit(1);
    return { created: true, row: rows[0] };
  } catch (error) {
    if ((error as { code?: string }).code !== "ER_DUP_ENTRY") throw error;
    const rows = await db.select().from(tollPassageEvents).where(eq(tollPassageEvents.idempotencyKey, input.idempotencyKey)).limit(1);
    return { created: false, row: rows[0] };
  }
}

export async function getRecommendationDeliveryById(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(recommendationDeliveries).where(eq(recommendationDeliveries.id, id)).limit(1);
  return rows[0];
}

export async function listPreparedRecommendationDeliveries(userReference: string, passageEventId: number) {
  const db = await requireDb();
  return db.select().from(recommendationDeliveries).where(and(eq(recommendationDeliveries.userReference, userReference), eq(recommendationDeliveries.passageEventId, passageEventId), eq(recommendationDeliveries.isSimulation, 1))).orderBy(desc(recommendationDeliveries.score));
}

export async function createRecommendationDelivery(input: Omit<Pick<RecommendationDelivery, "idempotencyKey" | "passageEventId" | "campaignId" | "couponId" | "userReference" | "mode" | "score" | "explanation" | "status" | "isSimulation">, never> & Partial<Pick<RecommendationDelivery, "consentVersion" | "disclosureJson" | "decisionContextJson">> & Pick<RecommendationDelivery, "idempotencyKey" | "passageEventId" | "campaignId" | "couponId" | "userReference" | "mode" | "score" | "explanation" | "status" | "isSimulation">) {
  const db = await requireDb();
  try {
    const result = await db.insert(recommendationDeliveries).values(input);
    const rows = await db.select().from(recommendationDeliveries).where(eq(recommendationDeliveries.id, Number(result[0].insertId))).limit(1);
    return { created: true, row: rows[0] };
  } catch (error) {
    if ((error as { code?: string }).code !== "ER_DUP_ENTRY") throw error;
    const rows = await db.select().from(recommendationDeliveries).where(eq(recommendationDeliveries.idempotencyKey, input.idempotencyKey)).limit(1);
    return { created: false, row: rows[0] };
  }
}

export async function recordRecommendationInteraction(input: Pick<RecommendationInteraction, "idempotencyKey" | "deliveryId" | "campaignId" | "userReference" | "eventName" | "costAmount" | "eventAt" | "isSimulation">) {
  const db = await requireDb();
  try {
    const result = await db.insert(recommendationInteractions).values(input);
    const rows = await db.select().from(recommendationInteractions).where(eq(recommendationInteractions.id, Number(result[0].insertId))).limit(1);
    return { created: true, row: rows[0] };
  } catch (error) {
    if ((error as { code?: string }).code !== "ER_DUP_ENTRY") throw error;
    const rows = await db.select().from(recommendationInteractions).where(eq(recommendationInteractions.idempotencyKey, input.idempotencyKey)).limit(1);
    return { created: false, row: rows[0] };
  }
}

export type RecommendationMetricsFilter = { campaignId?: number; partnerId?: number; storeId?: number; tollPlazaId?: number; startsAt?: Date; endsAt?: Date };
export async function listRecommendationMetrics(filter: RecommendationMetricsFilter = {}) {
  const db = await requireDb();
  const conditions: SQL[] = [eq(recommendationInteractions.isSimulation, 0)];
  if (filter.campaignId) conditions.push(eq(recommendationInteractions.campaignId, filter.campaignId));
  if (filter.partnerId) conditions.push(eq(recommendationCampaigns.partnerId, filter.partnerId));
  if (filter.storeId) conditions.push(eq(recommendationCampaigns.storeId, filter.storeId));
  if (filter.tollPlazaId) conditions.push(eq(recommendationCampaigns.tollPlazaId, filter.tollPlazaId));
  if (filter.startsAt) conditions.push(gte(recommendationInteractions.eventAt, filter.startsAt));
  if (filter.endsAt) conditions.push(lte(recommendationInteractions.eventAt, filter.endsAt));
  return db
    .select({ eventName: recommendationInteractions.eventName, partnerId: recommendationCampaigns.partnerId, storeId: recommendationCampaigns.storeId, tollPlazaId: recommendationCampaigns.tollPlazaId, total: count(recommendationInteractions.id) })
    .from(recommendationInteractions)
    .innerJoin(recommendationCampaigns, eq(recommendationCampaigns.id, recommendationInteractions.campaignId))
    .where(and(...conditions))
    .groupBy(recommendationInteractions.eventName, recommendationCampaigns.partnerId, recommendationCampaigns.storeId, recommendationCampaigns.tollPlazaId);
}

export async function retryEmailOutbox(id: number) {
  const db = await requireDb();
  await db.update(emailOutbox).set({ status: "queued", lastError: null, availableAt: new Date() }).where(eq(emailOutbox.id, id));
  const rows = await db.select().from(emailOutbox).where(eq(emailOutbox.id, id)).limit(1);
  return rows[0];
}

export type NotificationTemplateInput = Pick<NotificationTemplate, "templateKey" | "name" | "status" | "version" | "title" | "body" | "expandedBody" | "imageUrl" | "iconUrl" | "ctaLabel" | "deepLink" | "deliveryMode" | "locale" | "priority"> & { allowedVariables: string[]; createdByUserId: number };
export async function listNotificationTemplates() { const db = await requireDb(); return db.select().from(notificationTemplates).orderBy(desc(notificationTemplates.updatedAt)); }
export async function getNotificationTemplateById(id: number) { const db = await requireDb(); const rows = await db.select().from(notificationTemplates).where(eq(notificationTemplates.id, id)).limit(1); return rows[0]; }
export async function createNotificationTemplate(input: NotificationTemplateInput) { const db = await requireDb(); const result = await db.insert(notificationTemplates).values({ ...input, allowedVariablesJson: JSON.stringify(input.allowedVariables) }); return getNotificationTemplateById(Number(result[0].insertId)); }
export async function uploadNotificationIcon(id: number, input: ImageUploadInput) { const db = await requireDb(); const { data, mimeType, safeName } = decodeImageUpload(input); const upload = await storagePut(`notifications/${id}/icon/${safeName}`, data, mimeType); await db.update(notificationTemplates).set({ iconUrl: upload.url }).where(eq(notificationTemplates.id, id)); return getNotificationTemplateById(id); }
export async function updateNotificationTemplate(id: number, input: Omit<NotificationTemplateInput, "createdByUserId">) { const db = await requireDb(); await db.update(notificationTemplates).set({ ...input, allowedVariablesJson: JSON.stringify(input.allowedVariables) }).where(eq(notificationTemplates.id, id)); return getNotificationTemplateById(id); }

export type NotificationRuleInput = Pick<NotificationRule, "templateId" | "name" | "eventName" | "enabled" | "cooldownSeconds"> & { conditions: EmailCondition[]; createdByUserId: number };
export async function listNotificationRules() { const db = await requireDb(); return db.select().from(notificationRules).orderBy(desc(notificationRules.updatedAt)); }
export async function createNotificationRule(input: NotificationRuleInput) { const db = await requireDb(); const result = await db.insert(notificationRules).values({ ...input, conditionsJson: JSON.stringify(input.conditions) }); const rows = await db.select().from(notificationRules).where(eq(notificationRules.id, Number(result[0].insertId))).limit(1); return rows[0]; }
export async function updateNotificationRule(id: number, input: Omit<NotificationRuleInput, "createdByUserId">) { const db = await requireDb(); await db.update(notificationRules).set({ ...input, conditionsJson: JSON.stringify(input.conditions) }).where(eq(notificationRules.id, id)); const rows = await db.select().from(notificationRules).where(eq(notificationRules.id, id)).limit(1); return rows[0]; }

export type NotificationOutboxInput = { templateId: number; ruleId?: number | null; eventName: string; recipientReference: string; eventKey: string; variables: Record<string, unknown>; data?: Record<string, unknown>; couponId?: number | null; benefitId?: number | null; expiresAt?: Date | null; createdByUserId?: number | null };
export async function enqueueNotification(input: NotificationOutboxInput) {
  const db = await requireDb();
  const template = await getNotificationTemplateById(input.templateId);
  if (!template) throw new Error("Template de notificação não encontrado");
  const allowed = JSON.parse(template.allowedVariablesJson) as string[];
  const variables = Object.fromEntries(Object.entries(input.variables).filter(([key]) => allowed.includes(key)));
  const replace = (value: string) => value.replace(/{{\s*([\w.-]+)\s*}}/g, (_, key: string) => String(variables[key] ?? ""));
  const payload: NotificationV1 = notificationV1Schema.parse({ version: "notification.v1", notificationId: 1, eventName: input.eventName, recipientReference: input.recipientReference, title: replace(template.title), body: replace(template.body), expandedBody: template.expandedBody ? replace(template.expandedBody) : null, imageUrl: template.imageUrl, ctaLabel: template.ctaLabel ? replace(template.ctaLabel) : null, deepLink: template.deepLink ? replace(template.deepLink) : null, couponId: input.couponId ?? null, benefitId: input.benefitId ?? null, expiresAt: input.expiresAt?.toISOString() ?? null, priority: template.priority, locale: template.locale, data: input.data ?? {} });
  const idempotencyKey = buildNotificationIdempotencyKey(input.eventName, input.recipientReference, input.templateId, input.eventKey);
  payload.notificationId = 0;
  try {
    const result = await db.insert(notificationOutbox).values({ idempotencyKey, templateId: input.templateId, ruleId: input.ruleId ?? null, eventName: input.eventName, recipientReference: input.recipientReference, payloadJson: JSON.stringify(payload), deliveryMode: template.deliveryMode, status: "queued", availableAt: new Date(), createdByUserId: input.createdByUserId ?? null });
    const rows = await db.select().from(notificationOutbox).where(eq(notificationOutbox.id, Number(result[0].insertId))).limit(1);
    const row = rows[0];
    if (row) { const hydrated = { ...payload, notificationId: row.id }; await db.update(notificationOutbox).set({ payloadJson: JSON.stringify(hydrated) }).where(eq(notificationOutbox.id, row.id)); return { created: true, row: { ...row, payloadJson: JSON.stringify(hydrated) } }; }
  } catch (error) { if ((error as { code?: string }).code !== "ER_DUP_ENTRY") throw error; }
  const rows = await db.select().from(notificationOutbox).where(eq(notificationOutbox.idempotencyKey, idempotencyKey)).limit(1);
  return { created: false, row: rows[0] };
}
export async function listNotificationOutbox(filters?: { status?: NotificationOutbox["status"]; limit?: number }) { const db = await requireDb(); return db.select().from(notificationOutbox).where(filters?.status ? eq(notificationOutbox.status, filters.status) : undefined).orderBy(desc(notificationOutbox.createdAt)).limit(Math.min(filters?.limit ?? 100, 200)); }
export async function simulateNotificationOutbox(id: number) { const db = await requireDb(); const now = new Date(); await db.update(notificationOutbox).set({ status: "simulated", attempts: sql`${notificationOutbox.attempts} + 1`, processedAt: now, updatedAt: now }).where(and(eq(notificationOutbox.id, id), or(eq(notificationOutbox.status, "queued"), eq(notificationOutbox.status, "failed")))); const rows = await db.select().from(notificationOutbox).where(eq(notificationOutbox.id, id)).limit(1); return rows[0]; }
export async function retryNotificationOutbox(id: number) { const db = await requireDb(); await db.update(notificationOutbox).set({ status: "queued", lastError: null, availableAt: new Date() }).where(eq(notificationOutbox.id, id)); const rows = await db.select().from(notificationOutbox).where(eq(notificationOutbox.id, id)).limit(1); return rows[0]; }
export async function listNotificationPreferences(userReference: string) { const db = await requireDb(); return db.select().from(notificationPreferences).where(eq(notificationPreferences.userReference, userReference)); }
export async function upsertNotificationPreference(input: { userReference: string; channel: string; enabled: boolean; consentVersion?: string | null }) { const db = await requireDb(); await db.insert(notificationPreferences).values({ userReference: input.userReference, channel: input.channel, enabled: input.enabled ? 1 : 0, consentVersion: input.consentVersion ?? null }).onDuplicateKeyUpdate({ set: { enabled: input.enabled ? 1 : 0, consentVersion: input.consentVersion ?? null } }); return listNotificationPreferences(input.userReference); }

export async function updateTollPlaza(id: number, input: TollPlazaInput) {
  const db = await requireDb();
  await db.update(tollPlazas).set(input).where(eq(tollPlazas.id, id));
  const rows = await db.select().from(tollPlazas).where(eq(tollPlazas.id, id)).limit(1);
  return rows[0];
}

export async function deactivateTollPlaza(id: number) {
  const db = await requireDb();
  await db.update(tollPlazas).set({ status: "inactive" }).where(eq(tollPlazas.id, id));
  const rows = await db.select().from(tollPlazas).where(eq(tollPlazas.id, id)).limit(1);
  return rows[0];
}

export async function uploadEmailImage(input: ImageUploadInput) {
  const { data, mimeType, safeName } = decodeImageUpload(input);
  const upload = await storagePut(`emails/images/${Date.now()}-${safeName}`, data, mimeType);
  return { key: upload.key, url: upload.url };
}
