import { z } from "zod";

export const recommendationContractVersion = "recommendations.v1" as const;
export const tollPassageSourceValues = ["app_geofence", "tag_provider", "backoffice_simulator"] as const;

export const tollPassedEventSchema = z.object({
  version: z.literal(recommendationContractVersion),
  eventName: z.literal("toll.passed"),
  idempotencyKey: z.string().trim().min(12).max(180),
  userReference: z.string().trim().min(2).max(160),
  tollPlazaId: z.number().int().positive(),
  occurredAt: z.coerce.date(),
  accuracyMeters: z.number().int().min(1).max(5000).nullable(),
  consentPersonalization: z.boolean(),
  source: z.enum(tollPassageSourceValues),
});

export type TollPassedEvent = z.infer<typeof tollPassedEventSchema>;

export const recommendationDeliverySchema = z.object({
  id: z.number().int().positive(),
  couponId: z.number().int().positive(),
  mode: z.enum(["activated_benefit", "personalized", "sponsored"]),
  score: z.number().min(0).max(1),
  explanation: z.string().trim().min(1).max(240),
  sponsorshipLabel: z.string().trim().max(80).nullable(),
});

export type RecommendationDelivery = z.infer<typeof recommendationDeliverySchema>;

export const recommendationResponseSchema = z.object({
  version: z.literal(recommendationContractVersion),
  eventId: z.number().int().positive(),
  idempotent: z.boolean(),
  recommendations: z.array(recommendationDeliverySchema),
});

export type RecommendationResponse = z.infer<typeof recommendationResponseSchema>;

export function buildTollPassedIdempotencyKey(userReference: string, tollPlazaId: number, occurredAt: Date) {
  return `${recommendationContractVersion}:toll:${userReference}:${tollPlazaId}:${occurredAt.toISOString().slice(0, 16)}`;
}
