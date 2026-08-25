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
export const tollPlazaStatusValues = ["active", "inactive"] as const;
export const recommendationModeValues = ["activated_benefit", "personalized", "sponsored"] as const;
export const recommendationCampaignStatusValues = ["draft", "active", "paused", "ended"] as const;
export const recommendationDeliveryStatusValues = ["prepared", "shown", "activated", "redeemed", "dismissed", "expired"] as const;
export const recommendationInteractionValues = ["impression", "click", "dismiss", "activate", "redeem"] as const;
export const accessLevelValues = ["admin", "manager", "operator", "viewer"] as const;
export const entityStatusValues = ["active", "inactive"] as const;
export const storeStatusValues = ["active", "inactive"] as const;
export const loginInviteStatusValues = ["pending", "accepted", "revoked", "expired"] as const;
export const auditActionValues = ["create", "update", "status_change", "delete", "revoke", "activate", "resend", "simulate"] as const;
export const auditResourceValues = ["access", "login_invite", "entity", "partner", "store", "coupon", "integration", "email_sender", "email_template", "email_rule", "email_outbox"] as const;
export const emailSenderStatusValues = ["active", "inactive"] as const;
export const emailTemplateStatusValues = ["draft", "published", "archived"] as const;
export const emailOutboxStatusValues = ["queued", "simulated", "failed", "cancelled"] as const;

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

export const loginInvites = mysqlTable(
  "loginInvites",
  {
    id: int("id").autoincrement().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    tokenHash: varchar("tokenHash", { length: 64 }).notNull(),
    status: mysqlEnum("status", loginInviteStatusValues).default("pending").notNull(),
    accessLevel: mysqlEnum("accessLevel", accessLevelValues).default("viewer").notNull(),
    entityId: int("entityId").references(() => entities.id, { onDelete: "set null" }),
    partnerId: int("partnerId").references(() => partners.id, { onDelete: "set null" }),
    storeId: int("storeId").references(() => partnerStores.id, { onDelete: "set null" }),
    invitedByUserId: int("invitedByUserId").references(() => users.id, { onDelete: "set null" }),
    acceptedUserId: int("acceptedUserId").references(() => users.id, { onDelete: "set null" }),
    expiresAt: datetime("expiresAt").notNull(),
    acceptedAt: datetime("acceptedAt"),
    revokedAt: datetime("revokedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("login_invites_token_hash_uq").on(table.tokenHash),
    index("login_invites_email_idx").on(table.email),
    index("login_invites_status_idx").on(table.status),
  ],
);

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

export const auditLogs = mysqlTable(
  "auditLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    actorUserId: int("actorUserId").references(() => users.id, { onDelete: "set null" }),
    actorEmail: varchar("actorEmail", { length: 320 }),
    action: mysqlEnum("action", auditActionValues).notNull(),
    resourceType: mysqlEnum("resourceType", auditResourceValues).notNull(),
    resourceId: int("resourceId"),
    resourceLabel: varchar("resourceLabel", { length: 240 }),
    beforeJson: text("beforeJson"),
    afterJson: text("afterJson"),
    scopeJson: text("scopeJson"),
    requestId: varchar("requestId", { length: 120 }),
    ipAddress: varchar("ipAddress", { length: 64 }),
    userAgent: varchar("userAgent", { length: 500 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("audit_logs_actor_idx").on(table.actorUserId),
    index("audit_logs_resource_idx").on(table.resourceType, table.resourceId),
    index("audit_logs_created_idx").on(table.createdAt),
  ],
);

export const emailSenders = mysqlTable(
  "emailSenders",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    fromName: varchar("fromName", { length: 160 }).notNull(),
    fromEmail: varchar("fromEmail", { length: 320 }).notNull(),
    replyTo: varchar("replyTo", { length: 320 }),
    status: mysqlEnum("status", emailSenderStatusValues).default("active").notNull(),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("email_senders_from_email_uq").on(table.fromEmail)],
);

export const emailTemplates = mysqlTable(
  "emailTemplates",
  {
    id: int("id").autoincrement().primaryKey(),
    templateKey: varchar("templateKey", { length: 100 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    status: mysqlEnum("status", emailTemplateStatusValues).default("draft").notNull(),
    version: int("version").default(1).notNull(),
    senderId: int("senderId").references(() => emailSenders.id, { onDelete: "set null" }),
    subject: varchar("subject", { length: 240 }).notNull(),
    preheader: varchar("preheader", { length: 240 }),
    bodyHtml: text("bodyHtml").notNull(),
    bodyText: text("bodyText"),
    allowedVariablesJson: text("allowedVariablesJson").notNull(),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("email_templates_key_version_uq").on(table.templateKey, table.version),
    index("email_templates_status_idx").on(table.status),
  ],
);

export const emailRules = mysqlTable(
  "emailRules",
  {
    id: int("id").autoincrement().primaryKey(),
    templateId: int("templateId").notNull().references(() => emailTemplates.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 160 }).notNull(),
    eventName: varchar("eventName", { length: 120 }).notNull(),
    conditionsJson: text("conditionsJson").notNull(),
    enabled: int("enabled").default(1).notNull(),
    cooldownSeconds: int("cooldownSeconds").default(0).notNull(),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("email_rules_event_idx").on(table.eventName),
    index("email_rules_template_idx").on(table.templateId),
  ],
);

export const tollPlazas = mysqlTable(
  "tollPlazas",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 80 }).notNull().unique(),
    name: varchar("name", { length: 160 }).notNull(),
    highway: varchar("highway", { length: 80 }),
    direction: varchar("direction", { length: 80 }),
    latitude: decimal("latitude", { precision: 10, scale: 7, mode: "number" }).notNull(),
    longitude: decimal("longitude", { precision: 10, scale: 7, mode: "number" }).notNull(),
    radiusMeters: int("radiusMeters").default(250).notNull(),
    status: mysqlEnum("status", tollPlazaStatusValues).default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("toll_plazas_status_idx").on(table.status)],
);

