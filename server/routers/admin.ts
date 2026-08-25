import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  CouponUseRuleError,
  createCoupon,
  createPartner,
  DatabaseUnavailableError,
  getCouponById,
  getDashboardSummary,
  getPartnerById,
  listCouponUses,
  listCoupons,
  listPartners,
  listPartnerIntegrations,
  createPartnerIntegration,
  registerCouponUse,
  updateCoupon,
  updateCouponStatus,
  updatePartner,
} from "../db";
import { integrationEventValues, integrationStatusValues } from "../../drizzle/schema";
import { adminProcedure, router } from "../_core/trpc";

const partnerStatus = z.enum(["prospect", "active", "inactive", "blocked"]);
const couponStatus = z.enum(["draft", "active", "paused", "ended"]);
const integrationEvent = z.enum(integrationEventValues);
const integrationStatus = z.enum(integrationStatusValues);
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
  })
  .refine(
    value => (value.latitude == null) === (value.longitude == null),
    { message: "Informe latitude e longitude juntas", path: ["latitude"] },
  );

const couponInput = z
  .object({
    partnerId: z.number().int().positive(),
    code: z.string().trim().min(3).max(50).transform(value => value.toUpperCase()),
    title: z.string().trim().min(3).max(160),
    benefit: z.string().trim().min(3).max(2000),
    terms: nullableText(4000),
    status: couponStatus,
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    usageLimit: z.number().int().min(0).max(1_000_000),
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

function notFound(entity: string) {
  return new TRPCError({ code: "NOT_FOUND", message: `${entity} não encontrado(a)` });
}

export const adminRouter = router({
  dashboard: adminProcedure.query(async () => getDashboardSummary()),

  partners: router({
    list: adminProcedure
      .input(z.object({ search: z.string().trim().max(160).optional(), status: partnerStatus.optional() }).optional())
      .query(({ input }) => listPartners(input ?? {})),
    create: adminProcedure.input(partnerInput).mutation(async ({ input }) => createPartner(input)),
    update: adminProcedure
      .input(z.object({ id: z.number().int().positive(), data: partnerInput }))
      .mutation(async ({ input }) => {
        if (!(await getPartnerById(input.id))) throw notFound("Parceiro");
        return updatePartner(input.id, input.data);
      }),
  }),

  coupons: router({
    list: adminProcedure
      .input(
        z
          .object({
            search: z.string().trim().max(160).optional(),
            partnerId: z.number().int().positive().optional(),
            status: couponStatus.optional(),
            validity: z.enum(["current", "upcoming", "expired"]).optional(),
          })
          .optional(),
      )
      .query(({ input }) => listCoupons(input ?? {})),
    create: adminProcedure.input(couponInput).mutation(async ({ input }) => {
      if (!(await getPartnerById(input.partnerId))) throw notFound("Parceiro");
      return createCoupon(input);
    }),
    update: adminProcedure
      .input(z.object({ id: z.number().int().positive(), data: couponInput }))
      .mutation(async ({ input }) => {
        if (!(await getCouponById(input.id))) throw notFound("Cupom");
        if (!(await getPartnerById(input.data.partnerId))) throw notFound("Parceiro");
        return updateCoupon(input.id, input.data);
      }),
    updateStatus: adminProcedure
      .input(z.object({ id: z.number().int().positive(), status: couponStatus }))
      .mutation(async ({ input }) => {
        if (!(await getCouponById(input.id))) throw notFound("Cupom");
        return updateCouponStatus(input.id, input.status);
      }),
  }),

  integrations: router({
    list: adminProcedure.query(() => listPartnerIntegrations()),
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

  uses: router({
    list: adminProcedure
      .input(
        z
          .object({
            couponId: z.number().int().positive().optional(),
            partnerId: z.number().int().positive().optional(),
            search: z.string().trim().max(160).optional(),
            startsAt: z.coerce.date().optional(),
            endsAt: z.coerce.date().optional(),
          })
          .optional(),
      )
      .query(({ input }) => listCouponUses(input ?? {})),
    register: adminProcedure
      .input(
        z.object({
          couponId: z.number().int().positive(),
          reference: z.string().trim().min(3).max(80),
          customerReference: nullableText(120),
          notes: nullableText(2000),
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
