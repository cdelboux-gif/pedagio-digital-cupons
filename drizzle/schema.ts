import {
  datetime,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const partnerStatusValues = ["prospect", "active", "inactive", "blocked"] as const;
export const couponStatusValues = ["draft", "active", "paused", "ended"] as const;
export const integrationEventValues = [
  "coupon.created",
  "coupon.published",
  "coupon.activated",
  "coupon.redeemed",
] as const;
export const integrationStatusValues = ["active", "paused"] as const;
export const accessLevelValues = ["admin", "manager", "operator", "viewer"] as const;
export const entityStatusValues = ["active", "inactive"] as const;
export const storeStatusValues = ["active", "inactive"] as const;

/** Core user table backing the Manus OAuth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
    role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
    accessLevel: mysqlEnum("accessLevel", accessLevelValues).default("viewer").notNull(),
    entityId: int("entityId").references(() => entities.id, { onDelete: "set null" }),
    partnerId: int("partnerId").references(() => partners.id, { onDelete: "set null" }),
    storeId: int("storeId").references(() => partnerStores.id, { onDelete: "set null" }),
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
    entityId: int("entityId").references(() => entities.id, { onDelete: "set null" }),
    logoKey: varchar("logoKey", { length: 500 }),
    logoUrl: varchar("logoUrl", { length: 700 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("partners_status_idx").on(table.relationshipStatus)],
);

export const entities = mysqlTable(
  "entities",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    code: varchar("code", { length: 60 }).notNull().unique(),
    status: mysqlEnum("status", entityStatusValues).default("active").notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("entities_status_idx").on(table.status)],
);

export const partnerStores = mysqlTable(
  "partnerStores",
  {
    id: int("id").autoincrement().primaryKey(),
    partnerId: int("partnerId")
      .notNull()
      .references(() => partners.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 160 }).notNull(),
    code: varchar("code", { length: 60 }).notNull(),
    status: mysqlEnum("status", storeStatusValues).default("active").notNull(),
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
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("partner_stores_partner_idx").on(table.partnerId),
    index("partner_stores_status_idx").on(table.status),
    uniqueIndex("partner_stores_partner_code_uq").on(table.partnerId, table.code),
  ],
);

export const coupons = mysqlTable(
  "coupons",
  {
    id: int("id").autoincrement().primaryKey(),
    partnerId: int("partnerId")
      .notNull()
      .references(() => partners.id, { onDelete: "restrict" }),
    storeId: int("storeId").references(() => partnerStores.id, { onDelete: "set null" }),
    code: varchar("code", { length: 50 }).notNull().unique(),
    title: varchar("title", { length: 160 }).notNull(),
    benefit: text("benefit").notNull(),
    terms: text("terms"),
    status: mysqlEnum("status", couponStatusValues).default("draft").notNull(),
    startsAt: datetime("startsAt").notNull(),
    endsAt: datetime("endsAt").notNull(),
    usageLimit: int("usageLimit").default(0).notNull(),
    usageCount: int("usageCount").default(0).notNull(),
    itemImageKey: varchar("itemImageKey", { length: 500 }),
    itemImageUrl: varchar("itemImageUrl", { length: 700 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("coupons_partner_idx").on(table.partnerId),
    index("coupons_store_idx").on(table.storeId),
    index("coupons_status_idx").on(table.status),
    index("coupons_end_date_idx").on(table.endsAt),
  ],
);

export const partnerIntegrations = mysqlTable(
  "partnerIntegrations",
  {
    id: int("id").autoincrement().primaryKey(),
    partnerId: int("partnerId")
      .notNull()
      .references(() => partners.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 120 }).notNull(),
    endpointUrl: varchar("endpointUrl", { length: 500 }).notNull(),
    allowedEvents: text("allowedEvents").notNull(),
    secretHash: varchar("secretHash", { length: 64 }).notNull(),
    secretLastFour: varchar("secretLastFour", { length: 8 }).notNull(),
    status: mysqlEnum("status", integrationStatusValues).default("active").notNull(),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("partner_integrations_partner_idx").on(table.partnerId),
    index("partner_integrations_status_idx").on(table.status),
    uniqueIndex("partner_integrations_partner_endpoint_uq").on(table.partnerId, table.endpointUrl),
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
    storeId: int("storeId").references(() => partnerStores.id, { onDelete: "set null" }),
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
    index("coupon_uses_store_idx").on(table.storeId),
    index("coupon_uses_date_idx").on(table.usedAt),
  ],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Partner = typeof partners.$inferSelect;
export type Entity = typeof entities.$inferSelect;
export type PartnerStore = typeof partnerStores.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
export type CouponUse = typeof couponUses.$inferSelect;
export type PartnerIntegration = typeof partnerIntegrations.$inferSelect;