export const recommendationCampaigns = mysqlTable(
  "recommendationCampaigns",
  {
    id: int("id").autoincrement().primaryKey(),
    partnerId: int("partnerId").notNull().references(() => partners.id, { onDelete: "restrict" }),
    storeId: int("storeId").references(() => partnerStores.id, { onDelete: "set null" }),
    couponId: int("couponId").notNull().references(() => coupons.id, { onDelete: "restrict" }),
    tollPlazaId: int("tollPlazaId").references(() => tollPlazas.id, { onDelete: "set null" }),
    name: varchar("name", { length: 160 }).notNull(),
    mode: mysqlEnum("mode", recommendationModeValues).notNull(),
    sponsorshipLabel: varchar("sponsorshipLabel", { length: 80 }),
    startsAt: datetime("startsAt").notNull(),
    endsAt: datetime("endsAt").notNull(),
    budgetLimit: decimal("budgetLimit", { precision: 12, scale: 2, mode: "number" }),
    bidAmount: decimal("bidAmount", { precision: 12, scale: 4 }),
    spentAmount: decimal("spentAmount", { precision: 12, scale: 2 }).default("0").notNull(),
    frequencyCap: int("frequencyCap").default(1).notNull(),
    status: mysqlEnum("status", recommendationCampaignStatusValues).default("draft").notNull(),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("recommendation_campaigns_partner_idx").on(table.partnerId),
    index("recommendation_campaigns_store_idx").on(table.storeId),
    index("recommendation_campaigns_coupon_idx").on(table.couponId),
    index("recommendation_campaigns_toll_idx").on(table.tollPlazaId),
    index("recommendation_campaigns_status_idx").on(table.status, table.startsAt, table.endsAt),
  ],
);

export const tollPassageEvents = mysqlTable(
  "tollPassageEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    idempotencyKey: varchar("idempotencyKey", { length: 180 }).notNull().unique(),
    userReference: varchar("userReference", { length: 160 }).notNull(),
    tollPlazaId: int("tollPlazaId").notNull().references(() => tollPlazas.id, { onDelete: "restrict" }),
    occurredAt: datetime("occurredAt").notNull(),
    accuracyMeters: int("accuracyMeters"),
    consentPersonalization: int("consentPersonalization").default(0).notNull(),
    source: varchar("source", { length: 40 }).notNull(),
    payloadJson: text("payloadJson"),
    isSimulation: int("isSimulation").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("toll_passage_events_user_idx").on(table.userReference, table.occurredAt),
    index("toll_passage_events_toll_idx").on(table.tollPlazaId, table.occurredAt),
  ],
);

