import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  CouponUseRuleError,
  createCoupon,
  createEntity,
  createPartner,
  deletePartner,
  deleteCoupon,
  deletePartnerStore,
  deleteEntity,
  createPartnerStore,
  DatabaseUnavailableError,
  getCouponById,
  getDashboardSummary,
  getPartnerById,
  getPartnerStoreById,
  listAccessUsers,
  listCouponUses,
  listEntities,
  listCoupons,
  publicCoupon,
  publicPartner,
  listPartners,
  listPartnerIntegrations,
  listPartnerStores,
  createPartnerIntegration,
  createLoginInvite,
  activateLoginInvite,
  listLoginInvites,
  resendLoginInvite,
  revokeLoginInvite,
  updateUserAccess,
  registerCouponUse,
  updateCoupon,
  updatePartnerStore,
  uploadCouponItemImage,
  uploadPartnerLogo,
  updateCouponStatus,
  updatePartner,
  isPartnerInScope,
  isStoreInScope,
  isCouponInScope,
  isLoginInviteInScope,
  isAccessUserInScope,
  isAccessTargetInScope,
  scopeAllows,
  type AccessScope,
  appendAuditLog,
  listAuditLogs,
  listEmailSenders,
  createEmailSender,
  listEmailTemplates,
  getEmailTemplateById,
  createEmailTemplate,
  updateEmailTemplate,
  listEmailRules,
  createEmailRule,
  updateEmailRule,
  listEmailOutbox,
  simulateEmailOutbox,
  retryEmailOutbox,
  enqueueEmailRules,
  listTollPlazas,
  createTollPlaza,
  listRecommendationCampaigns,
  createRecommendationCampaign,
  recordTollPassageEvent,
  listRecommendationCandidatesForToll,
  createRecommendationDelivery,
  listPreparedRecommendationDeliveries,
  getRecommendationDeliveryById,
  recordRecommendationInteraction,
  listRecommendationMetrics,
  listNotificationTemplates,
  getNotificationTemplateById,
  createNotificationTemplate,
  updateNotificationTemplate,
  listNotificationRules,
  createNotificationRule,
  updateNotificationRule,
  listNotificationOutbox,
  enqueueNotification,
  simulateNotificationOutbox,
  retryNotificationOutbox,
  getCouponRulesByCouponId,
  listCouponParticipatingStoreIds,
} from "../db";
import { accessLevelValues, entityStatusValues, integrationEventValues, integrationStatusValues, storeStatusValues } from "../../drizzle/schema";
import { moduleProcedure, router, superAdminProcedure } from "../_core/trpc";
import { emailEventValues, validateEmailTemplate, renderEmail, renderEmailText, type EmailCondition, type EmailVariables } from "../email";
import { recommendationModeValues, recommendationCampaignStatusValues, tollPlazaStatusValues } from "../../drizzle/schema";
import { buildPassageIdempotencyKey, rankRecommendationCandidates } from "../recommendations";

const partnerStatus = z.enum(["prospect", "active", "inactive", "blocked"]);
const couponStatus = z.enum(["draft", "active", "paused", "ended"]);
const integrationEvent = z.enum(integrationEventValues);
const integrationStatus = z.enum(integrationStatusValues);
const accessLevel = z.enum(accessLevelValues);
const entityStatus = z.enum(entityStatusValues);
const storeStatus = z.enum(storeStatusValues);
const loginInviteStatus = z.enum(["pending", "accepted", "revoked", "expired"]);
const nullableId = z.number().int().positive().nullable().optional();
const emailEvent = z.enum(emailEventValues);
const auditResource = z.enum(["access", "login_invite", "entity", "partner", "store", "coupon", "integration", "email_sender", "email_template", "email_rule", "email_outbox", "notification_template", "notification_rule", "notification_outbox"]);
const auditAction = z.enum(["create", "update", "status_change", "delete", "revoke", "activate", "resend", "simulate"]);
const emailCondition = z.object({ field: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_.-]*$/).max(80), operator: z.enum(["equals", "not_equals", "contains", "gt", "gte", "lt", "lte"]), value: z.union([z.string().max(240), z.number(), z.boolean()]) });
const emailSenderInput = z.object({ name: z.string().trim().min(2).max(120), fromName: z.string().trim().min(2).max(160), fromEmail: z.string().trim().email().max(320), replyTo: z.string().trim().email().max(320).nullable().optional(), status: z.enum(["active", "inactive"]) });
const emailTemplateInput = z.object({ templateKey: z.string().trim().regex(/^[a-z0-9_.-]+$/).max(100), name: z.string().trim().min(2).max(160), status: z.enum(["draft", "published", "archived"]), version: z.number().int().positive().max(9999), senderId: nullableId, subject: z.string().trim().min(1).max(240), preheader: z.string().trim().max(240).nullable().optional(), bodyHtml: z.string().max(100_000), bodyText: z.string().max(100_000).nullable().optional(), allowedVariables: z.array(z.string().regex(/^[a-zA-Z][a-zA-Z0-9_.-]*$/).max(80)).max(100) });
const emailRuleInput = z.object({ templateId: z.number().int().positive(), name: z.string().trim().min(2).max(160), eventName: emailEvent, conditions: z.array(emailCondition).max(20), enabled: z.boolean(), cooldownSeconds: z.number().int().min(0).max(2_592_000) });
const notificationDeliveryMode = z.enum(["simulated", "app_contract", "platform"]);
const notificationTemplateInput = z.object({ templateKey: z.string().trim().regex(/^[a-z0-9_.-]+$/).max(100), name: z.string().trim().min(2).max(160), status: z.enum(["draft", "published", "archived"]), version: z.number().int().positive().max(9999), title: z.string().trim().min(1).max(120), body: z.string().trim().min(1).max(500), expandedBody: z.string().max(4000).nullable().optional(), imageUrl: z.string().url().max(700).nullable().optional(), ctaLabel: z.string().trim().max(60).nullable().optional(), deepLink: z.string().trim().regex(/^[a-z][a-z0-9+.-]*:/i).max(500).nullable().optional(), allowedVariables: z.array(z.string().regex(/^[a-zA-Z][a-zA-Z0-9_.-]*$/).max(80)).max(100), deliveryMode: notificationDeliveryMode, locale: z.string().trim().max(12), priority: z.number().int().min(-10).max(10) });
const notificationRuleInput = z.object({ templateId: z.number().int().positive(), name: z.string().trim().min(2).max(160), eventName: z.string().trim().min(1).max(120), conditions: z.array(emailCondition).max(20), enabled: z.boolean(), cooldownSeconds: z.number().int().min(0).max(2_592_000) });
const imageUpload = z.object({
  fileName: z.string().trim().min(1).max(160),
  dataUrl: z.string().regex(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/).max(7_500_000),
}).nullable().optional();
const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();

