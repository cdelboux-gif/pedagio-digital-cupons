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
  type InsertUser,
  partners,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await requireDb();
  const existing = await db
    .select({ role: users.role })
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
  updateSet.role = values.role;
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
};

type CouponInput = {
  partnerId: number;
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

export async function listCoupons(filters: {
  search?: string;
  partnerId?: number;
  status?: "draft" | "active" | "paused" | "ended";
  validity?: "current" | "upcoming" | "expired";
}) {
  const db = await requireDb();
  const now = new Date();
  const conditions: SQL[] = [];
  if (filters.partnerId) conditions.push(eq(coupons.partnerId, filters.partnerId));
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
      code: coupons.code,
      title: coupons.title,
      benefit: coupons.benefit,
      terms: coupons.terms,
      status: coupons.status,
      startsAt: coupons.startsAt,
      endsAt: coupons.endsAt,
      usageLimit: coupons.usageLimit,
      usageCount: coupons.usageCount,
      remainingUses: sql<number>`case when ${coupons.usageLimit} = 0 then null else greatest(${coupons.usageLimit} - ${coupons.usageCount}, 0) end`,
      updatedAt: coupons.updatedAt,
    })
    .from(coupons)
    .innerJoin(partners, eq(partners.id, coupons.partnerId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(coupons.updatedAt));
}

export async function getCouponById(id: number) {
  const db = await requireDb();
  const result = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
  return result[0];
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
  search?: string;
  startsAt?: Date;
  endsAt?: Date;
}) {
  const db = await requireDb();
  const conditions: SQL[] = [];
  if (filters.couponId) conditions.push(eq(couponUses.couponId, filters.couponId));
  if (filters.partnerId) conditions.push(eq(couponUses.partnerId, filters.partnerId));
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
    })
    .from(couponUses)
    .innerJoin(coupons, eq(coupons.id, couponUses.couponId))
    .innerJoin(partners, eq(partners.id, couponUses.partnerId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(couponUses.usedAt));
}

function affectedRows(result: unknown) {
  const header = (Array.isArray(result) ? result[0] : result) as { affectedRows?: number };
  return Number(header?.affectedRows ?? 0);
}

export async function registerCouponUse(input: {
  couponId: number;
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