export const recommendationDeliveries = mysqlTable(
  "recommendationDeliveries",
  {
    id: int("id").autoincrement().primaryKey(),
    idempotencyKey: varchar("idempotencyKey", { length: 180 }).notNull().unique(),
    passageEventId: int("passageEventId").notNull().references(() => tollPassageEvents.id, { onDelete: "restrict" }),
    campaignId: int("campaignId").notNull().references(() => recommendationCampaigns.id, { onDelete: "restrict" }),
    couponId: int("couponId").notNull().references(() => coupons.id, { onDelete: "restrict" }),
    userReference: varchar("userReference", { length: 160 }).notNull(),
    mode: mysqlEnum("mode", recommendationModeValues).notNull(),
    score: decimal("score", { precision: 8, scale: 4, mode: "number" }).notNull(),
    explanation: varchar("explanation", { length: 300 }).notNull(),
    status: mysqlEnum("status", recommendationDeliveryStatusValues).default("prepared").notNull(),
    isSimulation: int("isSimulation").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("recommendation_deliveries_event_idx").on(table.passageEventId),
    index("recommendation_deliveries_user_idx").on(table.userReference, table.createdAt),
    index("recommendation_deliveries_campaign_idx").on(table.campaignId, table.status),
  ],
);

export const recommendationInteractions = mysqlTable(
  "recommendationInteractions",
  {
    id: int("id").autoincrement().primaryKey(),
    idempotencyKey: varchar("idempotencyKey", { length: 180 }).notNull().unique(),
    deliveryId: int("deliveryId").notNull().references(() => recommendationDeliveries.id, { onDelete: "restrict" }),
    campaignId: int("campaignId").notNull().references(() => recommendationCampaigns.id, { onDelete: "restrict" }),
    userReference: varchar("userReference", { length: 160 }).notNull(),
    eventName: mysqlEnum("eventName", recommendationInteractionValues).notNull(),
    costAmount: decimal("costAmount", { precision: 12, scale: 4 }),
    eventAt: datetime("eventAt").notNull(),
    isSimulation: int("isSimulation").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("recommendation_interactions_delivery_idx").on(table.deliveryId, table.eventName),
    index("recommendation_interactions_campaign_idx").on(table.campaignId, table.eventName, table.eventAt),
    index("recommendation_interactions_user_idx").on(table.userReference, table.eventAt),
  ],
);

export const emailOutbox = mysqlTable(
  "emailOutbox",
  {
    id: int("id").autoincrement().primaryKey(),
    idempotencyKey: varchar("idempotencyKey", { length: 180 }).notNull().unique(),
    templateId: int("templateId").references(() => emailTemplates.id, { onDelete: "set null" }),
    ruleId: int("ruleId").references(() => emailRules.id, { onDelete: "set null" }),
    eventName: varchar("eventName", { length: 120 }).notNull(),
    recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
    recipientName: varchar("recipientName", { length: 160 }),
    variablesJson: text("variablesJson").notNull(),
    renderedSubject: varchar("renderedSubject", { length: 240 }).notNull(),
    renderedHtml: text("renderedHtml").notNull(),
    renderedText: text("renderedText"),
    status: mysqlEnum("status", emailOutboxStatusValues).default("queued").notNull(),
    attempts: int("attempts").default(0).notNull(),
    lastError: text("lastError"),
    availableAt: datetime("availableAt").notNull(),
    processedAt: datetime("processedAt"),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("email_outbox_status_idx").on(table.status, table.availableAt),
    index("email_outbox_event_idx").on(table.eventName),
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
export type LoginInvite = typeof loginInvites.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type EmailSender = typeof emailSenders.$inferSelect;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type EmailRule = typeof emailRules.$inferSelect;
export type EmailOutbox = typeof emailOutbox.$inferSelect;
export type TollPlaza = typeof tollPlazas.$inferSelect;
export type RecommendationCampaign = typeof recommendationCampaigns.$inferSelect;
export type TollPassageEvent = typeof tollPassageEvents.$inferSelect;
export type RecommendationDelivery = typeof recommendationDeliveries.$inferSelect;
export type RecommendationInteraction = typeof recommendationInteractions.$inferSelect;
