import {
  datetime,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const partnerStatusValues = ["prospect", "active", "inactive", "blocked"] as const;
export const couponStatusValues = ["draft", "active", "paused", "ended"] as const;

/** Core user table backing the Manus OAuth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const partners = mysqlTable(
  "partners",
  {
    id: int("id").autoincrement().primaryKey(),
    displayName: varchar("displayName", { length: 160 }).notNull(),
    legalName: varchar("legalName", { length: 200 }),
    taxId: varchar("taxId", { length: 32 }),
    category: varchar("category", { length: 80 }),
    contactName: varchar("contactName", { length: 120 }),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 32 }),
    addressStreet: varchar("addressStreet", { length: 200 }),
    addressNumber: varchar("addressNumber", { length: 32 }),
    addressComplement: varchar("addressComplement", { length: 120 }),
    addressNeighborhood: varchar("addressNeighborhood", { length: 120 }),
    addressCity: varchar("addressCity", { length: 120 }),
    addressState: varchar("addressState", { length: 2 }),
    addressPostalCode: varchar("addressPostalCode", { length: 16 }),
    addressCountry: varchar("addressCountry", { length: 2 }).default("BR"),
    latitude: decimal("latitude", { precision: 10, scale: 7, mode: "number" }),
    longitude: decimal("longitude", { precision: 10, scale: 7, mode: "number" }),
    relationshipStatus: mysqlEnum("relationshipStatus", partnerStatusValues)
      .default("prospect")
      .notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("partners_status_idx").on(table.relationshipStatus)],
);

export const coupons = mysqlTable(
  "coupons",
  {
    id: int("id").autoincrement().primaryKey(),
    partnerId: int("partnerId")
      .notNull()
      .references(() => partners.id, { onDelete: "restrict" }),
    code: varchar("code", { length: 50 }).notNull().unique(),
    title: varchar("title", { length: 160 }).notNull(),
    benefit: text("benefit").notNull(),
    terms: text("terms"),
    status: mysqlEnum("status", couponStatusValues).default("draft").notNull(),
    startsAt: datetime("startsAt").notNull(),
    endsAt: datetime("endsAt").notNull(),
    usageLimit: int("usageLimit").default(0).notNull(),
    usageCount: int("usageCount").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("coupons_partner_idx").on(table.partnerId),
    index("coupons_status_idx").on(table.status),
    index("coupons_end_date_idx").on(table.endsAt),
  ],
);

export const couponUses = mysqlTable(
  "couponUses",
  {
    id: int("id").autoincrement().primaryKey(),
    couponId: int("couponId")
      .notNull()
      .references(() => coupons.id, { onDelete: "restrict" }),
    partnerId: int("partnerId")
      .notNull()
      .references(() => partners.id, { onDelete: "restrict" }),
    reference: varchar("reference", { length: 80 }).notNull().unique(),
    customerReference: varchar("customerReference", { length: 120 }),
    notes: text("notes"),
    usedAt: datetime("usedAt").notNull(),
    registeredByUserId: int("registeredByUserId").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("coupon_uses_coupon_idx").on(table.couponId),
    index("coupon_uses_partner_idx").on(table.partnerId),
    index("coupon_uses_date_idx").on(table.usedAt),
  ],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Partner = typeof partners.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
export type CouponUse = typeof couponUses.$inferSelect;
