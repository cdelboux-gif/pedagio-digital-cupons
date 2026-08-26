import { z } from "zod";

export const notificationDeliveryMode = z.enum(["simulated", "app_contract", "platform"]);
export const notificationDisclosure = z.object({
  sponsored: z.boolean().default(false),
  label: z.string().trim().max(80).nullable().optional(),
});

export const notificationV1Schema = z.object({
  version: z.literal("notification.v1"),
  notificationId: z.number().int().positive(),
  eventName: z.string().trim().min(1).max(120),
  recipientReference: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(500),
  expandedBody: z.string().trim().max(4000).nullable().optional(),
  imageUrl: z.string().url().max(700).nullable().optional(),
  ctaLabel: z.string().trim().max(60).nullable().optional(),
  deepLink: z.string().trim().max(500).regex(/^(?:https?:|pedagiodigital:)[^\s]+$/i).nullable().optional(),
  couponId: z.number().int().positive().nullable().optional(),
  benefitId: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  priority: z.number().int().min(-10).max(10).default(0),
  locale: z.string().trim().max(12).default("pt-BR"),
  disclosure: notificationDisclosure.default({ sponsored: false }),
  consentContext: z.object({ required: z.boolean(), purpose: z.string().trim().max(120) }).default({ required: true, purpose: "personalization" }),
  data: z.record(z.string(), z.unknown()).default({}),
});

export type NotificationV1 = z.infer<typeof notificationV1Schema>;

export function buildNotificationIdempotencyKey(eventName: string, recipientReference: string, templateId: number, eventKey: string) {
  return `notification:${eventName}:${recipientReference}:${templateId}:${eventKey}`.slice(0, 180);
}

export function validateNotificationContent(input: Pick<NotificationV1, "title" | "body" | "deepLink" | "imageUrl">) {
  return notificationV1Schema.pick({ title: true, body: true, deepLink: true, imageUrl: true }).safeParse(input);
}