export const partnerInput = z
  .object({
    displayName: z.string().trim().min(2, "Informe o nome comercial").max(160),
    legalName: nullableText(200),
    taxId: nullableText(32),
    category: nullableText(80),
    contactName: nullableText(120),
    email: z.string().trim().email("Informe um e-mail válido").max(320).nullable().optional(),
    phone: nullableText(32),
    addressStreet: nullableText(200),
    addressNumber: nullableText(32),
    addressComplement: nullableText(120),
    addressNeighborhood: nullableText(120),
    addressCity: nullableText(120),
    addressState: z.string().trim().toUpperCase().max(2).nullable().optional(),
    addressPostalCode: nullableText(16),
    addressCountry: z.string().trim().toUpperCase().max(2).nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    relationshipStatus: partnerStatus,
    notes: nullableText(2000),
    entityId: nullableId,
    logo: imageUpload,
  })
  .refine(
    value => (value.latitude == null) === (value.longitude == null),
    { message: "Informe latitude e longitude juntas", path: ["latitude"] },
  );

const couponRuleInput = z.object({
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().positive().max(1_000_000),
  minimumPurchaseAmount: z.number().min(0).max(1_000_000),
  maxRedemptionsPerCustomer: z.number().int().min(0).max(1_000_000),
  maxRedemptionsPerVehicle: z.number().int().min(0).max(1_000_000),
  maxRedemptionsPerPlate: z.number().int().min(0).max(1_000_000),
  allowedWeekdays: z.array(z.number().int().min(0).max(6)).max(7),
  allowedStartTime: z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/).nullable().optional(),
  allowedEndTime: z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/).nullable().optional(),
  timezone: z.string().trim().min(1).max(64),
  audience: z.object({ requiredSegments: z.array(z.string().trim().min(1).max(80)).max(30).optional(), excludedSegments: z.array(z.string().trim().min(1).max(80)).max(30).optional() }).nullable().optional(),
  radiusMeters: z.number().int().min(0).max(100_000),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  financialLimit: z.number().positive().max(1_000_000_000).nullable().optional(),
  financialUsed: z.number().min(0).max(1_000_000_000).optional(),
  maxRedemptions: z.number().int().min(0).max(1_000_000),
  newCustomerOnly: z.boolean(),
  validationMode: z.enum(["code", "qr", "automatic"]),
  stackingPolicy: z.enum(["stackable", "non_stackable"]),
}).refine(value => (value.latitude == null) === (value.longitude == null), { message: "Informe latitude e longitude juntas", path: ["latitude"] })
  .refine(value => value.discountType !== "percentage" || value.discountValue <= 100, { message: "Percentual deve estar entre 0 e 100", path: ["discountValue"] });

const couponInput = z
  .object({
    partnerId: z.number().int().positive(),
    storeId: nullableId,
    code: z.string().trim().min(3).max(50).transform(value => value.toUpperCase()),
    title: z.string().trim().min(3).max(160),
    benefit: z.string().trim().min(3).max(2000),
    terms: nullableText(4000),
    status: couponStatus,
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    usageLimit: z.number().int().min(0).max(1_000_000),
    rules: couponRuleInput.optional(),
    participatingStoreIds: z.array(z.number().int().positive()).max(500).optional(),
    itemImage: imageUpload,
  })
  .refine(value => value.endsAt > value.startsAt, {
    message: "A validade final deve ser posterior ao início",
    path: ["endsAt"],
  });

export const integrationInput = z.object({
  partnerId: z.number().int().positive(),
  name: z.string().trim().min(2, "Informe um nome para a integração").max(120),
  endpointUrl: z.string().trim().url("Informe uma URL válida").max(500).refine(value => new URL(value).protocol === "https:", "O endpoint precisa usar HTTPS"),
  allowedEvents: z.array(integrationEvent).min(1, "Autorize pelo menos um evento").max(integrationEventValues.length),
  status: integrationStatus.default("active"),
});

const entityInput = z.object({
  name: z.string().trim().min(2).max(160),
  code: z.string().trim().min(2).max(60).transform(value => value.toUpperCase()),
  status: entityStatus,
  notes: nullableText(2000),
});

const storeInput = z.object({
  partnerId: z.number().int().positive(),
  name: z.string().trim().min(2).max(160),
  code: z.string().trim().min(2).max(60).transform(value => value.toUpperCase()),
  status: storeStatus,
  addressStreet: nullableText(200),
  addressNumber: nullableText(32),
  addressComplement: nullableText(120),
  addressNeighborhood: nullableText(120),
  addressCity: nullableText(120),
  addressState: z.string().trim().toUpperCase().max(2).nullable().optional(),
  addressPostalCode: nullableText(16),
  addressCountry: z.string().trim().toUpperCase().max(2).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
}).refine(value => (value.latitude == null) === (value.longitude == null), { message: "Informe latitude e longitude juntas", path: ["latitude"] });

const tollPlazaInput = z.object({
  code: z.string().trim().min(2).max(80).transform(value => value.toUpperCase()),
  name: z.string().trim().min(2).max(160),
  highway: nullableText(80),
  direction: nullableText(80),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z.number().int().min(50).max(2000),
  status: z.enum(tollPlazaStatusValues),
});

const recommendationCampaignInput = z.object({
  partnerId: z.number().int().positive(),
  storeId: nullableId,
  couponId: z.number().int().positive(),
  tollPlazaId: nullableId,
  name: z.string().trim().min(2).max(160),
  mode: z.enum(recommendationModeValues),
  sponsorshipLabel: nullableText(80),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  budgetLimit: z.number().nonnegative().nullable().optional(),
  bidAmount: z.number().nonnegative().nullable().optional(),
  frequencyCap: z.number().int().min(1).max(100),
  status: z.enum(recommendationCampaignStatusValues),
}).refine(value => value.endsAt > value.startsAt, { message: "A campanha deve terminar depois de começar", path: ["endsAt"] });

const recommendationInteraction = z.enum(["impression", "click", "dismiss", "activate", "redeem"] as const);

