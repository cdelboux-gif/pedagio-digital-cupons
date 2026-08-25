import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  CouponUseRuleError,
  createCoupon,
  createEntity,
  createPartner,
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
  updateUserAccess,
  registerCouponUse,
  updateCoupon,
  updatePartnerStore,
  uploadCouponItemImage,
  uploadPartnerLogo,
  updateCouponStatus,
  updatePartner,
} from "../db";
import { accessLevelValues, entityStatusValues, integrationEventValues, integrationStatusValues, storeStatusValues } from "../../drizzle/schema";
import { adminProcedure, operationProcedure, router, superAdminProcedure, viewProcedure } from "../_core/trpc";

const partnerStatus = z.enum(["prospect", "active", "inactive", "blocked"]);
const couponStatus = z.enum(["draft", "active", "paused", "ended"]);
const integrationEvent = z.enum(integrationEventValues);
const integrationStatus = z.enum(integrationStatusValues);
const accessLevel = z.enum(accessLevelValues);
const entityStatus = z.enum(entityStatusValues);
const storeStatus = z.enum(storeStatusValues);
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

export const adminRouter = router({
  dashboard: viewProcedure.query(async () => getDashboardSummary()),

  partners: router({
    list: viewProcedure
      .input(z.object({ search: z.string().trim().max(160).optional(), status: partnerStatus.optional() }).optional())
      .query(({ input }) => listPartners(input ?? {})),
    create: adminProcedure.input(partnerInput).mutation(async ({ input }) => {
      const { logo, ...data } = input;
      const partner = await createPartner(data);
      if (!partner) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível criar o parceiro" });
      const saved = logo ? await uploadPartnerLogo(partner.id, logo) : partner;
      return saved ? publicPartner(saved) : saved;
    }),
    update: adminProcedure
      .input(z.object({ id: z.number().int().positive(), data: partnerInput }))
      .mutation(async ({ input }) => {
        if (!(await getPartnerById(input.id))) throw notFound("Parceiro");
        const { logo, ...data } = input.data;
        await updatePartner(input.id, data);
        const saved = logo ? await uploadPartnerLogo(input.id, logo) : await getPartnerById(input.id);
        return saved ? publicPartner(saved) : saved;
      }),
  }),

  coupons: router({
    list: viewProcedure
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
      .query(({ input }) => listCoupons(input ?? {})),
    create: operationProcedure.input(couponInput).mutation(async ({ input }) => {
      if (!(await getPartnerById(input.partnerId))) throw notFound("Parceiro");
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
    update: operationProcedure
      .input(z.object({ id: z.number().int().positive(), data: couponInput }))
      .mutation(async ({ input }) => {
        if (!(await getCouponById(input.id))) throw notFound("Cupom");
        if (!(await getPartnerById(input.data.partnerId))) throw notFound("Parceiro");
        if (input.data.storeId) {
          const store = await getPartnerStoreById(input.data.storeId);
          if (!store || store.partnerId !== input.data.partnerId) throw new TRPCError({ code: "BAD_REQUEST", message: "A loja precisa pertencer ao parceiro selecionado" });
        }
        const { itemImage, ...data } = input.data;
        await updateCoupon(input.id, data);
        const saved = itemImage ? await uploadCouponItemImage(input.id, itemImage) : await getCouponById(input.id);
        return saved ? publicCoupon(saved) : saved;
      }),
    updateStatus: operationProcedure
      .input(z.object({ id: z.number().int().positive(), status: couponStatus }))
      .mutation(async ({ input }) => {
        if (!(await getCouponById(input.id))) throw notFound("Cupom");
        return updateCouponStatus(input.id, input.status);
      }),
  }),

  integrations: router({
    list: viewProcedure.query(() => listPartnerIntegrations()),
    create: adminProcedure.input(integrationInput).mutation(async ({ input, ctx }) => {
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
    list: viewProcedure.query(() => listEntities()),
    create: adminProcedure.input(entityInput).mutation(({ input }) => createEntity(input)),
  }),

  stores: router({
    list: viewProcedure.input(z.object({ partnerId: z.number().int().positive().optional() }).optional()).query(({ input }) => listPartnerStores(input?.partnerId)),
    create: adminProcedure.input(storeInput).mutation(async ({ input }) => {
      if (!(await getPartnerById(input.partnerId))) throw notFound("Parceiro");
      return createPartnerStore(input);
    }),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), data: storeInput })).mutation(async ({ input }) => {
      if (!(await getPartnerStoreById(input.id))) throw notFound("Loja");
      if (!(await getPartnerById(input.data.partnerId))) throw notFound("Parceiro");
      return updatePartnerStore(input.id, input.data);
    }),
  }),

  access: router({
    list: superAdminProcedure.query(() => listAccessUsers()),
    update: superAdminProcedure.input(z.object({ id: z.number().int().positive(), data: userAccessInput })).mutation(({ input }) => updateUserAccess(input.id, input.data)),
  }),

  uses: router({
    list: viewProcedure
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
      .query(({ input }) => listCouponUses(input ?? {})),
    register: operationProcedure
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
