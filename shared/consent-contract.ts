import { z } from "zod";

export const consentVersion = "consent-v1.0" as const;
export const consentStatusValues = ["granted", "denied", "paused", "pending_sync"] as const;
export const consentPurposeValues = ["journeyGeolocation", "personalizedRecommendations", "sponsoredRecommendations"] as const;

const purposeSchema = z.object({
  status: z.enum(consentStatusValues),
  scope: z.string().trim().min(1).max(120).nullable(),
  decidedAt: z.coerce.date().nullable(),
});

export const consentPreferencesSchema = z.object({
  consentVersion: z.literal(consentVersion),
  userReference: z.string().trim().min(2).max(160),
  capturedAt: z.coerce.date(),
  source: z.enum(["app", "backoffice"]),
  appVersion: z.string().trim().min(1).max(40),
  locale: z.string().trim().min(2).max(20),
  purposes: z.object({
    journeyGeolocation: purposeSchema,
    personalizedRecommendations: purposeSchema,
    sponsoredRecommendations: purposeSchema,
  }),
});

export type ConsentPreferences = z.infer<typeof consentPreferencesSchema>;

export const consentRevisionSchema = z.object({
  idempotencyKey: z.string().trim().min(12).max(180),
  userReference: z.string().trim().min(2).max(160),
  consentVersion: z.literal(consentVersion),
  purpose: z.enum(consentPurposeValues),
  status: z.enum(consentStatusValues),
  decidedAt: z.coerce.date(),
  source: z.enum(["app", "backoffice"]),
});

export type ConsentRevision = z.infer<typeof consentRevisionSchema>;

export function buildConsentRevisionKey(userReference: string, purpose: (typeof consentPurposeValues)[number], decidedAt: Date) {
  return `${consentVersion}:${userReference}:${purpose}:${decidedAt.toISOString()}`;
}
