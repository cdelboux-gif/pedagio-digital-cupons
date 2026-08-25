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
} from "../db";
import { accessLevelValues, entityStatusValues, integrationEventValues, integrationStatusValues, storeStatusValues } from "../../drizzle/schema";
import { moduleProcedure, router, superAdminProcedure } from "../_core/trpc";

const partnerStatus = z.enum(["prospect", "active", "inactive", "blocked"]);
const couponStatus = z.enum(["draft", "active", "paused", "ended"]);
const integrationEvent = z.enum(integrationEventValues);
const integrationStatus = z.enum(integrationStatusValues);
const accessLevel = z.enum(accessLevelValues);
const entityStatus = z.enum(entityStatusValues);
const storeStatus = z.enum(storeStatusValues);
const loginInviteStatus = z.enum(["pending", "accepted", "revoked", "expired"]);
const nullableId = z.number().int().positive().nullable().optional();
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
      return saved ? publicPartner(saved) : saved;
    }),
    remove: moduleProcedure("partners", "delete").input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      if (!(await isPartnerInScope(input.id, scopeOf(ctx.user), true))) throw forbiddenScope();
      return deletePartner(input.id);
    }),
    update: moduleProcedure("partners", "update")
      .input(z.object({ id: z.number().int().positive(), data: partnerInput }))
      .mutation(async ({ input, ctx }) => {
        if (!(await getPartnerById(input.id))) throw notFound("Parceiro");
        if (!(await isPartnerInScope(input.id, scopeOf(ctx.user), true))) throw forbiddenScope();
        if (!scopeAllows(scopeOf(ctx.user), { entityId: input.data.entityId ?? null, partnerId: input.id }, true)) throw forbiddenScope();
        const { logo, ...data } = input.data;
        await updatePartner(input.id, data);
        const saved = logo ? await uploadPartnerLogo(input.id, logo) : await getPartnerById(input.id);
        return saved ? publicPartner(saved) : saved;
      }),
  }),

  coupons: router({
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
      if (!(await getPartnerById(input.partnerId))) throw notFound("Parceiro");
      if (!(await isPartnerInScope(input.partnerId, scopeOf(ctx.user), true))) throw forbiddenScope();
      if (input.storeId && !(await isStoreInScope(input.storeId, scopeOf(ctx.user), true))) throw forbiddenScope();
      if (input.storeId) {
        const store = await getPartnerStoreById(input.storeId);
        if (!store || store.partnerId !== input.partnerId) throw new TRPCError({ code: "BAD_REQUEST", message: "A loja precisa pertencer ao parceiro selecionado" });
      }
      const { itemImage, ...data } = input;
      const coupon = await createCoupon(data);
      if (!coupon) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível criar o cupom" });
      const saved = itemImage ? await uploadCouponItemImage(coupon.id, itemImage) : coupon;
      return saved ? publicCoupon(saved) : saved;
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
        const { itemImage, ...data } = input.data;
        await updateCoupon(input.id, data);
        const saved = itemImage ? await uploadCouponItemImage(input.id, itemImage) : await getCouponById(input.id);
        return saved ? publicCoupon(saved) : saved;
      }),
    remove: moduleProcedure("coupons", "delete").input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      if (!(await isCouponInScope(input.id, scopeOf(ctx.user), true))) throw forbiddenScope();
      return deleteCoupon(input.id);
    }),
    updateStatus: moduleProcedure("coupons", "status")
      .input(z.object({ id: z.number().int().positive(), status: couponStatus }))
      .mutation(async ({ input, ctx }) => {
        if (!(await getCouponById(input.id))) throw notFound("Cupom");
        if (!(await isCouponInScope(input.id, scopeOf(ctx.user), true))) throw forbiddenScope();
        return updateCouponStatus(input.id, input.status);
      }),
  }),

  integrations: router({
    list: moduleProcedure("integrations", "read").query(() => listPartnerIntegrations()),
    create: moduleProcedure("integrations", "manage").input(integrationInput).mutation(async ({ input, ctx }) => {
      if (!(await getPartnerById(input.partnerId))) throw notFound("Parceiro");
      try {
        return await createPartnerIntegration({ ...input, createdByUserId: ctx.user.id });
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
    create: moduleProcedure("entities", "manage").input(entityInput).mutation(({ input }) => createEntity(input)),
    remove: moduleProcedure("entities", "delete").input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteEntity(input.id)),
  }),

  stores: router({
    list: moduleProcedure("stores", "read").input(z.object({ partnerId: z.number().int().positive().optional() }).optional()).query(({ input, ctx }) => listPartnerStores(input?.partnerId, scopeOf(ctx.user))),
    create: moduleProcedure("stores", "create").input(storeInput).mutation(async ({ input, ctx }) => {
      if (!(await getPartnerById(input.partnerId))) throw notFound("Parceiro");
      if (!(await isPartnerInScope(input.partnerId, scopeOf(ctx.user), true))) throw forbiddenScope();
      return createPartnerStore(input);
    }),
    remove: moduleProcedure("stores", "delete").input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      if (!(await isStoreInScope(input.id, scopeOf(ctx.user), true))) throw forbiddenScope();
      return deletePartnerStore(input.id);
    }),
    update: moduleProcedure("stores", "update").input(z.object({ id: z.number().int().positive(), data: storeInput })).mutation(async ({ input, ctx }) => {
      if (!(await getPartnerStoreById(input.id))) throw notFound("Loja");
      if (!(await isStoreInScope(input.id, scopeOf(ctx.user), true))) throw forbiddenScope();
      if (!(await getPartnerById(input.data.partnerId))) throw notFound("Parceiro");
      if (!(await isPartnerInScope(input.data.partnerId, scopeOf(ctx.user), true))) throw forbiddenScope();
      return updatePartnerStore(input.id, input.data);
    }),
  }),

  access: router({
    list: moduleProcedure("access", "manage").query(({ ctx }) => listAccessUsers(scopeOf(ctx.user))),
    update: moduleProcedure("access", "manage").input(z.object({ id: z.number().int().positive(), data: userAccessInput })).mutation(async ({ input, ctx }) => {
      const updated = await updateUserAccess(input.id, input.data, scopeOf(ctx.user));
      if (!updated) throw forbiddenScope();
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
        return { ...created.invite, inviteUrl: `${input.origin.replace(/\/$/, "")}/convite?token=${encodeURIComponent(created.token)}` };
      }),
      resend: moduleProcedure("access", "manage").input(z.object({ id: z.number().int().positive(), origin: z.string().url() })).mutation(async ({ input, ctx }) => {
        if (!(await isLoginInviteInScope(input.id, scopeOf(ctx.user)))) throw forbiddenScope();
        const created = await resendLoginInvite(input.id, ctx.user.id);
        if (!created) throw new TRPCError({ code: "NOT_FOUND", message: "Convite não encontrado" });
        return { ...created.invite, inviteUrl: `${input.origin.replace(/\/$/, "")}/convite?token=${encodeURIComponent(created.token)}` };
      }),
      revoke: moduleProcedure("access", "manage").input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
        if (!(await isLoginInviteInScope(input.id, scopeOf(ctx.user)))) throw forbiddenScope();
        return revokeLoginInvite(input.id);
      }),
      activate: moduleProcedure("access", "manage").input(z.object({ id: z.number().int().positive(), userId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
        if (!(await isLoginInviteInScope(input.id, scopeOf(ctx.user)))) throw forbiddenScope();
        const activated = await activateLoginInvite(input.id, input.userId);
        if (!activated) throw new TRPCError({ code: "BAD_REQUEST", message: "O e-mail do usuário não corresponde ao convite ou o convite não está mais disponível" });
        return activated;
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