const tollPassageInput = z.object({
  userReference: z.string().trim().min(2).max(160),
  tollPlazaId: z.number().int().positive(),
  occurredAt: z.coerce.date(),
  accuracyMeters: z.number().int().min(1).max(5000).nullable().optional(),
  consentPersonalization: z.boolean(),
  source: z.enum(["app_geofence", "partner_feed", "backoffice_simulator"]),
  payload: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

const userAccessInput = z.object({
  accessLevel,
  entityId: nullableId,
  partnerId: nullableId,
  storeId: nullableId,
});

function notFound(entity: string) {
  return new TRPCError({ code: "NOT_FOUND", message: `${entity} não encontrado(a)` });
}

function scopeOf(user: { role: "user" | "admin"; accessLevel: "admin" | "manager" | "operator" | "viewer"; entityId: number | null; partnerId: number | null; storeId: number | null }): AccessScope {
  return { role: user.role, accessLevel: user.accessLevel, entityId: user.entityId, partnerId: user.partnerId, storeId: user.storeId };
}

function forbiddenScope() {
  return new TRPCError({ code: "FORBIDDEN", message: "Você não possui escopo para este registro" });
}

async function audit(ctx: { user: { id: number; email?: string | null } }, input: Parameters<typeof appendAuditLog>[0]) {
  await appendAuditLog({ ...input, actorUserId: ctx.user.id, actorEmail: ctx.user.email ?? null });
}

async function dispatchEmailEvent(ctx: { user: { id: number; email?: string | null } }, eventName: (typeof emailEventValues)[number], recipientEmail: string | null | undefined, variables: EmailVariables, eventKey: string) {
  const normalizedEmail = recipientEmail?.trim().toLowerCase();
  if (!normalizedEmail || !/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(normalizedEmail)) return [];
  const queued = await enqueueEmailRules({ eventName, recipientEmail: normalizedEmail, recipientName: null, variables, eventKey, createdByUserId: ctx.user.id });
  for (const item of queued) if (item.row) await audit(ctx, { action: "create", resourceType: "email_outbox", resourceId: item.row.id, resourceLabel: item.row.recipientEmail, after: item.row });
  return queued.map(item => item.row).filter(Boolean);
}

export const adminRouter = router({
  dashboard: moduleProcedure("dashboard", "read").query(({ ctx }) => getDashboardSummary(scopeOf(ctx.user))),

  partners: router({
    list: moduleProcedure("partners", "read")
      .input(z.object({ search: z.string().trim().max(160).optional(), status: partnerStatus.optional() }).optional())
      .query(({ input, ctx }) => listPartners({ ...(input ?? {}), scope: scopeOf(ctx.user) })),
    create: moduleProcedure("partners", "create").input(partnerInput).mutation(async ({ input, ctx }) => {
      const { logo, ...data } = input;
      if (!scopeAllows(scopeOf(ctx.user), { entityId: data.entityId ?? null }, true)) throw forbiddenScope();
      const partner = await createPartner(data);
      if (!partner) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível criar o parceiro" });
      const saved = logo ? await uploadPartnerLogo(partner.id, logo) : partner;
      const visible = saved ? publicPartner(saved) : saved;
      await audit(ctx, { action: "create", resourceType: "partner", resourceId: partner.id, resourceLabel: partner.displayName, after: visible, scope: scopeOf(ctx.user) });
      await dispatchEmailEvent(ctx, "partner.created", data.email, { "partner.id": partner.id, "partner.name": partner.displayName }, `partner:${partner.id}:created`);
      return visible;
    }),
    remove: moduleProcedure("partners", "delete").input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      if (!(await isPartnerInScope(input.id, scopeOf(ctx.user), true))) throw forbiddenScope();
      const before = await getPartnerById(input.id);
      const removed = await deletePartner(input.id);
      await audit(ctx, { action: "delete", resourceType: "partner", resourceId: input.id, resourceLabel: before?.displayName, before: before ? publicPartner(before) : before, after: removed ? publicPartner(removed) : removed, scope: scopeOf(ctx.user) });
      return removed;
    }),
    update: moduleProcedure("partners", "update")
      .input(z.object({ id: z.number().int().positive(), data: partnerInput }))
      .mutation(async ({ input, ctx }) => {
        if (!(await getPartnerById(input.id))) throw notFound("Parceiro");
        if (!(await isPartnerInScope(input.id, scopeOf(ctx.user), true))) throw forbiddenScope();
        if (!scopeAllows(scopeOf(ctx.user), { entityId: input.data.entityId ?? null, partnerId: input.id }, true)) throw forbiddenScope();
        const { logo, ...data } = input.data;
        const before = await getPartnerById(input.id);
        await updatePartner(input.id, data);
        const saved = logo ? await uploadPartnerLogo(input.id, logo) : await getPartnerById(input.id);
        const visible = saved ? publicPartner(saved) : saved;
        await audit(ctx, { action: "update", resourceType: "partner", resourceId: input.id, resourceLabel: saved?.displayName, before: before ? publicPartner(before) : before, after: visible, scope: scopeOf(ctx.user) });
        return visible;
      }),
  }),

  coupons: router({
    rules: moduleProcedure("coupons", "read").input(z.object({ id: z.number().int().positive() })).query(async ({ input, ctx }) => {
      if (!(await isCouponInScope(input.id, scopeOf(ctx.user), false))) throw forbiddenScope();
      const [rules, participatingStoreIds] = await Promise.all([getCouponRulesByCouponId(input.id), listCouponParticipatingStoreIds(input.id)]);
      return { rules, participatingStoreIds };
    }),
    list: moduleProcedure("coupons", "read")
      .input(
        z
          .object({
            search: z.string().trim().max(160).optional(),
            partnerId: z.number().int().positive().optional(),
            storeId: z.number().int().positive().optional(),
            status: couponStatus.optional(),
            validity: z.enum(["current", "upcoming", "expired"]).optional(),
          })
          .optional(),
      )
      .query(({ input, ctx }) => listCoupons({ ...(input ?? {}), scope: scopeOf(ctx.user) })),
    create: moduleProcedure("coupons", "create").input(couponInput).mutation(async ({ input, ctx }) => {
      const partner = await getPartnerById(input.partnerId);
      if (!partner) throw notFound("Parceiro");
      if (!(await isPartnerInScope(input.partnerId, scopeOf(ctx.user), true))) throw forbiddenScope();
      if (input.storeId && !(await isStoreInScope(input.storeId, scopeOf(ctx.user), true))) throw forbiddenScope();
      if (input.storeId) {
        const store = await getPartnerStoreById(input.storeId);
        if (!store || store.partnerId !== input.partnerId) throw new TRPCError({ code: "BAD_REQUEST", message: "A loja precisa pertencer ao parceiro selecionado" });
      }
      if (input.participatingStoreIds?.some(storeId => storeId === input.storeId) === false && input.storeId) throw new TRPCError({ code: "BAD_REQUEST", message: "A loja principal precisa estar entre as lojas participantes" });
      for (const storeId of input.participatingStoreIds ?? []) {
        const store = await getPartnerStoreById(storeId);
        if (!store || store.partnerId !== input.partnerId || !(await isStoreInScope(storeId, scopeOf(ctx.user), true))) throw new TRPCError({ code: "BAD_REQUEST", message: "Todas as lojas participantes devem pertencer ao parceiro e ao escopo atual" });
      }
      const { itemImage, ...data } = input;
      const coupon = await createCoupon(data);
      if (!coupon) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível criar o cupom" });
      const saved = itemImage ? await uploadCouponItemImage(coupon.id, itemImage) : coupon;
      const visible = saved ? publicCoupon(saved) : saved;
      await audit(ctx, { action: "create", resourceType: "coupon", resourceId: coupon.id, resourceLabel: coupon.code, after: visible, scope: scopeOf(ctx.user) });
      await dispatchEmailEvent(ctx, "coupon.created", partner.email, { "coupon.id": coupon.id, "coupon.code": coupon.code, "coupon.title": coupon.title, "coupon.status": coupon.status }, `coupon:${coupon.id}:created`);
      return visible;
    }),
    update: moduleProcedure("coupons", "update")
      .input(z.object({ id: z.number().int().positive(), data: couponInput }))
      .mutation(async ({ input, ctx }) => {
        if (!(await getCouponById(input.id))) throw notFound("Cupom");
        if (!(await isCouponInScope(input.id, scopeOf(ctx.user), true))) throw forbiddenScope();
        if (!(await getPartnerById(input.data.partnerId))) throw notFound("Parceiro");
        if (!(await isPartnerInScope(input.data.partnerId, scopeOf(ctx.user), true))) throw forbiddenScope();
        if (input.data.storeId && !(await isStoreInScope(input.data.storeId, scopeOf(ctx.user), true))) throw forbiddenScope();
        if (input.data.storeId) {
          const store = await getPartnerStoreById(input.data.storeId);
          if (!store || store.partnerId !== input.data.partnerId) throw new TRPCError({ code: "BAD_REQUEST", message: "A loja precisa pertencer ao parceiro selecionado" });
        }
        if (input.data.participatingStoreIds?.some(storeId => storeId === input.data.storeId) === false && input.data.storeId) throw new TRPCError({ code: "BAD_REQUEST", message: "A loja principal precisa estar entre as lojas participantes" });
        for (const storeId of input.data.participatingStoreIds ?? []) {
          const store = await getPartnerStoreById(storeId);
          if (!store || store.partnerId !== input.data.partnerId || !(await isStoreInScope(storeId, scopeOf(ctx.user), true))) throw new TRPCError({ code: "BAD_REQUEST", message: "Todas as lojas participantes devem pertencer ao parceiro e ao escopo atual" });
        }
        const { itemImage, ...data } = input.data;
        const before = await getCouponById(input.id);
        await updateCoupon(input.id, data);
        const saved = itemImage ? await uploadCouponItemImage(input.id, itemImage) : await getCouponById(input.id);
        const visible = saved ? publicCoupon(saved) : saved;
        await audit(ctx, { action: "update", resourceType: "coupon", resourceId: input.id, resourceLabel: saved?.code, before: before ? publicCoupon(before) : before, after: visible, scope: scopeOf(ctx.user) });
        return visible;
      }),
    remove: moduleProcedure("coupons", "delete").input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      if (!(await isCouponInScope(input.id, scopeOf(ctx.user), true))) throw forbiddenScope();
      const before = await getCouponById(input.id);
      const removed = await deleteCoupon(input.id);
      await audit(ctx, { action: "delete", resourceType: "coupon", resourceId: input.id, resourceLabel: before?.code, before: before ? publicCoupon(before) : before, after: removed ? publicCoupon(removed) : removed, scope: scopeOf(ctx.user) });
      return removed;
    }),
    updateStatus: moduleProcedure("coupons", "status")
      .input(z.object({ id: z.number().int().positive(), status: couponStatus }))
      .mutation(async ({ input, ctx }) => {
        if (!(await getCouponById(input.id))) throw notFound("Cupom");
        if (!(await isCouponInScope(input.id, scopeOf(ctx.user), true))) throw forbiddenScope();
        const before = await getCouponById(input.id);
        const updated = await updateCouponStatus(input.id, input.status);
        await audit(ctx, { action: "status_change", resourceType: "coupon", resourceId: input.id, resourceLabel: before?.code, before: before ? publicCoupon(before) : before, after: updated ? publicCoupon(updated) : updated, scope: scopeOf(ctx.user) });
        const partner = updated ? await getPartnerById(updated.partnerId) : null;
        if (before?.status === "draft" && updated?.status === "active") await dispatchEmailEvent(ctx, "coupon.published", partner?.email, { "coupon.id": updated.id, "coupon.code": updated.code, "coupon.status": updated.status }, `coupon:${updated.id}:published`);
        if (before?.status === "paused" && updated?.status === "active") await dispatchEmailEvent(ctx, "coupon.activated", partner?.email, { "coupon.id": updated.id, "coupon.code": updated.code, "coupon.status": updated.status }, `coupon:${updated.id}:activated`);
        return updated;
      }),
  }),

  integrations: router({
    list: moduleProcedure("integrations", "read").query(({ ctx }) => listPartnerIntegrations(scopeOf(ctx.user))),
    create: moduleProcedure("integrations", "manage").input(integrationInput).mutation(async ({ input, ctx }) => {
      if (!(await getPartnerById(input.partnerId))) throw notFound("Parceiro");
      if (!(await isPartnerInScope(input.partnerId, scopeOf(ctx.user), true))) throw forbiddenScope();
      try {
        const created = await createPartnerIntegration({ ...input, createdByUserId: ctx.user.id });
        await audit(ctx, { action: "create", resourceType: "integration", resourceId: created.integration.id, resourceLabel: created.integration.name, after: created.integration, scope: scopeOf(ctx.user) });
        return created;
      } catch (error) {
        if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
          throw new TRPCError({ code: "CONFLICT", message: "Este endpoint já está cadastrado para o parceiro" });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível criar a integração" });
      }
    }),
  }),

  entities: router({
    list: moduleProcedure("entities", "read").query(({ ctx }) => listEntities(scopeOf(ctx.user))),
    create: moduleProcedure("entities", "manage").input(entityInput).mutation(async ({ input, ctx }) => {
      const created = await createEntity(input);
      await audit(ctx, { action: "create", resourceType: "entity", resourceId: created?.id, resourceLabel: created?.name, after: created, scope: scopeOf(ctx.user) });
      return created;
    }),
    remove: moduleProcedure("entities", "delete").input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const before = (await listEntities(scopeOf(ctx.user))).find(entity => entity.id === input.id);
      const removed = await deleteEntity(input.id);
      await audit(ctx, { action: "delete", resourceType: "entity", resourceId: input.id, resourceLabel: before?.name, before, after: removed, scope: scopeOf(ctx.user) });
      return removed;
    }),
  }),

  stores: router({
    list: moduleProcedure("stores", "read").input(z.object({ partnerId: z.number().int().positive().optional() }).optional()).query(({ input, ctx }) => listPartnerStores(input?.partnerId, scopeOf(ctx.user))),
    create: moduleProcedure("stores", "create").input(storeInput).mutation(async ({ input, ctx }) => {
      if (!(await getPartnerById(input.partnerId))) throw notFound("Parceiro");
      if (!(await isPartnerInScope(input.partnerId, scopeOf(ctx.user), true))) throw forbiddenScope();
      const created = await createPartnerStore(input);
      await audit(ctx, { action: "create", resourceType: "store", resourceId: created?.id, resourceLabel: created?.name, after: created, scope: scopeOf(ctx.user) });
      return created;
    }),
    remove: moduleProcedure("stores", "delete").input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      if (!(await isStoreInScope(input.id, scopeOf(ctx.user), true))) throw forbiddenScope();
      const before = await getPartnerStoreById(input.id);
      const removed = await deletePartnerStore(input.id);
      await audit(ctx, { action: "delete", resourceType: "store", resourceId: input.id, resourceLabel: before?.name, before, after: removed, scope: scopeOf(ctx.user) });
      return removed;
    }),
    update: moduleProcedure("stores", "update").input(z.object({ id: z.number().int().positive(), data: storeInput })).mutation(async ({ input, ctx }) => {
      if (!(await getPartnerStoreById(input.id))) throw notFound("Loja");
      if (!(await isStoreInScope(input.id, scopeOf(ctx.user), true))) throw forbiddenScope();
      if (!(await getPartnerById(input.data.partnerId))) throw notFound("Parceiro");
      if (!(await isPartnerInScope(input.data.partnerId, scopeOf(ctx.user), true))) throw forbiddenScope();
      const before = await getPartnerStoreById(input.id);
      const updated = await updatePartnerStore(input.id, input.data);
      await audit(ctx, { action: "update", resourceType: "store", resourceId: input.id, resourceLabel: updated?.name, before, after: updated, scope: scopeOf(ctx.user) });
      return updated;
    }),
  }),

  access: router({
    list: moduleProcedure("access", "manage").query(({ ctx }) => listAccessUsers(scopeOf(ctx.user))),
    update: moduleProcedure("access", "manage").input(z.object({ id: z.number().int().positive(), data: userAccessInput })).mutation(async ({ input, ctx }) => {
      const current = (await listAccessUsers(scopeOf(ctx.user))).find(user => user.id === input.id);
      const updated = await updateUserAccess(input.id, input.data, scopeOf(ctx.user));
      if (!updated) throw forbiddenScope();
      await audit(ctx, { action: "update", resourceType: "access", resourceId: input.id, resourceLabel: updated.email, before: current, after: updated, scope: scopeOf(ctx.user) });
      return updated;
    }),
    invites: router({
      list: moduleProcedure("access", "manage").query(({ ctx }) => listLoginInvites(scopeOf(ctx.user))),
      create: moduleProcedure("access", "manage").input(z.object({
        email: z.string().trim().email().max(320),
        accessLevel,
        entityId: nullableId,
        partnerId: nullableId,
        storeId: nullableId,
        expiresInDays: z.number().int().min(1).max(30).default(7),
        origin: z.string().url(),
      })).mutation(async ({ input, ctx }) => {
        if (!(await isAccessTargetInScope({ entityId: input.entityId ?? null, partnerId: input.partnerId ?? null, storeId: input.storeId ?? null }, scopeOf(ctx.user)))) throw forbiddenScope();
        if (input.storeId) {
          const store = await getPartnerStoreById(input.storeId);
          if (!store || (input.partnerId && store.partnerId !== input.partnerId)) throw new TRPCError({ code: "BAD_REQUEST", message: "A loja precisa pertencer ao parceiro selecionado" });
        }
        const created = await createLoginInvite({ email: input.email, accessLevel: input.accessLevel, entityId: input.entityId ?? null, partnerId: input.partnerId ?? null, storeId: input.storeId ?? null, expiresAt: new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000), invitedByUserId: ctx.user.id });
        if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível criar o convite" });
        await audit(ctx, { action: "create", resourceType: "login_invite", resourceId: created.invite.id, resourceLabel: created.invite.email, after: created.invite, scope: scopeOf(ctx.user) });
        await dispatchEmailEvent(ctx, "login_invite.created", created.invite.email, { "invite.email": created.invite.email, "invite.accessLevel": created.invite.accessLevel }, `invite:${created.invite.id}:created`);
        return { ...created.invite, inviteUrl: `${input.origin.replace(/\/$/, "")}/convite?token=${encodeURIComponent(created.token)}` };
      }),
      resend: moduleProcedure("access", "manage").input(z.object({ id: z.number().int().positive(), origin: z.string().url() })).mutation(async ({ input, ctx }) => {
        if (!(await isLoginInviteInScope(input.id, scopeOf(ctx.user)))) throw forbiddenScope();
        const before = (await listLoginInvites(scopeOf(ctx.user))).find(invite => invite.id === input.id);
        const created = await resendLoginInvite(input.id, ctx.user.id);
        if (!created) throw new TRPCError({ code: "NOT_FOUND", message: "Convite não encontrado" });
        await audit(ctx, { action: "resend", resourceType: "login_invite", resourceId: input.id, resourceLabel: created.invite.email, before, after: created.invite, scope: scopeOf(ctx.user) });
        return { ...created.invite, inviteUrl: `${input.origin.replace(/\/$/, "")}/convite?token=${encodeURIComponent(created.token)}` };
      }),
      revoke: moduleProcedure("access", "manage").input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
        if (!(await isLoginInviteInScope(input.id, scopeOf(ctx.user)))) throw forbiddenScope();
        const before = (await listLoginInvites(scopeOf(ctx.user))).find(invite => invite.id === input.id);
        const revoked = await revokeLoginInvite(input.id);
        await audit(ctx, { action: "revoke", resourceType: "login_invite", resourceId: input.id, resourceLabel: before?.email, before, after: revoked, scope: scopeOf(ctx.user) });
        return revoked;
      }),
      activate: moduleProcedure("access", "manage").input(z.object({ id: z.number().int().positive(), userId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
        if (!(await isLoginInviteInScope(input.id, scopeOf(ctx.user)))) throw forbiddenScope();
        const before = (await listLoginInvites(scopeOf(ctx.user))).find(invite => invite.id === input.id);
        const activated = await activateLoginInvite(input.id, input.userId);
        if (!activated) throw new TRPCError({ code: "BAD_REQUEST", message: "O e-mail do usuário não corresponde ao convite ou o convite não está mais disponível" });
        await audit(ctx, { action: "activate", resourceType: "login_invite", resourceId: input.id, resourceLabel: before?.email, before, after: activated, scope: scopeOf(ctx.user) });
        return activated;
      }),
    }),
  }),

  audit: router({
    list: moduleProcedure("audit", "read").input(z.object({ resourceType: auditResource.optional(), resourceId: z.number().int().positive().optional(), limit: z.number().int().min(1).max(200).optional() }).optional()).query(({ input }) => listAuditLogs(input)),
  }),

  emails: router({
    senders: router({
      list: moduleProcedure("emails", "read").query(() => listEmailSenders()),
      create: moduleProcedure("emails", "manage").input(emailSenderInput).mutation(async ({ input, ctx }) => {
        const sender = await createEmailSender({ ...input, fromEmail: input.fromEmail.trim().toLowerCase(), replyTo: input.replyTo?.trim().toLowerCase() ?? null, createdByUserId: ctx.user.id });
        await audit(ctx, { action: "create", resourceType: "email_sender", resourceId: sender?.id, resourceLabel: sender?.name, after: sender });
        return sender;
      }),
    }),
    templates: router({
      list: moduleProcedure("emails", "read").query(() => listEmailTemplates()),
      create: moduleProcedure("emails", "manage").input(emailTemplateInput).mutation(async ({ input, ctx }) => {
        const validated = validateEmailTemplate(input);
        const template = await createEmailTemplate({ ...validated, preheader: validated.preheader ?? null, bodyText: validated.bodyText ?? null, senderId: validated.senderId ?? null, createdByUserId: ctx.user.id });
        await audit(ctx, { action: "create", resourceType: "email_template", resourceId: template?.id, resourceLabel: template?.templateKey, after: template });
        return template;
      }),
      update: moduleProcedure("emails", "manage").input(z.object({ id: z.number().int().positive(), data: emailTemplateInput })).mutation(async ({ input, ctx }) => {
        const before = await getEmailTemplateById(input.id);
        if (!before) throw notFound("Template de e-mail");
        const validated = validateEmailTemplate(input.data);
        const template = await updateEmailTemplate(input.id, { ...validated, preheader: validated.preheader ?? null, bodyText: validated.bodyText ?? null, senderId: validated.senderId ?? null });
        await audit(ctx, { action: "update", resourceType: "email_template", resourceId: input.id, resourceLabel: template?.templateKey, before, after: template });
        return template;
      }),
      preview: moduleProcedure("emails", "read").input(emailTemplateInput.extend({ variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]).nullable()) })).mutation(({ input }) => {
        const validated = validateEmailTemplate(input);
        return { subject: renderEmailText(validated.subject, input.variables as EmailVariables), preheader: validated.preheader ? renderEmailText(validated.preheader, input.variables as EmailVariables) : null, html: renderEmail(validated.bodyHtml, input.variables as EmailVariables), text: input.bodyText ? renderEmailText(input.bodyText, input.variables as EmailVariables) : null };
      }),
    }),
    rules: router({
      list: moduleProcedure("emails", "read").query(() => listEmailRules()),
      create: moduleProcedure("emails", "manage").input(emailRuleInput).mutation(async ({ input, ctx }) => {
        const rule = await createEmailRule({ ...input, enabled: input.enabled ? 1 : 0, createdByUserId: ctx.user.id });
        await audit(ctx, { action: "create", resourceType: "email_rule", resourceId: rule?.id, resourceLabel: rule?.name, after: rule });
        return rule;
      }),
      update: moduleProcedure("emails", "manage").input(z.object({ id: z.number().int().positive(), data: emailRuleInput })).mutation(async ({ input, ctx }) => {
        const rule = await updateEmailRule(input.id, { ...input.data, enabled: input.data.enabled ? 1 : 0 });
        if (!rule) throw notFound("Regra de e-mail");
        await audit(ctx, { action: "update", resourceType: "email_rule", resourceId: input.id, resourceLabel: rule.name, after: rule });
        return rule;
      }),
    }),
    outbox: router({
      list: moduleProcedure("emails", "read").input(z.object({ status: z.enum(["queued", "simulated", "failed", "cancelled"]).optional(), limit: z.number().int().min(1).max(200).optional() }).optional()).query(({ input }) => listEmailOutbox(input)),
      simulate: moduleProcedure("emails", "manage").input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
        const row = await simulateEmailOutbox(input.id);
        if (!row) throw notFound("Mensagem do outbox");
        await audit(ctx, { action: "simulate", resourceType: "email_outbox", resourceId: input.id, resourceLabel: row.recipientEmail, after: row });
        return row;
      }),
      retry: moduleProcedure("emails", "manage").input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
        const row = await retryEmailOutbox(input.id);
        if (!row) throw notFound("Mensagem do outbox");
        await audit(ctx, { action: "update", resourceType: "email_outbox", resourceId: input.id, resourceLabel: row.recipientEmail, after: row });
        return row;
      }),
      enqueue: moduleProcedure("emails", "manage").input(z.object({ eventName: emailEvent, recipientEmail: z.string().email(), recipientName: z.string().max(160).nullable().optional(), variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]).nullable()), eventKey: z.string().trim().min(1).max(180) })).mutation(async ({ input, ctx }) => {
        const queued = await enqueueEmailRules({ eventName: input.eventName, recipientEmail: input.recipientEmail, recipientName: input.recipientName ?? null, variables: input.variables as EmailVariables, eventKey: input.eventKey, createdByUserId: ctx.user.id });
        for (const item of queued) if (item.row) await audit(ctx, { action: "create", resourceType: "email_outbox", resourceId: item.row.id, resourceLabel: item.row.recipientEmail, after: item.row });
        return queued.map(item => item.row).filter(Boolean);
      }),
    }),
  }),

  tolls: router({
    list: moduleProcedure("intelligence", "read").query(() => listTollPlazas()),
    create: moduleProcedure("intelligence", "create").input(tollPlazaInput).mutation(async ({ input, ctx }) => {
      const plaza = await createTollPlaza({ ...input, highway: input.highway ?? null, direction: input.direction ?? null });
      if (!plaza) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível criar o pedágio" });
      return plaza;
    }),
  }),

  intelligence: router({
    campaigns: router({
      list: moduleProcedure("intelligence", "read").query(async ({ ctx }) => {
        const rows = await listRecommendationCampaigns();
        const visible = await Promise.all(rows.map(async row => (await isPartnerInScope(row.partnerId, scopeOf(ctx.user), false) ? row : null)));
        return visible.filter((row): row is NonNullable<typeof row> => Boolean(row));
      }),
      create: moduleProcedure("intelligence", "create").input(recommendationCampaignInput).mutation(async ({ input, ctx }) => {
        const partner = await getPartnerById(input.partnerId);
        const coupon = await getCouponById(input.couponId);
        if (!partner || !coupon) throw notFound("Parceiro ou cupom");
        if (!(await isPartnerInScope(input.partnerId, scopeOf(ctx.user), true))) throw forbiddenScope();
        if (!(await isCouponInScope(input.couponId, scopeOf(ctx.user), true))) throw forbiddenScope();
        if (input.storeId) {
          const store = await getPartnerStoreById(input.storeId);
          if (!store || store.partnerId !== input.partnerId) throw new TRPCError({ code: "BAD_REQUEST", message: "A loja precisa pertencer ao parceiro" });
          if (!(await isStoreInScope(input.storeId, scopeOf(ctx.user), true))) throw forbiddenScope();
        }
        if (coupon.partnerId !== input.partnerId) throw new TRPCError({ code: "BAD_REQUEST", message: "O cupom precisa pertencer ao parceiro" });
        const campaign = await createRecommendationCampaign({ ...input, storeId: input.storeId ?? null, tollPlazaId: input.tollPlazaId ?? null, sponsorshipLabel: input.sponsorshipLabel ?? null, budgetLimit: input.budgetLimit ?? null, bidAmount: input.bidAmount == null ? null : input.bidAmount.toFixed(4), createdByUserId: ctx.user.id });
        if (!campaign) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível criar a campanha" });
        return campaign;
      }),
    }),
    simulatePassage: moduleProcedure("intelligence", "manage").input(tollPassageInput).mutation(async ({ input, ctx }) => {
      const plaza = (await listTollPlazas()).find(row => row.id === input.tollPlazaId && row.status === "active");
      if (!plaza) throw notFound("Pedágio ativo");
      const eventKey = buildPassageIdempotencyKey(input.userReference, input.tollPlazaId, input.occurredAt);
      const event = await recordTollPassageEvent({
        idempotencyKey: eventKey,
        userReference: input.userReference,
        tollPlazaId: input.tollPlazaId,
        occurredAt: input.occurredAt,
        accuracyMeters: input.accuracyMeters ?? null,
        consentPersonalization: input.consentPersonalization ? 1 : 0,
        source: input.source,
        payloadJson: input.payload ? JSON.stringify(input.payload) : null,
        isSimulation: 1,
      });
      if (!event.row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível registrar a passagem" });
      if (!event.created) return { event: event.row, created: false, recommendations: await listPreparedRecommendationDeliveries(input.userReference, event.row.id) };
      const candidates = await listRecommendationCandidatesForToll(input.tollPlazaId);
      const ranked = rankRecommendationCandidates(candidates, {
        now: input.occurredAt,
        userReference: input.userReference,
        tollPlazaId: input.tollPlazaId,
        consentPersonalization: input.consentPersonalization,
      }).slice(0, 10);
      const recommendations = [];
      for (const item of ranked) {
        const saved = await createRecommendationDelivery({
          idempotencyKey: `delivery:${event.row.id}:${item.campaignId}:${input.userReference}`,
          passageEventId: event.row.id,
          campaignId: item.campaignId,
          couponId: item.couponId,
          userReference: input.userReference,
          mode: item.mode,
          score: item.score,
          explanation: item.explanation,
          status: "prepared",
          isSimulation: 1,
        });
        if (saved.row) recommendations.push(saved.row);
      }
      await audit(ctx, { action: "simulate", resourceType: "coupon", resourceId: recommendations[0]?.couponId ?? null, resourceLabel: `Passagem ${plaza.name}`, after: { event: event.row, recommendations }, scope: scopeOf(ctx.user) });
      return { event: event.row, created: true, recommendations };
    }),
    metrics: moduleProcedure("intelligence", "read").input(z.object({ campaignId: z.number().int().positive().optional(), partnerId: z.number().int().positive().optional(), storeId: z.number().int().positive().optional(), tollPlazaId: z.number().int().positive().optional(), startsAt: z.coerce.date().optional(), endsAt: z.coerce.date().optional() }).optional()).query(async ({ input, ctx }) => {
      const scope = scopeOf(ctx.user);
      const filter = { ...(input ?? {}) };
      if (scope.partnerId) filter.partnerId = scope.partnerId;
      if (scope.storeId) filter.storeId = scope.storeId;
      if (filter.partnerId && !(await isPartnerInScope(filter.partnerId, scope, false))) throw forbiddenScope();
      if (filter.storeId && !(await isStoreInScope(filter.storeId, scope, false))) throw forbiddenScope();
      return listRecommendationMetrics(filter);
    }),
    trackInteraction: moduleProcedure("intelligence", "manage").input(z.object({ deliveryId: z.number().int().positive(), eventName: recommendationInteraction, eventAt: z.coerce.date(), costAmount: z.number().nonnegative().nullable().optional() })).mutation(async ({ input, ctx }) => {
      const delivery = await getRecommendationDeliveryById(input.deliveryId);
      if (!delivery) throw notFound("Recomendação");
      const result = await recordRecommendationInteraction({
        idempotencyKey: `interaction:${delivery.id}:${input.eventName}:${input.eventAt.toISOString().slice(0, 19)}`,
        deliveryId: delivery.id,
        campaignId: delivery.campaignId,
        userReference: delivery.userReference,
        eventName: input.eventName,
        costAmount: input.costAmount == null ? null : input.costAmount.toFixed(4),
        eventAt: input.eventAt,
        isSimulation: delivery.isSimulation,
      });
      if (result.row) await audit(ctx, { action: "simulate", resourceType: "coupon", resourceId: delivery.couponId, resourceLabel: `Interação ${input.eventName}`, after: result.row, scope: scopeOf(ctx.user) });
      return result;
    }),
  }),

  notifications: router({
    templates: router({
      list: moduleProcedure("notifications", "read").query(() => listNotificationTemplates()),
      create: moduleProcedure("notifications", "create").input(notificationTemplateInput).mutation(async ({ input, ctx }) => {
        const template = await createNotificationTemplate({ ...input, expandedBody: input.expandedBody ?? null, imageUrl: input.imageUrl ?? null, ctaLabel: input.ctaLabel ?? null, deepLink: input.deepLink ?? null, createdByUserId: ctx.user.id });
        await audit(ctx, { action: "create", resourceType: "notification_template", resourceId: template?.id, resourceLabel: template?.templateKey, after: template, scope: scopeOf(ctx.user) });
        return template;
      }),
      update: moduleProcedure("notifications", "update").input(z.object({ id: z.number().int().positive(), data: notificationTemplateInput })).mutation(async ({ input, ctx }) => {
        const before = await getNotificationTemplateById(input.id);
        if (!before) throw notFound("Template de notificação");
        const template = await updateNotificationTemplate(input.id, { ...input.data, expandedBody: input.data.expandedBody ?? null, imageUrl: input.data.imageUrl ?? null, ctaLabel: input.data.ctaLabel ?? null, deepLink: input.data.deepLink ?? null });
        await audit(ctx, { action: "update", resourceType: "notification_template", resourceId: input.id, resourceLabel: template?.templateKey, before, after: template, scope: scopeOf(ctx.user) });
        return template;
      }),
    }),
    rules: router({
      list: moduleProcedure("notifications", "read").query(() => listNotificationRules()),
      create: moduleProcedure("notifications", "create").input(notificationRuleInput).mutation(async ({ input, ctx }) => {
        const rule = await createNotificationRule({ ...input, enabled: input.enabled ? 1 : 0, createdByUserId: ctx.user.id });
        await audit(ctx, { action: "create", resourceType: "notification_rule", resourceId: rule?.id, resourceLabel: rule?.name, after: rule, scope: scopeOf(ctx.user) });
        return rule;
      }),
      update: moduleProcedure("notifications", "update").input(z.object({ id: z.number().int().positive(), data: notificationRuleInput })).mutation(async ({ input, ctx }) => {
        const rule = await updateNotificationRule(input.id, { ...input.data, enabled: input.data.enabled ? 1 : 0 });
        if (!rule) throw notFound("Regra de notificação");
        await audit(ctx, { action: "update", resourceType: "notification_rule", resourceId: input.id, resourceLabel: rule.name, after: rule, scope: scopeOf(ctx.user) });
        return rule;
      }),
    }),
    outbox: router({
      list: moduleProcedure("notifications", "read").input(z.object({ status: z.enum(["queued", "simulated", "failed", "delivered", "cancelled"]).optional(), limit: z.number().int().min(1).max(200).optional() }).optional()).query(({ input }) => listNotificationOutbox(input)),
      enqueue: moduleProcedure("notifications", "create").input(z.object({ templateId: z.number().int().positive(), ruleId: z.number().int().positive().nullable().optional(), eventName: z.string().trim().min(1).max(120), recipientReference: z.string().trim().min(1).max(160), eventKey: z.string().trim().min(1).max(160), variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])), data: z.record(z.string(), z.unknown()).optional(), couponId: z.number().int().positive().nullable().optional(), benefitId: z.number().int().positive().nullable().optional(), expiresAt: z.coerce.date().nullable().optional() })).mutation(async ({ input, ctx }) => {
        const result = await enqueueNotification({ ...input, createdByUserId: ctx.user.id });
        if (result.row) await audit(ctx, { action: "simulate", resourceType: "notification_outbox", resourceId: result.row.id, resourceLabel: input.recipientReference, after: { ...result.row, duplicate: !result.created }, scope: scopeOf(ctx.user) });
        return result;
      }),
      simulate: moduleProcedure("notifications", "update").input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
        const row = await simulateNotificationOutbox(input.id);
        if (!row) throw notFound("Notificação do outbox");
        await audit(ctx, { action: "simulate", resourceType: "notification_outbox", resourceId: row.id, resourceLabel: row.recipientReference, after: row, scope: scopeOf(ctx.user) });
        return row;
      }),
      retry: moduleProcedure("notifications", "update").input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
        const row = await retryNotificationOutbox(input.id);
        if (!row) throw notFound("Notificação do outbox");
        await audit(ctx, { action: "update", resourceType: "notification_outbox", resourceId: row.id, resourceLabel: row.recipientReference, after: row, scope: scopeOf(ctx.user) });
        return row;
      }),
    }),
  }),

  uses: router({
    list: moduleProcedure("uses", "read")
      .input(
        z
          .object({
            couponId: z.number().int().positive().optional(),
            partnerId: z.number().int().positive().optional(),
            storeId: z.number().int().positive().optional(),
            search: z.string().trim().max(160).optional(),
            startsAt: z.coerce.date().optional(),
            endsAt: z.coerce.date().optional(),
          })
          .optional(),
      )
      .query(({ input, ctx }) => listCouponUses({ ...(input ?? {}), scope: scopeOf(ctx.user) })),
    register: moduleProcedure("uses", "create")
      .input(
        z.object({
          couponId: z.number().int().positive(),
          reference: z.string().trim().min(3).max(80),
          customerReference: nullableText(120),
          vehicleReference: nullableText(120),
          plateReference: nullableText(120),
          purchaseAmount: z.number().min(0).max(1_000_000).nullable().optional(),
          presentedCredential: nullableText(500),
          latitude: z.number().min(-90).max(90).nullable().optional(),
          longitude: z.number().min(-180).max(180).nullable().optional(),
          notes: nullableText(2000),
          storeId: nullableId,
          usedAt: z.coerce.date(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const coupon = await getCouponById(input.couponId);
        if (!coupon) throw notFound("Cupom");
        if (!(await isCouponInScope(input.couponId, scopeOf(ctx.user), true))) throw forbiddenScope();
        if (input.storeId && !(await isStoreInScope(input.storeId, scopeOf(ctx.user), true))) throw forbiddenScope();
        if (input.storeId) {
          const store = await getPartnerStoreById(input.storeId);
          if (!store || store.partnerId !== coupon.partnerId) throw new TRPCError({ code: "BAD_REQUEST", message: "A loja precisa pertencer ao parceiro do cupom" });
        }
        if (coupon.status !== "active") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Apenas cupons ativos podem registrar utilizações" });
        }
        if (input.usedAt < coupon.startsAt || input.usedAt > coupon.endsAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "A data de uso está fora da vigência do cupom" });
        }
        if (coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "O limite de utilizações do cupom já foi atingido" });
        }
        if (input.storeId) {
          const store = await getPartnerStoreById(input.storeId);
          if (!store || store.partnerId !== coupon.partnerId) throw new TRPCError({ code: "BAD_REQUEST", message: "A loja precisa pertencer ao parceiro do cupom" });
        }

        try {
          const useId = await registerCouponUse({ ...input, registeredByUserId: ctx.user.id });
          await dispatchEmailEvent(ctx, "coupon.redeemed", input.customerReference, { "coupon.id": coupon.id, "coupon.code": coupon.code, "coupon.status": coupon.status, "use.id": useId, "use.reference": input.reference }, `coupon:${coupon.id}:redeemed:${input.reference}`);
          return { id: useId };
        } catch (error) {
          if (error instanceof CouponUseRuleError) {
            throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
          }
          if (error instanceof DatabaseUnavailableError) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "O banco de dados está indisponível" });
          }
          if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
            throw new TRPCError({ code: "CONFLICT", message: "Esta referência de utilização já foi registrada" });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Não foi possível registrar a utilização",
          });
        }
      }),
  }),
});
